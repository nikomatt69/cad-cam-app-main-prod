import { Element } from 'src/store/elementsStore';
import * as THREE from 'three';
import { CSG } from 'three-csg-ts';

/**
 * Utility functions to generate toolpaths from component elements
 * by treating them as unified geometries.
 */

/**
 * Extract all sub-elements from a component for toolpath generation
 * @param component The component element
 * @returns Array of sub-elements with positions adjusted relative to the component
 */
export function extractComponentElements(component: any): any[] {
  if (!component || component.type !== 'component') {
    return [];
  }

  // If the component has elements array, process them
  if (component.elements && Array.isArray(component.elements) && component.elements.length > 0) {
    return component.elements.map((element: any) => {
      // Adjust position to be relative to the component
      return transformElementRelativeToComponent(element, component);
    });
  }
  
  // If no elements are found, return an empty array
  return [];
}

/**
 * Transform an element's position to be relative to its parent component
 * @param element The element to transform
 * @param component The parent component
 * @returns The transformed element
 */
function transformElementRelativeToComponent(element: any, component: any): any {
  // Create a deep copy of the element to avoid modifying the original
  const transformedElement = { ...element };
  
  // Transform position based on element type
  switch (element.type) {
    case 'cube':
    case 'sphere':
    case 'cylinder':
    case 'cone':
    case 'torus':
    case 'rectangle':
    case 'circle':
    case 'polygon':
    case 'extrude':
      // Elements with x, y, z coordinates
      transformedElement.x = (element.x || 0) + component.x;
      transformedElement.y = (element.y || 0) + component.y;
      transformedElement.z = (element.z || 0) + component.z;
      break;
      
    case 'line':
      // Elements with x1, y1, z1, x2, y2, z2 coordinates
      transformedElement.x1 = (element.x1 || 0) + component.x;
      transformedElement.y1 = (element.y1 || 0) + component.y;
      transformedElement.z1 = (element.z1 || 0) + component.z;
      transformedElement.x2 = (element.x2 || 0) + component.x;
      transformedElement.y2 = (element.y2 || 0) + component.y;
      transformedElement.z2 = (element.z2 || 0) + component.z;
      break;
      
    case 'group':
    case 'component':
      // Recursively transform nested groups or components
      transformedElement.x = (element.x || 0) + component.x;
      transformedElement.y = (element.y || 0) + component.y;
      transformedElement.z = (element.z || 0) + component.z;
      
      if (element.elements && Array.isArray(element.elements)) {
        transformedElement.elements = element.elements.map((subElement: any) => 
          transformElementRelativeToComponent(subElement, transformedElement)
        );
      }
      break;
      
    default:
      // For unknown types, just apply the offset
      if ('x' in element && 'y' in element) {
        transformedElement.x = (element.x || 0) + component.x;
        transformedElement.y = (element.y || 0) + component.y;
        transformedElement.z = (element.z || 0) + component.z;
      }
  }
  
  return transformedElement;
}

/**
 * Generate toolpath for a component by treating it as a unified geometry
 * through boolean union operations
 * @param component The component element
 * @param settings The toolpath generation settings
 * @returns G-code string for the component as a unified geometry
 */
export function generateComponentToolpath(component: any, settings: any): string {
  if (!component || component.type !== 'component') {
    return '; Invalid component element\n';
  }
  
  let gcode = `; Component: ${component.name || 'Unnamed Component'} (as unified geometry)\n`;
  gcode += `; Position: (${component.x}, ${component.y}, ${component.z})\n`;
  
  // Extract all elements from the component with proper positioning
  const elements = extractComponentElements(component);
  
  if (elements.length === 0) {
    gcode += '; Component has no elements to machine\n';
    return gcode;
  }
  
  // Create a unified 3D model through boolean operations
  try {
    // Convert component elements to THREE.js objects
    const threeObjects = elements.map(element => createThreeObject(element));
    
    // Filter out null objects and keep only meshes that can be used for boolean operations
    const validMeshes = threeObjects.filter(obj => 
      obj !== null && obj instanceof THREE.Mesh
    ) as THREE.Mesh[];
    
    if (validMeshes.length === 0) {
      gcode += '; No valid meshes found in component for boolean operations\n';
      // Fall back to processing each element separately
      gcode += '; Processing elements individually instead\n';
      return processElementsSeparately(elements, settings);
    }
    
    gcode += `; Performing boolean union on ${validMeshes.length} meshes\n`;
    
    // Perform boolean union operations to create a single unified mesh
    let unifiedMesh = validMeshes[0];
    
    for (let i = 1; i < validMeshes.length; i++) {
      try {
        unifiedMesh = CSG.union(unifiedMesh, validMeshes[i]);
        gcode += `; Union with mesh ${i+1} successful\n`;
      } catch (error) {
        gcode += `; Error in boolean union with mesh ${i+1}: ${error}\n`;
        // Continue with remaining meshes
      }
    }
    
    // Generate a toolpath for the unified mesh
    gcode += generateUnifiedToolpath(unifiedMesh, settings);
    
    return gcode;
  } catch (error) {
    gcode += `; Error creating unified geometry: ${error}\n`;
    gcode += '; Falling back to processing elements individually\n';
    return processElementsSeparately(elements, settings);
  }
}

/**
 * Generate toolpath for a unified mesh
 * @param mesh The unified THREE.js mesh
 * @param settings The toolpath generation settings
 * @returns G-code string for the unified mesh
 */
function generateUnifiedToolpath(mesh: THREE.Mesh, settings: any): string {
  const { toolDiameter, depth, stepdown, feedrate, plungerate, offset, direction } = settings;
  
  let gcode = `\n; Unified mesh toolpath\n`;
  
  // Get mesh bounding box
  const boundingBox = new THREE.Box3().setFromObject(mesh);
  const dimensions = new THREE.Vector3();
  boundingBox.getSize(dimensions);
  const center = new THREE.Vector3();
  boundingBox.getCenter(center);
  
  gcode += `; Bounding box: width=${dimensions.x.toFixed(3)}, height=${dimensions.y.toFixed(3)}, depth=${dimensions.z.toFixed(3)}\n`;
  gcode += `; Center: (${center.x.toFixed(3)}, ${center.y.toFixed(3)}, ${center.z.toFixed(3)})\n`;
  
  // Determine top Z level
  const topZ = boundingBox.max.z;
  
  // Generate contour toolpath based on the projection of the mesh
  // For each Z level
  for (let z = 0; z > -Math.min(depth, dimensions.z); z -= stepdown) {
    const currentZ = Math.max(-Math.min(depth, dimensions.z), z);
    const actualZ = topZ + currentZ;
    
    gcode += `\n; Z Level: ${actualZ.toFixed(3)}\n`;
    
    // Calculate section (slice) of the model at this Z height
    const sectionPoints = calculateMeshSection(mesh, actualZ);
    
    if (sectionPoints.length > 0) {
      // Process section points to generate toolpath
      gcode += generateContourFromPoints(sectionPoints, actualZ, settings);
    } else {
      gcode += `; No intersection at this Z level\n`;
    }
  }
  
  return gcode;
}

/**
 * Calculate a cross-section of a mesh at a specific Z height
 * @param mesh The mesh to section
 * @param zHeight The Z height for the section
 * @returns Array of points representing the section contour
 */
function calculateMeshSection(mesh: THREE.Mesh, zHeight: number): THREE.Vector2[] {
  // This is a simplified approach - a full implementation would use a proper mesh slicing algorithm
  
  // For now, we'll use a simplified approach by creating a rectangular section based on the bounding box
  const boundingBox = new THREE.Box3().setFromObject(mesh);
  const dimensions = new THREE.Vector3();
  boundingBox.getSize(dimensions);
  const center = new THREE.Vector3();
  boundingBox.getCenter(center);
  
  // Create a rectangular contour
  const halfWidth = dimensions.x / 2;
  const halfHeight = dimensions.y / 2;
  
  return [
    new THREE.Vector2(center.x - halfWidth, center.y - halfHeight),
    new THREE.Vector2(center.x + halfWidth, center.y - halfHeight),
    new THREE.Vector2(center.x + halfWidth, center.y + halfHeight),
    new THREE.Vector2(center.x - halfWidth, center.y + halfHeight)
  ];
}

/**
 * Generate contour toolpath from a set of points
 * @param points Array of points representing the contour
 * @param zHeight The Z height for the contour
 * @param settings The toolpath generation settings
 * @returns G-code string for the contour
 */
function generateContourFromPoints(points: THREE.Vector2[], zHeight: number, settings: any): string {
  const { toolDiameter, feedrate, plungerate, offset, direction } = settings;
  
  let gcode = '';
  
  // Apply offset to the contour if needed
  let offsetPoints = points;
  if (offset !== 'center') {
    const offsetDistance = offset === 'outside' ? toolDiameter / 2 : -toolDiameter / 2;
    offsetPoints = applyOffsetToContour(points, offsetDistance);
  }
  
  // Reverse the points if needed for conventional milling
  if (direction === 'conventional') {
    offsetPoints.reverse();
  }
  
  // Make sure the contour is closed
  if (offsetPoints.length > 0 && 
      (offsetPoints[0].x !== offsetPoints[offsetPoints.length - 1].x || 
       offsetPoints[0].y !== offsetPoints[offsetPoints.length - 1].y)) {
    offsetPoints.push(offsetPoints[0].clone());
  }
  
  // Move to the first point
  if (offsetPoints.length > 0) {
    gcode += `G0 X${offsetPoints[0].x.toFixed(3)} Y${offsetPoints[0].y.toFixed(3)} Z${(zHeight + 5).toFixed(3)} ; Move above start position\n`;
    gcode += `G1 Z${zHeight.toFixed(3)} F${plungerate} ; Plunge to cutting depth\n`;
    
    // Move along the contour
    for (let i = 1; i < offsetPoints.length; i++) {
      gcode += `G1 X${offsetPoints[i].x.toFixed(3)} Y${offsetPoints[i].y.toFixed(3)} F${feedrate} ; Contour point ${i}\n`;
    }
  }
  
  return gcode;
}

/**
 * Apply offset to a contour
 * @param points Array of points representing the contour
 * @param offsetDistance Distance to offset (positive for outside, negative for inside)
 * @returns Array of points representing the offset contour
 */
function applyOffsetToContour(points: THREE.Vector2[], offsetDistance: number): THREE.Vector2[] {
  // This is a simplified approach - a full implementation would use proper polygon offsetting algorithms
  
  // For now, we'll just use a simple approach for rectangular contours
  if (points.length === 4) {
    const center = new THREE.Vector2();
    points.forEach(p => center.add(p));
    center.divideScalar(points.length);
    
    return points.map(point => {
      const dir = new THREE.Vector2().subVectors(point, center).normalize();
      return new THREE.Vector2().addVectors(point, dir.multiplyScalar(offsetDistance));
    });
  }
  
  // For other shapes, just return the original points
  return [...points];
}

/**
 * Process elements separately (fallback method)
 * @param elements Array of elements
 * @param settings The toolpath generation settings
 * @returns G-code string for the elements
 */
function processElementsSeparately(elements: any[], settings: any): string {
  // Instead of processing elements completely separately, we'll still try to 
  // create a unified toolpath by combining their operations in a smarter way
  
  let gcode = `; Generating unified toolpath for ${elements.length} elements without CSG\n`;
  
  // First, analyze elements to determine combined bounding box and get height information
  const boundingBoxes: THREE.Box3[] = [];
  const elementMetadata: {element: any, type: string, bbox: THREE.Box3, topZ: number, bottomZ: number}[] = [];
  
  // Process each element to gather metadata
  elements.forEach((element: any) => {
    const box = calculateElementBoundingBox(element);
    
    if (box) {
      boundingBoxes.push(box);
      elementMetadata.push({
        element: element,
        type: element.type,
        bbox: box,
        topZ: box.max.z,
        bottomZ: box.min.z
      });
    }
  });
  
  if (boundingBoxes.length === 0) {
    return "; No valid elements found for toolpath generation\n";
  }
  
  // Calculate combined bounding box
  const combinedBox = new THREE.Box3().copy(boundingBoxes[0]);
  for (let i = 1; i < boundingBoxes.length; i++) {
    combinedBox.union(boundingBoxes[i]);
  }
  
  const dimensions = new THREE.Vector3();
  combinedBox.getSize(dimensions);
  const center = new THREE.Vector3();
  combinedBox.getCenter(center);
  
  gcode += `; Combined bounding box: width=${dimensions.x.toFixed(3)}, height=${dimensions.y.toFixed(3)}, depth=${dimensions.z.toFixed(3)}\n`;
  gcode += `; Combined center: (${center.x.toFixed(3)}, ${center.y.toFixed(3)}, ${center.z.toFixed(3)})\n`;
  
  // Get the depth and stepdown settings
  const { depth, stepdown } = settings;
  
  // Determine the absolute Z levels we need to process
  const topZ = combinedBox.max.z;
  const minTargetZ = Math.max(combinedBox.min.z, topZ - depth);
  
  gcode += `; Processing from Z=${topZ.toFixed(3)} to Z=${minTargetZ.toFixed(3)}\n`;
  
  // Generate toolpath for each Z level
  let currentZ = topZ;
  
  // Make sure we process at least one Z level even if topZ equals minTargetZ
  do {
    // Calculate next Z level
    const nextZ = Math.max(minTargetZ, currentZ - stepdown);
    gcode += `\n; === Z Level: ${nextZ.toFixed(3)} ===\n`;
    
    // Find elements that intersect with this Z level
    // An element intersects if the Z level is between or equal to its top and bottom Z
    const intersectingElements = elementMetadata.filter(meta => 
      nextZ <= meta.topZ && nextZ >= meta.bottomZ
    );
    
    if (intersectingElements.length > 0) {
      // Process all elements at this Z level as a single toolpath
      gcode += `; Processing ${intersectingElements.length} elements at this level\n`;
      
      // Keep track of tool position to minimize rapid movements
      let currentPosition: {x: number, y: number} | null = null;
      
      // Process each element
      for (const meta of intersectingElements) {
        gcode += `\n; Element: ${meta.type}\n`;
        
        // Generate appropriate toolpath for this element at this Z level
        const elementGcode = generateElementZLevelToolpath(meta.element, nextZ, settings, currentPosition);
        gcode += elementGcode;
        
        // Update current position based on where the toolpath ended
        // This is simplified - in a real implementation you'd track the actual end position
        currentPosition = getLastPosition(elementGcode);
      }
    } else {
      gcode += `; No elements intersect at this Z level\n`;
    }
    
    // Move to next Z level
    currentZ = nextZ;
  } while (currentZ > minTargetZ);
  
  return gcode;
}

/**
 * Generate toolpath for an element at a specific Z level
 * @param element The element to process
 * @param zLevel The Z level to process
 * @param settings The toolpath generation settings
 * @param startPosition Optional start position to optimize path
 * @returns G-code string for the element at the specific Z level
 */
function generateElementZLevelToolpath(
  element: any, 
  zLevel: number, 
  settings: any,
  startPosition: {x: number, y: number} | null = null
): string {
  let gcode = '';
  
  const { toolDiameter, feedrate, plungerate, offset, direction } = settings;
  
  // Based on element type, generate appropriate z-level specific toolpath
  switch (element.type) {
    case 'cube':
    case 'rectangle': {
      // Generate rectangle contour at this Z level
      const width = element.width || 0;
      const depth = element.depth || element.height || 0;
      const startX = element.x - width / 2;
      const startY = element.y - depth / 2;
      
      // Apply offset if needed
      let offsetDistance = 0;
      if (offset === 'inside') {
        offsetDistance = -toolDiameter / 2;
      } else if (offset === 'outside') {
        offsetDistance = toolDiameter / 2;
      }
      
      const effectiveWidth = width + offsetDistance * 2 * (offset === 'outside' ? 1 : -1);
      const effectiveDepth = depth + offsetDistance * 2 * (offset === 'outside' ? 1 : -1);
      
      // Only proceed if dimensions are valid
      if (effectiveWidth <= 0 || effectiveDepth <= 0) {
        gcode += `; Rectangle dimensions too small after offset, skipping\n`;
        return gcode;
      }
      
      // Generate move to approach position if we have a start position
      if (startPosition) {
        gcode += `G0 X${startX.toFixed(3)} Y${startY.toFixed(3)} ; Rapid to rectangle approach\n`;
      } else {
        gcode += `G0 X${startX.toFixed(3)} Y${startY.toFixed(3)} Z${(zLevel + 5).toFixed(3)} ; Rapid above rectangle start\n`;
        gcode += `G1 Z${zLevel.toFixed(3)} F${plungerate} ; Plunge to cutting depth\n`;
      }
      
      // Rectangle contour
      const corners = [
        [startX, startY],
        [startX + effectiveWidth, startY],
        [startX + effectiveWidth, startY + effectiveDepth],
        [startX, startY + effectiveDepth],
        [startX, startY] // Close the loop
      ];
      
      // Reverse for conventional milling if needed
      if (direction === 'conventional') {
        corners.reverse();
      }
      
      // Generate the contour
      for (let i = 0; i < corners.length; i++) {
        gcode += `G1 X${corners[i][0].toFixed(3)} Y${corners[i][1].toFixed(3)} F${feedrate} ; Corner ${i+1}\n`;
      }
      break;
    }
      
    case 'sphere':
    case 'hemisphere':
    case 'ellipsoid':
    case 'circle':
    case 'ellipse': {
      // For round shapes, generate circular/elliptical contours
      const radius = element.radius || 25; 
      const radiusX = element.radiusX || radius;
      const radiusY = element.radiusY || radius;
      
      // For hemisphere/sphere, calculate radius at this Z height
      let effectiveRadiusX = radiusX;
      let effectiveRadiusY = radiusY;
      
      if (element.type === 'sphere') {
        // For sphere, calculate radius at height using the sphere equation
        const distFromCenter = Math.abs(zLevel - element.z);
        
        if (distFromCenter > radius) {
          gcode += `; Sphere out of range at this Z level, skipping\n`;
          return gcode;
        }
        
        // Calculate radius at this height using sphere equation: r² = R² - h²
        effectiveRadiusX = effectiveRadiusY = Math.sqrt(Math.max(0, Math.pow(radius, 2) - Math.pow(distFromCenter, 2)));
      } else if (element.type === 'hemisphere') {
        // For hemisphere, direction matters (up or down)
        const direction = element.direction || 'up';
        const hemisphereTopZ = direction === 'up' ? element.z + radius : element.z;
        const hemisphereBottomZ = direction === 'up' ? element.z : element.z - radius;
        
        // Check if the Z level intersects with the hemisphere
        if (zLevel > hemisphereTopZ || zLevel < hemisphereBottomZ) {
          gcode += `; Hemisphere out of range at this Z level, skipping\n`;
          return gcode;
        }
        
        // Calculate distance from the sphere center
        const centerZ = direction === 'up' ? element.z : element.z - radius;
        const distFromCenter = Math.abs(zLevel - centerZ);
        
        // Calculate radius at this height using sphere equation: r² = R² - h²
        effectiveRadiusX = effectiveRadiusY = Math.sqrt(Math.max(0, Math.pow(radius, 2) - Math.pow(distFromCenter, 2)));
      } else if (element.type === 'ellipsoid') {
        // For ellipsoid, we need to scale based on Z position
        const radiusZ = element.radiusZ || element.depth/2 || 20;
        const distFromCenter = Math.abs(zLevel - element.z);
        
        if (distFromCenter > radiusZ) {
          gcode += `; Ellipsoid out of range at this Z level, skipping\n`;
          return gcode;
        }
        
        // Calculate X and Y radii at this Z level
        const zRatio = distFromCenter / radiusZ;
        const scaleForZ = Math.sqrt(1 - Math.pow(zRatio, 2));
        effectiveRadiusX = radiusX * scaleForZ;
        effectiveRadiusY = radiusY * scaleForZ;
      }
      
      // Apply offset to radius
      if (offset === 'inside') {
        effectiveRadiusX = Math.max(0, effectiveRadiusX - toolDiameter / 2);
        effectiveRadiusY = Math.max(0, effectiveRadiusY - toolDiameter / 2);
      } else if (offset === 'outside') {
        effectiveRadiusX += toolDiameter / 2;
        effectiveRadiusY += toolDiameter / 2;
      }
      
      // Skip if radius is too small
      if (effectiveRadiusX <= 0 || effectiveRadiusY <= 0) {
        gcode += `; Circle/ellipse radius too small after offset, skipping\n`;
        return gcode;
      }
      
      // Position for approach
      if (startPosition) {
        gcode += `G0 X${(element.x + effectiveRadiusX).toFixed(3)} Y${element.y.toFixed(3)} ; Rapid to circle approach\n`;
      } else {
        gcode += `G0 X${(element.x + effectiveRadiusX).toFixed(3)} Y${element.y.toFixed(3)} Z${(zLevel + 5).toFixed(3)} ; Rapid above circle start\n`;
        gcode += `G1 Z${zLevel.toFixed(3)} F${plungerate} ; Plunge to cutting depth\n`;
      }
      
      // For exact circles, use G2/G3
      if (Math.abs(effectiveRadiusX - effectiveRadiusY) < 0.001) {
        // Full circle
        if (direction === 'climb') {
          gcode += `G3 X${(element.x + effectiveRadiusX).toFixed(3)} Y${element.y.toFixed(3)} I${(-effectiveRadiusX).toFixed(3)} J0 F${feedrate} ; Clockwise full circle\n`;
        } else {
          gcode += `G2 X${(element.x + effectiveRadiusX).toFixed(3)} Y${element.y.toFixed(3)} I${(-effectiveRadiusX).toFixed(3)} J0 F${feedrate} ; Counter-clockwise full circle\n`;
        }
      } else {
        // For ellipses, use linear interpolation
        const points = [];
        const numPoints = Math.max(36, Math.ceil(Math.PI * (effectiveRadiusX + effectiveRadiusY)));
        
        for (let i = 0; i <= numPoints; i++) {
          const angle = (i / numPoints) * 2 * Math.PI;
          const x = element.x + effectiveRadiusX * Math.cos(angle);
          const y = element.y + effectiveRadiusY * Math.sin(angle);
          points.push([x, y]);
        }
        
        // Reverse for conventional milling if needed
        if (direction === 'conventional') {
          points.reverse();
        }
        
        // Generate the contour
        for (let i = 0; i < points.length; i++) {
          gcode += `G1 X${points[i][0].toFixed(3)} Y${points[i][1].toFixed(3)} F${feedrate} ; Point ${i+1}\n`;
        }
      }
      break;
    }
    
    case 'capsule': {
      // For capsule, we need to determine which part of the capsule we're intersecting
      const radius = element.radius || 15;
      const height = element.height || 50;
      const orientation = element.orientation || 'z';
      
      // Calculate the cylinder section length (total height minus the two hemispheres)
      const cylinderLength = Math.max(0, height - 2 * radius);
      
      // Determine shape of slice based on orientation and Z level
      let sliceShape = '';
      let effectiveRadius = radius;
      
      if (orientation === 'z') {
        // Calculate positions for the Z-oriented capsule
        const capsuleTopZ = element.z + height/2;
        const capsuleBottomZ = element.z - height/2;
        const cylinderTopZ = capsuleTopZ - radius;
        const cylinderBottomZ = capsuleBottomZ + radius;
        
        // Check which part of the capsule we're intersecting
        if (zLevel > cylinderTopZ && zLevel <= capsuleTopZ) {
          // Top hemisphere
          sliceShape = 'circle';
          const distFromTop = capsuleTopZ - zLevel;
          effectiveRadius = Math.sqrt(Math.max(0, Math.pow(radius, 2) - Math.pow(radius - distFromTop, 2)));
        } else if (zLevel >= cylinderBottomZ && zLevel <= cylinderTopZ) {
          // Cylinder part
          sliceShape = 'circle';
          effectiveRadius = radius;
        } else if (zLevel >= capsuleBottomZ && zLevel < cylinderBottomZ) {
          // Bottom hemisphere
          sliceShape = 'circle';
          const distFromBottom = zLevel - capsuleBottomZ;
          effectiveRadius = Math.sqrt(Math.max(0, Math.pow(radius, 2) - Math.pow(radius - distFromBottom, 2)));
        } else {
          // Outside capsule
          gcode += `; Capsule out of range at this Z level, skipping\n`;
          return gcode;
        }
        
        // Apply offset to radius
        if (offset === 'inside') {
          effectiveRadius = Math.max(0, effectiveRadius - toolDiameter / 2);
        } else if (offset === 'outside') {
          effectiveRadius += toolDiameter / 2;
        }
        
        // Skip if radius is too small
        if (effectiveRadius <= 0) {
          gcode += `; Capsule radius too small after offset, skipping\n`;
          return gcode;
        }
        
        // Generate circle toolpath
        // Position for approach
        if (startPosition) {
          gcode += `G0 X${(element.x + effectiveRadius).toFixed(3)} Y${element.y.toFixed(3)} ; Rapid to circle approach\n`;
        } else {
          gcode += `G0 X${(element.x + effectiveRadius).toFixed(3)} Y${element.y.toFixed(3)} Z${(zLevel + 5).toFixed(3)} ; Rapid above circle start\n`;
          gcode += `G1 Z${zLevel.toFixed(3)} F${plungerate} ; Plunge to cutting depth\n`;
        }
        
        // Generate circle with G2/G3
        if (direction === 'climb') {
          gcode += `G3 X${(element.x + effectiveRadius).toFixed(3)} Y${element.y.toFixed(3)} I${(-effectiveRadius).toFixed(3)} J0 F${feedrate} ; Clockwise full circle\n`;
        } else {
          gcode += `G2 X${(element.x + effectiveRadius).toFixed(3)} Y${element.y.toFixed(3)} I${(-effectiveRadius).toFixed(3)} J0 F${feedrate} ; Counter-clockwise full circle\n`;
        }
      } else {
        // For X and Y oriented capsules, the slices will be more complex
        // Simplified approach: generate an elliptical approximation
        gcode += `; Capsule with ${orientation} orientation - generating approximated slice\n`;
        
        let radiusX = radius;
        let radiusY = radius;
        
        if (orientation === 'x') {
          radiusX = height / 2; // Elongated in X direction
        } else { // y orientation
          radiusY = height / 2; // Elongated in Y direction
        }
        
        // Apply offset
        if (offset === 'inside') {
          radiusX = Math.max(0, radiusX - toolDiameter / 2);
          radiusY = Math.max(0, radiusY - toolDiameter / 2);
        } else if (offset === 'outside') {
          radiusX += toolDiameter / 2;
          radiusY += toolDiameter / 2;
        }
        
        // Skip if radii are too small
        if (radiusX <= 0 || radiusY <= 0) {
          gcode += `; Capsule dimensions too small after offset, skipping\n`;
          return gcode;
        }
        
        // Generate ellipse toolpath
        const points = [];
        const numPoints = Math.max(36, Math.ceil(Math.PI * (radiusX + radiusY)));
        
        for (let i = 0; i <= numPoints; i++) {
          const angle = (i / numPoints) * 2 * Math.PI;
          const x = element.x + radiusX * Math.cos(angle);
          const y = element.y + radiusY * Math.sin(angle);
          points.push([x, y]);
        }
        
        // Position for approach
        if (startPosition) {
          gcode += `G0 X${points[0][0].toFixed(3)} Y${points[0][1].toFixed(3)} ; Rapid to ellipse approach\n`;
        } else {
          gcode += `G0 X${points[0][0].toFixed(3)} Y${points[0][1].toFixed(3)} Z${(zLevel + 5).toFixed(3)} ; Rapid above ellipse start\n`;
          gcode += `G1 Z${zLevel.toFixed(3)} F${plungerate} ; Plunge to cutting depth\n`;
        }
        
        // Reverse for conventional milling if needed
        if (direction === 'conventional') {
          points.reverse();
        }
        
        // Generate the contour
        for (let i = 0; i < points.length; i++) {
          gcode += `G1 X${points[i][0].toFixed(3)} Y${points[i][1].toFixed(3)} F${feedrate} ; Point ${i+1}\n`;
        }
      }
      break;
    }
    
    case 'cylinder':
    case 'cone': {
      // For cylinder or cone at a specific Z level
      const radius = element.radius || 25;
      const height = element.height || 50;
      
      // Calculate top and bottom positions
      const topZ = element.z + height / 2;
      const bottomZ = element.z - height / 2;
      
      // Check if Z level intersects with the element
      if (zLevel > topZ || zLevel < bottomZ) {
        gcode += `; ${element.type} out of range at this Z level, skipping\n`;
        return gcode;
      }
      
      // Calculate radius at this Z level
      let effectiveRadius = radius;
      
      if (element.type === 'cone') {
        // For cone, radius varies by height
        const zRatio = (topZ - zLevel) / height;
        effectiveRadius = radius * (1 - zRatio);
      }
      
      // Apply offset
      if (offset === 'inside') {
        effectiveRadius = Math.max(0, effectiveRadius - toolDiameter / 2);
      } else if (offset === 'outside') {
        effectiveRadius += toolDiameter / 2;
      }
      
      // Skip if radius is too small
      if (effectiveRadius <= 0) {
        gcode += `; ${element.type} radius too small after offset, skipping\n`;
        return gcode;
      }
      
      // Position for approach
      if (startPosition) {
        gcode += `G0 X${(element.x + effectiveRadius).toFixed(3)} Y${element.y.toFixed(3)} ; Rapid to circle approach\n`;
      } else {
        gcode += `G0 X${(element.x + effectiveRadius).toFixed(3)} Y${element.y.toFixed(3)} Z${(zLevel + 5).toFixed(3)} ; Rapid above circle start\n`;
        gcode += `G1 Z${zLevel.toFixed(3)} F${plungerate} ; Plunge to cutting depth\n`;
      }
      
      // Generate circle with G2/G3
      if (direction === 'climb') {
        gcode += `G3 X${(element.x + effectiveRadius).toFixed(3)} Y${element.y.toFixed(3)} I${(-effectiveRadius).toFixed(3)} J0 F${feedrate} ; Clockwise full circle\n`;
      } else {
        gcode += `G2 X${(element.x + effectiveRadius).toFixed(3)} Y${element.y.toFixed(3)} I${(-effectiveRadius).toFixed(3)} J0 F${feedrate} ; Counter-clockwise full circle\n`;
      }
      break;
    }
      
    default:
      gcode += `; No specialized Z-level toolpath for element type: ${element.type}, skipping\n`;
      break;
  }
  
  return gcode;
}

/**
 * Get the last position from a g-code string (simplified)
 * @param gcode G-code string to parse
 * @returns Last position or null if not found
 */
function getLastPosition(gcode: string): {x: number, y: number} | null {
  // This is a simplified implementation - a proper one would actually parse G-code
  // and find the last X/Y position
  
  // For now, return null, which will cause the next element to use an absolute approach
  return null;
}

/**
 * Calculate a bounding box for an element
 * @param element The element to analyze
 * @returns THREE.Box3 bounding box or null if not applicable
 */
function calculateElementBoundingBox(element: any): THREE.Box3 | null {
  if (!element) return null;
  
  try {
    switch (element.type) {
      case 'cube':
      case 'rectangle': {
        const width = element.width || 0;
        const height = element.height || 0;
        const depth = element.depth || height || 0;
        
        const box = new THREE.Box3();
        box.min.set(
          element.x - width/2,
          element.y - depth/2,
          element.z - height/2
        );
        box.max.set(
          element.x + width/2,
          element.y + depth/2,
          element.z + height/2
        );
        return box;
      }
        
      case 'sphere': {
        const radius = element.radius || 0;
        
        const box = new THREE.Box3();
        box.min.set(
          element.x - radius,
          element.y - radius,
          element.z - radius
        );
        box.max.set(
          element.x + radius,
          element.y + radius,
          element.z + radius
        );
        return box;
      }
        
      case 'hemisphere': {
        const radius = element.radius || 0;
        const direction = element.direction || 'up';
        
        const box = new THREE.Box3();
        if (direction === 'up') {
          box.min.set(
            element.x - radius,
            element.y - radius,
            element.z
          );
          box.max.set(
            element.x + radius,
            element.y + radius,
            element.z + radius
          );
        } else {
          box.min.set(
            element.x - radius,
            element.y - radius,
            element.z - radius
          );
          box.max.set(
            element.x + radius,
            element.y + radius,
            element.z
          );
        }
        return box;
      }
        
      case 'cylinder': {
        const radius = element.radius || 0;
        const height = element.height || 0;
        
        const box = new THREE.Box3();
        box.min.set(
          element.x - radius,
          element.y - radius,
          element.z - height/2
        );
        box.max.set(
          element.x + radius,
          element.y + radius,
          element.z + height/2
        );
        return box;
      }
      
      case 'capsule': {
        const radius = element.radius || 0;
        const height = element.height || 0;
        const orientation = element.orientation || 'z';
        
        const box = new THREE.Box3();
        if (orientation === 'z') {
          box.min.set(
            element.x - radius,
            element.y - radius,
            element.z - height/2
          );
          box.max.set(
            element.x + radius,
            element.y + radius,
            element.z + height/2
          );
        } else if (orientation === 'x') {
          box.min.set(
            element.x - height/2,
            element.y - radius,
            element.z - radius
          );
          box.max.set(
            element.x + height/2,
            element.y + radius,
            element.z + radius
          );
        } else { // y orientation
          box.min.set(
            element.x - radius,
            element.y - height/2,
            element.z - radius
          );
          box.max.set(
            element.x + radius,
            element.y + height/2,
            element.z + radius
          );
        }
        return box;
      }
      
      // Add more element types as needed
        
      default:
        // For unknown types, create a small box around the element center
        const box = new THREE.Box3();
        box.min.set(
          element.x - 0.1,
          element.y - 0.1,
          element.z - 0.1
        );
        box.max.set(
          element.x + 0.1,
          element.y + 0.1,
          element.z + 0.1
        );
        return box;
    }
  } catch (error) {
    console.error(`Error calculating bounding box for element type ${element.type}:`, error);
    return null;
  }
}

/**
 * Create a THREE.js object from a CAD element
 * @param element The element to convert
 * @returns THREE.js object representing the element
 */
function createThreeObject(element: any): THREE.Object3D | null {
  if (!element) return null;
  
  try {
    switch (element.type) {
      case 'cube':
        const cubeGeometry = new THREE.BoxGeometry(
          element.width || 1,
          element.height || 1,
          element.depth || 1
        );
        const cubeMaterial = new THREE.MeshStandardMaterial();
        const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
        cube.position.set(element.x || 0, element.y || 0, element.z || 0);
        return cube;
        
      case 'sphere':
        const sphereGeometry = new THREE.SphereGeometry(
          element.radius || 1,
          32, 32
        );
        const sphereMaterial = new THREE.MeshStandardMaterial();
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.position.set(element.x || 0, element.y || 0, element.z || 0);
        return sphere;
        
      case 'cylinder':
        const cylinderGeometry = new THREE.CylinderGeometry(
          element.radius || 1,
          element.radius || 1,
          element.height || 1,
          32
        );
        const cylinderMaterial = new THREE.MeshStandardMaterial();
        const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
        cylinder.position.set(element.x || 0, element.y || 0, element.z || 0);
        // Adjust rotation for standard orientation
        cylinder.rotation.x = Math.PI / 2;
        return cylinder;
        
      case 'cone':
        const coneGeometry = new THREE.ConeGeometry(
          element.radius || 1,
          element.height || 1,
          32
        );
        const coneMaterial = new THREE.MeshStandardMaterial();
        const cone = new THREE.Mesh(coneGeometry, coneMaterial);
        cone.position.set(element.x || 0, element.y || 0, element.z || 0);
        // Adjust rotation for standard orientation
        cone.rotation.x = Math.PI / 2;
        return cone;
        
      case 'torus':
        const torusGeometry = new THREE.TorusGeometry(
          element.radius || 1,
          element.tube || 0.2,
          16, 100
        );
        const torusMaterial = new THREE.MeshStandardMaterial();
        const torus = new THREE.Mesh(torusGeometry, torusMaterial);
        torus.position.set(element.x || 0, element.y || 0, element.z || 0);
        return torus;
        
      // Add more element types as needed
        
      case 'group':
      case 'component':
        // For groups and components, create a group and add all children
        const group = new THREE.Group();
        group.position.set(element.x || 0, element.y || 0, element.z || 0);
        
        if (element.elements && Array.isArray(element.elements)) {
          element.elements.forEach((childElement: any) => {
            const childObject = createThreeObject(childElement);
            if (childObject) {
              group.add(childObject);
            }
          });
        }
        
        return group;
        
      default:
        console.warn(`Unknown element type for THREE.js conversion: ${element.type}`);
        return null;
    }
  } catch (error) {
    console.error(`Error creating THREE object for element type ${element.type}:`, error);
    return null;
  }
}

/**
 * Generate toolpath for a single element
 * @param element The element to process
 * @param settings The toolpath generation settings
 * @returns G-code string for the element
 */
export function generateElementToolpath(element: any, settings: any): string {
  let gcode = '';
  
  switch (element.type) {
    case 'cube':
      gcode += generateCubeToolpath(element, settings);
      break;
    case 'sphere':
      gcode += generateSphereToolpath(element, settings);
      break;
    case 'cylinder':
      gcode += generateCylinderToolpath(element, settings);
      break;
    case 'circle':
      gcode += generateCircleToolpath(element, settings);
      break;
    case 'rectangle':
      gcode += generateRectangleToolpath(element, settings);
      break;
    case 'line':
      gcode += generateLineToolpath(element, settings);
      break;
    case 'pyramid':
      gcode += generatePyramidToolpath(element, settings);
      break;
    case 'hemisphere':
      gcode += generateHemisphereToolpath(element, settings);
      break;
    case 'prism':
      gcode += generatePrismToolpath(element, settings);
      break;
    case 'ellipsoid':
      gcode += generateEllipsoidToolpath(element, settings);
      break;
    case 'capsule':
      gcode += generateCapsuleToolpath(element, settings);
      break;
    case 'triangle':
      gcode += generateTriangleToolpath(element, settings);
      break;
    case 'arc':
      gcode += generateArcToolpath(element, settings);
      break;
    case 'ellipse':
      gcode += generateEllipseToolpath(element, settings);
      break;
    case 'text3d':
      gcode += generateText3DToolpath(element, settings);
      break;
    default:
      gcode += `; Toolpath generation for ${element.type} not implemented yet\n`;
  }
  
  return gcode;
}

/**
 * Generate toolpath for a cube element
 * This is a placeholder that would typically contain the same logic as in ToolpathGenerator
 */
function generateCubeToolpath(element: any, settings: any): string {
  const { toolDiameter, depth, stepdown, feedrate, plungerate, offset, direction } = settings;
  
  let gcode = `; Cube: center (${element.x}, ${element.y}, ${element.z}), width ${element.width}mm, height ${element.height}mm, depth ${element.depth}mm\n`;
  
  // Calculate offset distance based on selected offset type
  let offsetDistance = 0;
  if (offset === 'inside') {
    offsetDistance = -toolDiameter / 2;
  } else if (offset === 'outside') {
    offsetDistance = toolDiameter / 2;
  }
  
  // Calculate rectangle coordinates with offset
  const width = element.width + offsetDistance * 2 * (offset === 'outside' ? 1 : -1);
  const height = element.depth + offsetDistance * 2 * (offset === 'outside' ? 1 : -1);
  
  // Start point (top face)
  const startX = element.x - width / 2;
  const startY = element.y - height / 2;
  const startZ = element.z + element.height / 2;
  
  // For each Z level
  for (let z = 0; z > -Math.min(depth, element.height); z -= stepdown) {
    const currentZ = Math.max(-Math.min(depth, element.height), z);
    const actualZ = startZ + currentZ;
    
    gcode += `\n; Z Level: ${actualZ.toFixed(3)}\n`;
    gcode += `G0 X${startX.toFixed(3)} Y${startY.toFixed(3)} Z${(startZ + 5).toFixed(3)} ; Move above start position\n`;
    gcode += `G1 Z${actualZ.toFixed(3)} F${plungerate} ; Plunge to cutting depth\n`;
    
    // Contour
    const corners = [
      [startX, startY],
      [startX + width, startY],
      [startX + width, startY + height],
      [startX, startY + height],
      [startX, startY] // Close the loop
    ];
    
    // Reverse order for conventional milling
    if (direction === 'conventional') {
      corners.reverse();
    }
    
    for (let i = 0; i < corners.length; i++) {
      gcode += `G1 X${corners[i][0].toFixed(3)} Y${corners[i][1].toFixed(3)} F${feedrate} ; Corner ${i+1}\n`;
    }
  }
  
  return gcode;
}

/**
 * Generate toolpath for a sphere element
 */
function generateSphereToolpath(element: any, settings: any): string {
  const { toolDiameter, depth, stepdown, feedrate, plungerate } = settings;
  
  let gcode = `; Sphere: center (${element.x}, ${element.y}, ${element.z}), radius ${element.radius}mm\n`;
  gcode += `; Note: Sphere machining typically requires 3D toolpath strategies\n`;
  
  // Z levels for a spherical object
  const maxDepth = Math.min(depth, element.radius * 2);
  const topZ = element.z + element.radius;
  
  for (let z = 0; z > -maxDepth; z -= stepdown) {
    const currentZ = Math.max(-maxDepth, z);
    const actualZ = topZ + currentZ;
    
    // Calculate radius at this height using the sphere equation
    const heightFromCenter = actualZ - element.z;
    const radiusAtHeight = Math.sqrt(Math.max(0, Math.pow(element.radius, 2) - Math.pow(heightFromCenter, 2)));
    
    gcode += `\n; Z Level: ${actualZ.toFixed(3)}, Radius: ${radiusAtHeight.toFixed(3)}\n`;
    
    // Circle path at this height
    gcode += `G0 X${(element.x + radiusAtHeight).toFixed(3)} Y${element.y.toFixed(3)} Z${(actualZ + 5).toFixed(3)} ; Move above start position\n`;
    gcode += `G1 Z${actualZ.toFixed(3)} F${plungerate} ; Plunge to cutting depth\n`;
    gcode += `G3 X${(element.x + radiusAtHeight).toFixed(3)} Y${element.y.toFixed(3)} I${(-radiusAtHeight).toFixed(3)} J0 F${feedrate} ; Full circle\n`;
  }
  
  return gcode;
}

/**
 * Generate toolpath for a cylinder element
 */
function generateCylinderToolpath(element: any, settings: any): string {
  const { toolDiameter, depth, stepdown, feedrate, plungerate, offset, direction } = settings;
  
  let gcode = `; Cylinder: center (${element.x}, ${element.y}, ${element.z}), radius ${element.radius}mm, height ${element.height}mm\n`;
  
  // Calculate offset distance based on selected offset type
  let effectiveRadius = element.radius;
  if (offset === 'inside') {
    effectiveRadius -= toolDiameter / 2;
  } else if (offset === 'outside') {
    effectiveRadius += toolDiameter / 2;
  }
  
  // Start with the top of the cylinder
  const topZ = element.z + element.height / 2;
  
  // For each Z level
  for (let z = 0; z > -Math.min(depth, element.height); z -= stepdown) {
    const currentZ = Math.max(-Math.min(depth, element.height), z);
    const actualZ = topZ + currentZ;
    
    gcode += `\n; Z Level: ${actualZ.toFixed(3)}\n`;
    
    // Move to start point on circle
    gcode += `G0 X${(element.x + effectiveRadius).toFixed(3)} Y${element.y.toFixed(3)} Z${(topZ + 5).toFixed(3)} ; Move above start position\n`;
    gcode += `G1 Z${actualZ.toFixed(3)} F${plungerate} ; Plunge to cutting depth\n`;
    
    // Full circle
    if (direction === 'climb') {
      gcode += `G3 X${(element.x + effectiveRadius).toFixed(3)} Y${element.y.toFixed(3)} I${(-effectiveRadius).toFixed(3)} J0 F${feedrate} ; Clockwise full circle\n`;
    } else {
      gcode += `G2 X${(element.x + effectiveRadius).toFixed(3)} Y${element.y.toFixed(3)} I${(-effectiveRadius).toFixed(3)} J0 F${feedrate} ; Counter-clockwise full circle\n`;
    }
  }
  
  return gcode;
}

/**
 * Generate toolpath for a circle element
 */
function generateCircleToolpath(element: any, settings: any): string {
  const { toolDiameter, depth, stepdown, feedrate, plungerate, offset, direction } = settings;
  
  let gcode = `; Circle: center (${element.x}, ${element.y}, ${element.z}), radius ${element.radius}mm\n`;
  
  // Calculate offset distance based on selected offset type
  let effectiveRadius = element.radius;
  if (offset === 'inside') {
    effectiveRadius -= toolDiameter / 2;
  } else if (offset === 'outside') {
    effectiveRadius += toolDiameter / 2;
  }
  
  // For each Z level
  for (let z = 0; z > -depth; z -= stepdown) {
    const currentZ = Math.max(-depth, z);
    
    gcode += `\n; Z Level: ${currentZ.toFixed(3)}\n`;
    
    // Move to start point on circle
    gcode += `G0 X${(element.x + effectiveRadius).toFixed(3)} Y${element.y.toFixed(3)} Z${(element.z + 5).toFixed(3)} ; Move above start position\n`;
    gcode += `G1 Z${(element.z + currentZ).toFixed(3)} F${plungerate} ; Plunge to cutting depth\n`;
    
    // Full circle
    if (direction === 'climb') {
      gcode += `G3 X${(element.x + effectiveRadius).toFixed(3)} Y${element.y.toFixed(3)} I${(-effectiveRadius).toFixed(3)} J0 F${feedrate} ; Clockwise full circle\n`;
    } else {
      gcode += `G2 X${(element.x + effectiveRadius).toFixed(3)} Y${element.y.toFixed(3)} I${(-effectiveRadius).toFixed(3)} J0 F${feedrate} ; Counter-clockwise full circle\n`;
    }
  }
  
  return gcode;
}

/**
 * Generate toolpath for a rectangle element
 */
function generateRectangleToolpath(element: any, settings: any): string {
  const { toolDiameter, depth, stepdown, feedrate, plungerate, offset, direction } = settings;
  
  let gcode = `; Rectangle: center (${element.x}, ${element.y}), width ${element.width}mm, height ${element.height}mm\n`;
  
  // Calculate offset distance based on selected offset type
  let offsetDistance = 0;
  if (offset === 'inside') {
    offsetDistance = -toolDiameter / 2;
  } else if (offset === 'outside') {
    offsetDistance = toolDiameter / 2;
  }
  
  // Calculate rectangle coordinates with offset
  const width = element.width + offsetDistance * 2 * (offset === 'outside' ? 1 : -1);
  const height = element.height + offsetDistance * 2 * (offset === 'outside' ? 1 : -1);
  
  // Start point
  const startX = element.x - width / 2;
  const startY = element.y - height / 2;
  
  // For each Z level
  for (let z = 0; z > -depth; z -= stepdown) {
    const currentZ = Math.max(-depth, z);
    
    gcode += `\n; Z Level: ${currentZ.toFixed(3)}\n`;
    gcode += `G0 X${startX.toFixed(3)} Y${startY.toFixed(3)} Z${(element.z + 5).toFixed(3)} ; Move above start position\n`;
    gcode += `G1 Z${(element.z + currentZ).toFixed(3)} F${plungerate} ; Plunge to cutting depth\n`;
    
    // Contour
    const corners = [
      [startX, startY],
      [startX + width, startY],
      [startX + width, startY + height],
      [startX, startY + height],
      [startX, startY] // Close the loop
    ];
    
    // Reverse order for conventional milling
    if (direction === 'conventional') {
      corners.reverse();
    }
    
    for (let i = 0; i < corners.length; i++) {
      gcode += `G1 X${corners[i][0].toFixed(3)} Y${corners[i][1].toFixed(3)} F${feedrate} ; Corner ${i+1}\n`;
    }
  }
  
  return gcode;
}

/**
 * Generate toolpath for a line element
 */
function generateLineToolpath(element: any, settings: any): string {
  const { depth, stepdown, feedrate, plungerate } = settings;
  
  let gcode = `; Line: from (${element.x1}, ${element.y1}) to (${element.x2}, ${element.y2})\n`;
  
  // For each Z level
  for (let z = 0; z > -depth; z -= stepdown) {
    const currentZ = Math.max(-depth, z);
    
    gcode += `\n; Z Level: ${currentZ.toFixed(3)}\n`;
    gcode += `G0 X${element.x1.toFixed(3)} Y${element.y1.toFixed(3)} Z${(element.z1 || 0 + 5).toFixed(3)} ; Move above start position\n`;
    gcode += `G1 Z${((element.z1 || 0) + currentZ).toFixed(3)} F${plungerate} ; Plunge to cutting depth\n`;
    gcode += `G1 X${element.x2.toFixed(3)} Y${element.y2.toFixed(3)} F${feedrate} ; Linear move to end\n`;
  }
  
  return gcode;
}

/**
 * Generate toolpath for a pyramid element
 */
function generatePyramidToolpath(element: any, settings: any): string {
  const { toolDiameter, depth, stepdown, feedrate, plungerate, offset, direction } = settings;
  
  let gcode = `; Pyramid: center (${element.x}, ${element.y}, ${element.z}), base width ${element.baseWidth || element.width}mm, base depth ${element.baseDepth || element.depth}mm, height ${element.height}mm\n`;
  
  // Calculate offset distance based on selected offset type
  let offsetDistance = 0;
  if (offset === 'inside') {
    offsetDistance = -toolDiameter / 2;
  } else if (offset === 'outside') {
    offsetDistance = toolDiameter / 2;
  }
  
  // Get base dimensions
  const baseWidth = element.baseWidth || element.width || 50;
  const baseDepth = element.baseDepth || element.depth || 50;
  const height = element.height || 50;
  
  // Calculate the top Z of the pyramid
  const topZ = element.z + height / 2;
  const bottomZ = element.z - height / 2;
  
  // For each Z level from top to bottom
  for (let z = 0; z > -Math.min(depth, height); z -= stepdown) {
    const currentZ = Math.max(-Math.min(depth, height), z);
    const actualZ = topZ + currentZ;
    
    // Calculate the slice dimensions at this Z level
    // As we move down from the top, the slice gets larger
    const ratio = 1 - (actualZ - bottomZ) / height;
    const sliceWidth = baseWidth * ratio;
    const sliceDepth = baseDepth * ratio;
    
    // Calculate the corners of this slice
    const halfSliceWidth = sliceWidth / 2;
    const halfSliceDepth = sliceDepth / 2;
    
    // Apply offset to the slice dimensions
    const offsetWidth = sliceWidth + offsetDistance * 2 * (offset === 'outside' ? 1 : -1);
    const offsetDepth = sliceDepth + offsetDistance * 2 * (offset === 'outside' ? 1 : -1);
    
    // Skip if dimensions are too small
    if (offsetWidth <= 0 || offsetDepth <= 0) {
      gcode += `\n; Z Level: ${actualZ.toFixed(3)} - Offset dimensions too small, skipping\n`;
      continue;
    }
    
    const halfOffsetWidth = offsetWidth / 2;
    const halfOffsetDepth = offsetDepth / 2;
    
    // Start point
    const startX = element.x - halfOffsetWidth;
    const startY = element.y - halfOffsetDepth;
    
    gcode += `\n; Z Level: ${actualZ.toFixed(3)}, Slice width: ${offsetWidth.toFixed(3)}, Slice depth: ${offsetDepth.toFixed(3)}\n`;
    gcode += `G0 X${startX.toFixed(3)} Y${startY.toFixed(3)} Z${(actualZ + 5).toFixed(3)} ; Move above start position\n`;
    gcode += `G1 Z${actualZ.toFixed(3)} F${plungerate} ; Plunge to cutting depth\n`;
    
    // Contour of the slice (rectangular)
    const corners = [
      [startX, startY],
      [startX + offsetWidth, startY],
      [startX + offsetWidth, startY + offsetDepth],
      [startX, startY + offsetDepth],
      [startX, startY] // Close the loop
    ];
    
    // Reverse order for conventional milling
    if (direction === 'conventional') {
      corners.reverse();
    }
    
    for (let i = 0; i < corners.length; i++) {
      gcode += `G1 X${corners[i][0].toFixed(3)} Y${corners[i][1].toFixed(3)} F${feedrate} ; Corner ${i+1}\n`;
    }
  }
  
  return gcode;
}

/**
 * Generate toolpath for a hemisphere element
 */
function generateHemisphereToolpath(element: any, settings: any): string {
  const { toolDiameter, depth, stepdown, feedrate, plungerate, offset, direction: millingDirection } = settings;
  
  let gcode = `; Hemisphere: center (${element.x}, ${element.y}, ${element.z}), radius ${element.radius}mm, direction ${element.direction || 'up'}\n`;
  
  // Get hemisphere properties
  const radius = element.radius || 25;
  const hemisphereDirection = element.direction || 'up'; // 'up' or 'down'
  
  // Determine the Z extents of the hemisphere
  let topZ, bottomZ;
  if (hemisphereDirection === 'up') {
    topZ = element.z + radius;
    bottomZ = element.z;
  } else {
    topZ = element.z;
    bottomZ = element.z - radius;
  }
  
  // For each Z level from top to bottom
  for (let z = 0; z > -Math.min(depth, radius); z -= stepdown) {
    const currentZ = Math.max(-Math.min(depth, radius), z);
    const actualZ = topZ + currentZ;
    
    // Skip if we're below the hemisphere
    if (actualZ < bottomZ) {
      continue;
    }
    
    // Calculate radius at this height using the sphere equation
    const distanceFromCenter = Math.abs(actualZ - (hemisphereDirection === 'up' ? element.z : element.z));
    const radiusAtHeight = Math.sqrt(Math.max(0, Math.pow(radius, 2) - Math.pow(distanceFromCenter, 2)));
    
    // Apply offset to the radius
    let effectiveRadius = radiusAtHeight;
    if (offset === 'inside') {
      effectiveRadius -= toolDiameter / 2;
    } else if (offset === 'outside') {
      effectiveRadius += toolDiameter / 2;
    }
    
    // Skip if radius is too small
    if (effectiveRadius <= 0) {
      gcode += `\n; Z Level: ${actualZ.toFixed(3)} - Radius too small, skipping\n`;
      continue;
    }
    
    gcode += `\n; Z Level: ${actualZ.toFixed(3)}, Radius: ${effectiveRadius.toFixed(3)}\n`;
    
    // Move to start point on circle
    gcode += `G0 X${(element.x + effectiveRadius).toFixed(3)} Y${element.y.toFixed(3)} Z${(actualZ + 5).toFixed(3)} ; Move above start position\n`;
    gcode += `G1 Z${actualZ.toFixed(3)} F${plungerate} ; Plunge to cutting depth\n`;
    
    // Full circle
    if (millingDirection === 'climb') {
      gcode += `G3 X${(element.x + effectiveRadius).toFixed(3)} Y${element.y.toFixed(3)} I${(-effectiveRadius).toFixed(3)} J0 F${feedrate} ; Clockwise full circle\n`;
    } else {
      gcode += `G2 X${(element.x + effectiveRadius).toFixed(3)} Y${element.y.toFixed(3)} I${(-effectiveRadius).toFixed(3)} J0 F${feedrate} ; Counter-clockwise full circle\n`;
    }
  }
  
  return gcode;
}

/**
 * Generate toolpath for a prism element
 */
function generatePrismToolpath(element: any, settings: any): string {
  const { toolDiameter, depth, stepdown, feedrate, plungerate, offset, direction } = settings;
  
  let gcode = `; Prism: center (${element.x}, ${element.y}, ${element.z}), radius ${element.radius}mm, height ${element.height}mm, sides ${element.sides || 6}\n`;
  
  // Get prism properties
  const radius = element.radius || 25;
  const height = element.height || 50;
  const sides = element.sides || 6;
  
  // Calculate the top Z of the prism
  const topZ = element.z + height / 2;
  const bottomZ = element.z - height / 2;
  
  // Apply offset to the radius
  let effectiveRadius = radius;
  if (offset === 'inside') {
    effectiveRadius -= toolDiameter / 2;
  } else if (offset === 'outside') {
    effectiveRadius += toolDiameter / 2;
  }
  
  // Skip if radius is too small
  if (effectiveRadius <= 0) {
    return `; Prism radius after offset too small, cannot generate toolpath\n`;
  }
  
  // For each Z level from top to bottom
  for (let z = 0; z > -Math.min(depth, height); z -= stepdown) {
    const currentZ = Math.max(-Math.min(depth, height), z);
    const actualZ = topZ + currentZ;
    
    // Skip if we're below the prism
    if (actualZ < bottomZ) {
      continue;
    }
    
    gcode += `\n; Z Level: ${actualZ.toFixed(3)}\n`;
    
    // Generate points for the polygon representing the prism cross-section
    const points = [];
    for (let i = 0; i < sides; i++) {
      const angle = i * (2 * Math.PI / sides);
      const x = element.x + effectiveRadius * Math.cos(angle);
      const y = element.y + effectiveRadius * Math.sin(angle);
      points.push([x, y]);
    }
    points.push(points[0]); // Close the loop
    
    // Reverse for conventional milling if needed
    if (direction === 'conventional') {
      points.reverse();
    }
    
    // Move to first point
    gcode += `G0 X${points[0][0].toFixed(3)} Y${points[0][1].toFixed(3)} Z${(actualZ + 5).toFixed(3)} ; Move above start position\n`;
    gcode += `G1 Z${actualZ.toFixed(3)} F${plungerate} ; Plunge to cutting depth\n`;
    
    // Move along the polygon
    for (let i = 1; i < points.length; i++) {
      gcode += `G1 X${points[i][0].toFixed(3)} Y${points[i][1].toFixed(3)} F${feedrate} ; Point ${i}\n`;
    }
  }
  
  return gcode;
}

/**
 * Generate toolpath for an ellipsoid element
 */
function generateEllipsoidToolpath(element: any, settings: any): string {
  const { toolDiameter, depth, stepdown, feedrate, plungerate, offset, direction } = settings;
  
  let gcode = `; Ellipsoid: center (${element.x}, ${element.y}, ${element.z}), radiusX ${element.radiusX || element.width/2 || 25}mm, radiusY ${element.radiusY || element.height/2 || 15}mm, radiusZ ${element.radiusZ || element.depth/2 || 20}mm\n`;
  
  // Get ellipsoid properties
  const radiusX = element.radiusX || element.width/2 || 25;
  const radiusY = element.radiusY || element.height/2 || 15;
  const radiusZ = element.radiusZ || element.depth/2 || 20;
  
  // Calculate the top Z of the ellipsoid
  const topZ = element.z + radiusZ;
  const bottomZ = element.z - radiusZ;
  
  // For each Z level from top to bottom
  for (let z = 0; z > -Math.min(depth, radiusZ * 2); z -= stepdown) {
    const currentZ = Math.max(-Math.min(depth, radiusZ * 2), z);
    const actualZ = topZ + currentZ;
    
    // Skip if we're below the ellipsoid
    if (actualZ < bottomZ) {
      continue;
    }
    
    // Calculate ratio of distance from center on Z axis
    const zRatio = Math.abs(actualZ - element.z) / radiusZ;
    
    // Skip if we're outside the ellipsoid
    if (zRatio > 1) {
      continue;
    }
    
    // Calculate X and Y radii at this Z level using the ellipsoid equation
    // For an ellipsoid, we scale the circle based on the Z ratio
    const scaleForZ = Math.sqrt(1 - Math.pow(zRatio, 2));
    const ellipseRadiusX = radiusX * scaleForZ;
    const ellipseRadiusY = radiusY * scaleForZ;
    
    // We need to approximate the ellipse with line segments for the G-code
    // Generate points along the ellipse
    const numPoints = 36; // More points for smoother ellipse
    const points = [];
    
    for (let i = 0; i <= numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      
      // Apply tool offset to the ellipse equation
      // This is a simplification - proper ellipse offsetting is complex
      const offsetRadiusX = offset === 'outside' ? ellipseRadiusX + toolDiameter / 2 : 
                           offset === 'inside' ? Math.max(0, ellipseRadiusX - toolDiameter / 2) : 
                           ellipseRadiusX;
                           
      const offsetRadiusY = offset === 'outside' ? ellipseRadiusY + toolDiameter / 2 : 
                           offset === 'inside' ? Math.max(0, ellipseRadiusY - toolDiameter / 2) : 
                           ellipseRadiusY;
      
      // Skip if any radius is too small
      if (offsetRadiusX <= 0 || offsetRadiusY <= 0) {
        continue;
      }
      
      const x = element.x + offsetRadiusX * Math.cos(angle);
      const y = element.y + offsetRadiusY * Math.sin(angle);
      
      points.push([x, y]);
    }
    
    // Skip if we couldn't generate points
    if (points.length <= 2) {
      gcode += `\n; Z Level: ${actualZ.toFixed(3)} - Offset dimensions too small, skipping\n`;
      continue;
    }
    
    gcode += `\n; Z Level: ${actualZ.toFixed(3)}, X Radius: ${ellipseRadiusX.toFixed(3)}, Y Radius: ${ellipseRadiusY.toFixed(3)}\n`;
    
    // Reverse points for conventional milling if needed
    if (direction === 'conventional') {
      points.reverse();
    }
    
    // Move to first point
    gcode += `G0 X${points[0][0].toFixed(3)} Y${points[0][1].toFixed(3)} Z${(actualZ + 5).toFixed(3)} ; Move above start position\n`;
    gcode += `G1 Z${actualZ.toFixed(3)} F${plungerate} ; Plunge to cutting depth\n`;
    
    // Move along the ellipse points
    for (let i = 1; i < points.length; i++) {
      gcode += `G1 X${points[i][0].toFixed(3)} Y${points[i][1].toFixed(3)} F${feedrate} ; Ellipse point ${i}\n`;
    }
  }
  
  return gcode;
}

/**
 * Generate toolpath for a capsule element
 */
function generateCapsuleToolpath(element: any, settings: any): string {
  const { toolDiameter, depth, stepdown, feedrate, plungerate, offset, direction } = settings;
  
  let gcode = `; Capsule: center (${element.x}, ${element.y}, ${element.z}), radius ${element.radius || 15}mm, height ${element.height || 50}mm, direction ${element.direction || 'z'}\n`;
  
  // Get capsule properties
  const radius = element.radius || 15;
  const height = element.height || 50;
  const capsuleDirection = element.direction || 'z';
  
  // Calculate the cylinder section length (total height minus the two hemispheres)
  const cylinderLength = Math.max(0, height - 2 * radius);
  
  // Calculate the extents of the capsule
  let minX, maxX, minY, maxY, minZ, maxZ;
  
  if (capsuleDirection === 'x') {
    minX = element.x - height / 2;
    maxX = element.x + height / 2;
    minY = element.y - radius;
    maxY = element.y + radius;
    minZ = element.z - radius;
    maxZ = element.z + radius;
  } else if (capsuleDirection === 'y') {
    minX = element.x - radius;
    maxX = element.x + radius;
    minY = element.y - height / 2;
    maxY = element.y + height / 2;
    minZ = element.z - radius;
    maxZ = element.z + radius;
  } else { // z-direction
    minX = element.x - radius;
    maxX = element.x + radius;
    minY = element.y - radius;
    maxY = element.y + radius;
    minZ = element.z - height / 2;
    maxZ = element.z + height / 2;
  }
  
  // Apply offset to the radius
  let effectiveRadius = radius;
  if (offset === 'inside') {
    effectiveRadius = Math.max(0, radius - toolDiameter / 2);
  } else if (offset === 'outside') {
    effectiveRadius = radius + toolDiameter / 2;
  }
  
  // Skip if radius is too small
  if (effectiveRadius <= 0) {
    return `; Capsule radius after offset too small, cannot generate toolpath\n`;
  }
  
  // For each Z level from top to bottom
  for (let z = 0; z > -Math.min(depth, maxZ - minZ); z -= stepdown) {
    const currentZ = Math.max(-Math.min(depth, maxZ - minZ), z);
    const actualZ = maxZ + currentZ;
    
    // Skip if we're below the capsule
    if (actualZ < minZ) {
      continue;
    }
    
    let slice;
    
    if (capsuleDirection === 'z') {
      // For Z-direction capsule, we need to determine if we're in the hemispheres or cylinder part
      if (actualZ > element.z + cylinderLength / 2) {
        // Top hemisphere
        const distFromTop = maxZ - actualZ;
        const radiusAtZ = Math.sqrt(Math.max(0, Math.pow(radius, 2) - Math.pow(radius - distFromTop, 2)));
        slice = { type: 'circle', x: element.x, y: element.y, radius: radiusAtZ };
      } else if (actualZ < element.z - cylinderLength / 2) {
        // Bottom hemisphere
        const distFromBottom = actualZ - minZ;
        const radiusAtZ = Math.sqrt(Math.max(0, Math.pow(radius, 2) - Math.pow(radius - distFromBottom, 2)));
        slice = { type: 'circle', x: element.x, y: element.y, radius: radiusAtZ };
      } else {
        // Cylinder part
        slice = { type: 'circle', x: element.x, y: element.y, radius: radius };
      }
    } else if (capsuleDirection === 'y') {
      // For Y-direction capsule, we need to determine the slice shape based on Z position
      // This is a simplification - for exact Y-axis capsule, we would need more complex calculations
      slice = { type: 'ellipse', x: element.x, y: element.y, radiusX: radius, radiusY: height / 2 };
    } else { // x-direction
      // For X-direction capsule, we need to determine the slice shape based on Z position
      // This is a simplification - for exact X-axis capsule, we would need more complex calculations
      slice = { type: 'ellipse', x: element.x, y: element.y, radiusX: height / 2, radiusY: radius };
    }
    
    gcode += `\n; Z Level: ${actualZ.toFixed(3)}, Slice type: ${slice.type}\n`;
    
    if (slice.type === 'circle') {
      // Generate circle toolpath
      const points = [];
      const numPoints = 36;
      
      for (let i = 0; i <= numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const x = slice.x + effectiveRadius * Math.cos(angle);
        const y = slice.y + effectiveRadius * Math.sin(angle);
        points.push([x, y]);
      }
      
      // Reverse for conventional milling if needed
      if (direction === 'conventional') {
        points.reverse();
      }
      
      // Move to first point
      gcode += `G0 X${points[0][0].toFixed(3)} Y${points[0][1].toFixed(3)} Z${(actualZ + 5).toFixed(3)} ; Move above start position\n`;
      gcode += `G1 Z${actualZ.toFixed(3)} F${plungerate} ; Plunge to cutting depth\n`;
      
      // Move along the circle
      for (let i = 1; i < points.length; i++) {
        gcode += `G1 X${points[i][0].toFixed(3)} Y${points[i][1].toFixed(3)} F${feedrate} ; Circle point ${i}\n`;
      }
    } else { // ellipse
      // Generate ellipse toolpath
      const points = [];
      const numPoints = 36;
      
      for (let i = 0; i <= numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const x = slice.x + slice.radiusX * Math.cos(angle);
        const y = slice.y + slice.radiusY * Math.sin(angle);
        points.push([x, y]);
      }
      
      // Reverse for conventional milling if needed
      if (direction === 'conventional') {
        points.reverse();
      }
      
      // Move to first point
      gcode += `G0 X${points[0][0].toFixed(3)} Y${points[0][1].toFixed(3)} Z${(actualZ + 5).toFixed(3)} ; Move above start position\n`;
      gcode += `G1 Z${actualZ.toFixed(3)} F${plungerate} ; Plunge to cutting depth\n`;
      
      // Move along the ellipse
      for (let i = 1; i < points.length; i++) {
        gcode += `G1 X${points[i][0].toFixed(3)} Y${points[i][1].toFixed(3)} F${feedrate} ; Ellipse point ${i}\n`;
      }
    }
  }
  
  return gcode;
}

/**
 * Generate toolpath for a triangle element
 */
function generateTriangleToolpath(element: any, settings: any): string {
  const { toolDiameter, depth, stepdown, feedrate, plungerate, offset, direction } = settings;
  
  // Check if we have array of points or individual point coordinates
  const hasPoints = element.points && Array.isArray(element.points) && element.points.length >= 3;
  const hasCoordinates = element.x1 !== undefined && element.y1 !== undefined &&
                         element.x2 !== undefined && element.y2 !== undefined &&
                         element.x3 !== undefined && element.y3 !== undefined;
  
  if (!hasPoints && !hasCoordinates) {
    return `; Triangle missing points or coordinates\n`;
  }
  
  // Determine the triangle points
  let points;
  
  if (hasPoints) {
    points = element.points.slice(0, 3);
  } else {
    points = [
      { x: element.x1, y: element.y1, z: element.z1 || element.z || 0 },
      { x: element.x2, y: element.y2, z: element.z2 || element.z || 0 },
      { x: element.x3, y: element.y3, z: element.z3 || element.z || 0 }
    ];
  }
  
  let gcode = `; Triangle: points [(${points[0].x}, ${points[0].y}), (${points[1].x}, ${points[1].y}), (${points[2].x}, ${points[2].y})]\n`;
  
  // Calculate the depth range
  const zValues = points.map((p: {x: number, y: number, z?: number}) => p.z || 0);
  const maxZ = Math.max(...zValues);
  const minZ = Math.min(...zValues);
  const triangleDepth = maxZ - minZ;
  
  // Convert points to the format expected by the rest of the code
  const trianglePoints = points.map((p: {x: number, y: number, z?: number}) => [p.x, p.y]);
  trianglePoints.push(trianglePoints[0]); // Close the loop
  
  // Apply offset if needed
  let offsetPoints = trianglePoints;
  
  if (offset !== 'center') {
    const newOffsetPoints = offsetPolygon(trianglePoints, offset === 'outside' ? toolDiameter / 2 : -toolDiameter / 2);
    
    // Check if offset was successful
    if (newOffsetPoints && newOffsetPoints.length >= 3) {
      offsetPoints = newOffsetPoints;
    } else {
      gcode += `; Could not apply offset to triangle, using original points\n`;
    }
  }
  
  // For each Z level
  for (let z = 0; z > -Math.min(depth, triangleDepth); z -= stepdown) {
    const currentZ = Math.max(-Math.min(depth, triangleDepth), z);
    const actualZ = maxZ + currentZ;
    
    gcode += `\n; Z Level: ${actualZ.toFixed(3)}\n`;
    
    // Make a copy of the points for this level
    let levelPoints = [...offsetPoints];
    
    // Reverse for conventional milling if needed
    if (direction === 'conventional') {
      levelPoints.reverse();
    }
    
    // Move to first point
    gcode += `G0 X${levelPoints[0][0].toFixed(3)} Y${levelPoints[0][1].toFixed(3)} Z${(actualZ + 5).toFixed(3)} ; Move above start position\n`;
    gcode += `G1 Z${actualZ.toFixed(3)} F${plungerate} ; Plunge to cutting depth\n`;
    
    // Move along the triangle
    for (let i = 1; i < levelPoints.length; i++) {
      gcode += `G1 X${levelPoints[i][0].toFixed(3)} Y${levelPoints[i][1].toFixed(3)} F${feedrate} ; Point ${i}\n`;
    }
  }
  
  return gcode;
}

/**
 * Helper function to offset a polygon by a distance
 * Positive distance offsets outward, negative offsets inward
 * This is a simplified algorithm and may not work for all polygons
 */
function offsetPolygon(points: number[][], distance: number): number[][] | null {
  // If there are not enough points, return null
  if (points.length < 3) {
    return null;
  }
  
  // Calculate the centroid of the polygon
  const centroid = calculateCentroid(points);
  
  // Create a new array for the offset points
  const offsetPoints: number[][] = [];
  
  // Process each point
  for (let i = 0; i < points.length; i++) {
    // Get the current point
    const point = points[i];
    
    // Calculate the direction from the centroid to the point
    const dx = point[0] - centroid[0];
    const dy = point[1] - centroid[1];
    
    // Calculate the length of the vector
    const length = Math.sqrt(dx * dx + dy * dy);
    
    // Skip if the point is too close to the centroid
    if (length < 0.0001) {
      continue;
    }
    
    // Calculate the unit vector
    const ux = dx / length;
    const uy = dy / length;
    
    // Calculate the offset point
    const offsetX = point[0] + ux * distance;
    const offsetY = point[1] + uy * distance;
    
    // Add the offset point
    offsetPoints.push([offsetX, offsetY]);
  }
  
  // If we don't have enough points after offsetting, return null
  if (offsetPoints.length < 3) {
    return null;
  }
  
  // Close the loop if needed
  if (offsetPoints.length > 0 && 
     (offsetPoints[0][0] !== offsetPoints[offsetPoints.length - 1][0] || 
      offsetPoints[0][1] !== offsetPoints[offsetPoints.length - 1][1])) {
    offsetPoints.push([...offsetPoints[0]]);
  }
  
  return offsetPoints;
}

/**
 * Helper function to calculate the centroid of a polygon
 */
function calculateCentroid(points: number[][]): number[] {
  let sumX = 0;
  let sumY = 0;
  
  // Skip the last point if it's the same as the first (closed loop)
  const count = points.length > 1 && 
               points[0][0] === points[points.length - 1][0] && 
               points[0][1] === points[points.length - 1][1] 
               ? points.length - 1 : points.length;
  
  for (let i = 0; i < count; i++) {
    sumX += points[i][0];
    sumY += points[i][1];
  }
  
  return [sumX / count, sumY / count];
}

/**
 * Generate toolpath for an arc element
 */
function generateArcToolpath(element: any, settings: any): string {
  const { toolDiameter, depth, stepdown, feedrate, plungerate, offset, direction } = settings;
  
  let gcode = `; Arc: center (${element.x}, ${element.y}, ${element.z}), radius ${element.radius}mm, startAngle ${element.startAngle || 0}°, endAngle ${element.endAngle || 360}°\n`;
  
  // Get arc properties
  const radius = element.radius || 25;
  const startAngle = (element.startAngle || 0) * Math.PI / 180; // Convert to radians
  const endAngle = (element.endAngle || 360) * Math.PI / 180; // Convert to radians
  const clockwise = direction === 'climb'; // Climb milling uses G3 (clockwise)
  
  // Apply offset to the radius
  let effectiveRadius = radius;
  if (offset === 'inside') {
    effectiveRadius = Math.max(0, radius - toolDiameter / 2);
  } else if (offset === 'outside') {
    effectiveRadius = radius + toolDiameter / 2;
  }
  
  // Skip if radius is too small
  if (effectiveRadius <= 0) {
    return `; Arc radius after offset too small, cannot generate toolpath\n`;
  }
  
  // For each Z level
  for (let z = 0; z > -depth; z -= stepdown) {
    const currentZ = Math.max(-depth, z);
    const actualZ = element.z + currentZ;
    
    gcode += `\n; Z Level: ${actualZ.toFixed(3)}\n`;
    
    // Calculate start and end points of the arc
    const startX = element.x + effectiveRadius * Math.cos(startAngle);
    const startY = element.y + effectiveRadius * Math.sin(startAngle);
    const endX = element.x + effectiveRadius * Math.cos(endAngle);
    const endY = element.y + effectiveRadius * Math.sin(endAngle);
    
    // Move to start point
    gcode += `G0 X${startX.toFixed(3)} Y${startY.toFixed(3)} Z${(actualZ + 5).toFixed(3)} ; Move above start position\n`;
    gcode += `G1 Z${actualZ.toFixed(3)} F${plungerate} ; Plunge to cutting depth\n`;
    
    // Calculate I and J values for arc
    const i = element.x - startX; // Distance from start point to center in X
    const j = element.y - startY; // Distance from start point to center in Y
    
    // If start and end angles are the same or differ by 360 degrees (full circle)
    if (Math.abs(startAngle - endAngle) < 0.001 || Math.abs(Math.abs(startAngle - endAngle) - 2 * Math.PI) < 0.001) {
      // Full circle
      if (clockwise) {
        gcode += `G3 X${startX.toFixed(3)} Y${startY.toFixed(3)} I${i.toFixed(3)} J${j.toFixed(3)} F${feedrate} ; Clockwise full circle\n`;
      } else {
        gcode += `G2 X${startX.toFixed(3)} Y${startY.toFixed(3)} I${i.toFixed(3)} J${j.toFixed(3)} F${feedrate} ; Counter-clockwise full circle\n`;
      }
    } else {
      // Partial arc
      if (clockwise) {
        gcode += `G3 X${endX.toFixed(3)} Y${endY.toFixed(3)} I${i.toFixed(3)} J${j.toFixed(3)} F${feedrate} ; Clockwise arc\n`;
      } else {
        gcode += `G2 X${endX.toFixed(3)} Y${endY.toFixed(3)} I${i.toFixed(3)} J${j.toFixed(3)} F${feedrate} ; Counter-clockwise arc\n`;
      }
    }
  }
  
  return gcode;
}

/**
 * Generate toolpath for an ellipse element
 */
function generateEllipseToolpath(element: any, settings: any): string {
  const { toolDiameter, depth, stepdown, feedrate, plungerate, offset, direction } = settings;
  
  let gcode = `; Ellipse: center (${element.x}, ${element.y}, ${element.z}), radiusX ${element.radiusX || element.width/2 || 25}mm, radiusY ${element.radiusY || element.height/2 || 15}mm\n`;
  
  // Get ellipse properties
  const radiusX = element.radiusX || element.width/2 || 25;
  const radiusY = element.radiusY || element.height/2 || 15;
  
  // We need to approximate the ellipse with line segments for the G-code
  // Generate points along the ellipse
  const numPoints = 72; // More points for smoother ellipse
  
  // For each Z level
  for (let z = 0; z > -depth; z -= stepdown) {
    const currentZ = Math.max(-depth, z);
    const actualZ = element.z + currentZ;
    
    gcode += `\n; Z Level: ${actualZ.toFixed(3)}\n`;
    
    // Apply tool offset to the ellipse equation (simplified approach)
    const offsetRadiusX = offset === 'outside' ? radiusX + toolDiameter / 2 : 
                         offset === 'inside' ? Math.max(0, radiusX - toolDiameter / 2) : 
                         radiusX;
                         
    const offsetRadiusY = offset === 'outside' ? radiusY + toolDiameter / 2 : 
                         offset === 'inside' ? Math.max(0, radiusY - toolDiameter / 2) : 
                         radiusY;
    
    // Skip if any radius is too small
    if (offsetRadiusX <= 0 || offsetRadiusY <= 0) {
      gcode += `; Offset dimensions too small, skipping this Z level\n`;
      continue;
    }
    
    // Generate points for ellipse
    const points = [];
    for (let i = 0; i <= numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const x = element.x + offsetRadiusX * Math.cos(angle);
      const y = element.y + offsetRadiusY * Math.sin(angle);
      points.push([x, y]);
    }
    
    // Reverse points for conventional milling if needed
    if (direction === 'conventional') {
      points.reverse();
    }
    
    // Move to first point
    gcode += `G0 X${points[0][0].toFixed(3)} Y${points[0][1].toFixed(3)} Z${(actualZ + 5).toFixed(3)} ; Move above start position\n`;
    gcode += `G1 Z${actualZ.toFixed(3)} F${plungerate} ; Plunge to cutting depth\n`;
    
    // Move along the ellipse points
    for (let i = 1; i < points.length; i++) {
      gcode += `G1 X${points[i][0].toFixed(3)} Y${points[i][1].toFixed(3)} F${feedrate} ; Ellipse point ${i}\n`;
    }
  }
  
  return gcode;
}

/**
 * Generate toolpath for a 3D text element
 */
function generateText3DToolpath(element: any, settings: any): string {
  const { toolDiameter, depth, stepdown, feedrate, plungerate } = settings;
  
  let gcode = `; 3D Text: position (${element.x}, ${element.y}, ${element.z}), text "${element.text || ''}", height ${element.height || 10}mm, depth ${element.depth || 5}mm\n`;
  
  // This is a simplified approximation for text
  // In a real implementation, you would need to:
  // 1. Convert the text to paths/outlines
  // 2. Generate toolpaths for each character
  
  // Get text properties
  const text = element.text || '';
  const textHeight = element.height || 10;
  const textDepth = element.depth || 5;
  
  // Skip if no text
  if (!text) {
    return `; No text content provided\n`;
  }
  
  gcode += `; Note: Text toolpath is approximated - for production use, convert text to paths first\n`;
  
  // For each Z level
  for (let z = 0; z > -Math.min(depth, textDepth); z -= stepdown) {
    const currentZ = Math.max(-Math.min(depth, textDepth), z);
    const actualZ = element.z + currentZ;
    
    gcode += `\n; Z Level: ${actualZ.toFixed(3)}\n`;
    
    // Approximate the text bounds
    const textWidth = text.length * textHeight * 0.6; // Rough estimate of text width
    
    // Generate a box around the text area
    const left = element.x;
    const right = element.x + textWidth;
    const top = element.y + textHeight;
    const bottom = element.y;
    
    // Simple rectangular outline for text bounds (placeholder)
    gcode += `G0 X${left.toFixed(3)} Y${bottom.toFixed(3)} Z${(actualZ + 5).toFixed(3)} ; Move above start position\n`;
    gcode += `G1 Z${actualZ.toFixed(3)} F${plungerate} ; Plunge to cutting depth\n`;
    gcode += `G1 X${right.toFixed(3)} Y${bottom.toFixed(3)} F${feedrate} ; Bottom edge\n`;
    gcode += `G1 X${right.toFixed(3)} Y${top.toFixed(3)} F${feedrate} ; Right edge\n`;
    gcode += `G1 X${left.toFixed(3)} Y${top.toFixed(3)} F${feedrate} ; Top edge\n`;
    gcode += `G1 X${left.toFixed(3)} Y${bottom.toFixed(3)} F${feedrate} ; Left edge\n`;
    
    // Add note about how text would actually be machined
    gcode += `; Note: For actual text engraving, each character would need to be converted to paths\n`;
    gcode += `; Characters would be machined individually with appropriate tool movement\n`;
  }
  
  gcode += `; For production text machining, please export text as SVG or DXF and import as paths\n`;
  
  return gcode;
}