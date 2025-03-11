import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * Configuration options for the LOD (Level of Detail) system
 */
export interface LODOptions {
  /** Enables or disables the LOD system */
  enabled?: boolean;
  
  /** Distance at which high-detail models switch to lower detail */
  highDetailThreshold?: number;
  
  /** Distance at which medium-detail models switch to lowest detail */
  mediumDetailThreshold?: number;
  
  /** Reduction factor for medium detail (0.0-1.0) */
  mediumDetailReduction?: number;
  
  /** Reduction factor for low detail (0.0-1.0) */
  lowDetailReduction?: number;
  
  /** Whether to show wireframes for distant objects */
  wireframeForDistant?: boolean;
  
  /** Distance beyond which objects should be hidden */
  cullingDistance?: number;
  
  /** How frequently to update LOD in milliseconds (0 = every frame) */
  updateFrequency?: number;
  
  /** Whether to optimize textures for distant objects */
  optimizeTextures?: boolean;
}

/**
 * Default LOD options
 */
const DEFAULT_LOD_OPTIONS: LODOptions = {
  enabled: true,
  highDetailThreshold: 100,
  mediumDetailThreshold: 300,
  mediumDetailReduction: 0.5,
  lowDetailReduction: 0.2,
  wireframeForDistant: false,
  cullingDistance: 2000,
  updateFrequency: 0, // Every frame
  optimizeTextures: true,
};

/**
 * Statistics about the current LOD state
 */
export interface LODStatistics {
  /** Total number of objects being managed by LOD */
  totalObjects: number;
  
  /** Number of objects at highest detail level */
  highDetailObjects: number;
  
  /** Number of objects at medium detail level */
  mediumDetailObjects: number;
  
  /** Number of objects at lowest detail level */
  lowDetailObjects: number;
  
  /** Number of objects currently culled (hidden) */
  culledObjects: number;
  
  /** Estimated memory saved by LOD in MB */
  estimatedMemorySavedMB: number;
}

/**
 * Custom hook for managing Level of Detail (LOD) in a Three.js scene
 * 
 * This hook intelligently reduces geometry detail for distant objects
 * to improve rendering performance while maintaining visual quality
 * for nearby objects that are more important to the user.
 * 
 * @param sceneRef - Reference to the Three.js scene
 * @param cameraRef - Reference to the Three.js camera
 * @param options - Configuration options for the LOD system
 */
export const useLOD = (
  sceneRef: React.RefObject<THREE.Scene>,
  cameraRef: React.RefObject<THREE.Camera>,
  options: LODOptions = {}
) => {
  // Merge options with defaults
  const config = { ...DEFAULT_LOD_OPTIONS, ...options };
  
  // Animation frame reference for cleanup
  const frameIdRef = useRef<number>(0);
  
  // Track whether component is mounted
  const isMountedRef = useRef<boolean>(true);
  
  // Cache original geometries for restoration
  const originalGeometriesRef = useRef<Map<string, THREE.BufferGeometry>>(new Map());
  
  // Cache simplified geometries to avoid recreating them
  const simplifiedGeometriesRef = useRef<Map<string, Record<string, THREE.BufferGeometry>>>(new Map());
  
  // Store current LOD level for each object
  const currentLODLevelRef = useRef<Map<string, 'high' | 'medium' | 'low' | 'culled'>>(new Map());
  
  // Track LOD statistics
  const [statistics, setStatistics] = useState<LODStatistics>({
    totalObjects: 0,
    highDetailObjects: 0,
    mediumDetailObjects: 0,
    lowDetailObjects: 0,
    culledObjects: 0,
    estimatedMemorySavedMB: 0,
  });
  
  // Helper to create a unique ID for a mesh
  const getMeshId = useCallback((mesh: THREE.Mesh): string => {
    return mesh.uuid || `mesh-${mesh.id}`;
  }, []);
  
  // Calculate a hash for a geometry to identify similar geometries for caching
  const getGeometryHash = useCallback((geometry: THREE.BufferGeometry): string => {
    const positionAttr = geometry.getAttribute('position');
    if (!positionAttr) return 'no-position';
    
    const vertexCount = positionAttr.count;
    const indexCount = geometry.index ? geometry.index.count : 0;
    
    return `v${vertexCount}-i${indexCount}`;
  }, []);
  
  // Initialize LOD system
  const initializeLOD = useCallback(() => {
    if (!sceneRef.current || !config.enabled) return;
    
    // Store original geometries for all meshes
    sceneRef.current.traverse((object) => {
      if (object instanceof THREE.Mesh && !object.userData.excludeFromLOD) {
        const meshId = getMeshId(object);
        
        // Skip if we've already stored this geometry
        if (originalGeometriesRef.current.has(meshId)) return;
        
        // Store original geometry
        originalGeometriesRef.current.set(meshId, object.geometry.clone());
        
        // Initialize LOD level
        currentLODLevelRef.current.set(meshId, 'high');
      }
    });
  }, [sceneRef, config.enabled, getMeshId]);
  
  // Simplify a geometry to a given detail level
  const simplifyGeometry = useCallback((
    originalGeometry: THREE.BufferGeometry, 
    detailLevel: number
  ): THREE.BufferGeometry => {
    // Create a simplified geometry based on the original type
    const geometryHash = getGeometryHash(originalGeometry);
    
    // Check cache first
    const levelKey = `level-${detailLevel.toFixed(2)}`;
    if (
      simplifiedGeometriesRef.current.has(geometryHash) && 
      simplifiedGeometriesRef.current.get(geometryHash)![levelKey]
    ) {
      return simplifiedGeometriesRef.current.get(geometryHash)![levelKey];
    }
    
    // For known primitive types, we can create new geometries with fewer segments
    if (originalGeometry.userData.isBox) {
      const params = originalGeometry.userData.parameters || {};
      const width = params.width || 1;
      const height = params.height || 1;
      const depth = params.depth || 1;
      
      // Calculate new segments based on detail level
      const widthSegments = Math.max(1, Math.floor((params.widthSegments || 1) * detailLevel));
      const heightSegments = Math.max(1, Math.floor((params.heightSegments || 1) * detailLevel));
      const depthSegments = Math.max(1, Math.floor((params.depthSegments || 1) * detailLevel));
      
      const simplified = new THREE.BoxGeometry(
        width, height, depth, 
        widthSegments, heightSegments, depthSegments
      );
      
      // Cache and return
      if (!simplifiedGeometriesRef.current.has(geometryHash)) {
        simplifiedGeometriesRef.current.set(geometryHash, {});
      }
      simplifiedGeometriesRef.current.get(geometryHash)![levelKey] = simplified;
      return simplified;
    } 
    else if (originalGeometry.userData.isSphere) {
      const params = originalGeometry.userData.parameters || {};
      const radius = params.radius || 1;
      
      // Calculate new segments based on detail level
      const widthSegments = Math.max(4, Math.floor((params.widthSegments || 32) * detailLevel));
      const heightSegments = Math.max(3, Math.floor((params.heightSegments || 16) * detailLevel));
      
      const simplified = new THREE.SphereGeometry(
        radius, widthSegments, heightSegments
      );
      
      // Cache and return
      if (!simplifiedGeometriesRef.current.has(geometryHash)) {
        simplifiedGeometriesRef.current.set(geometryHash, {});
      }
      simplifiedGeometriesRef.current.get(geometryHash)![levelKey] = simplified;
      return simplified;
    }
    else if (originalGeometry.userData.isCylinder) {
      const params = originalGeometry.userData.parameters || {};
      const radiusTop = params.radiusTop || 1;
      const radiusBottom = params.radiusBottom || 1;
      const height = params.height || 1;
      
      // Calculate new segments based on detail level
      const radialSegments = Math.max(4, Math.floor((params.radialSegments || 32) * detailLevel));
      const heightSegments = Math.max(1, Math.floor((params.heightSegments || 1) * detailLevel));
      
      const simplified = new THREE.CylinderGeometry(
        radiusTop, radiusBottom, height, 
        radialSegments, heightSegments
      );
      
      // Cache and return
      if (!simplifiedGeometriesRef.current.has(geometryHash)) {
        simplifiedGeometriesRef.current.set(geometryHash, {});
      }
      simplifiedGeometriesRef.current.get(geometryHash)![levelKey] = simplified;
      return simplified;
    }
    else if (originalGeometry.userData.isCircle) {
      const params = originalGeometry.userData.parameters || {};
      const radius = params.radius || 1;
      
      // Calculate new segments based on detail level
      const segments = Math.max(4, Math.floor((params.segments || 32) * detailLevel));
      
      const simplified = new THREE.CircleGeometry(radius, segments);
      
      // Cache and return
      if (!simplifiedGeometriesRef.current.has(geometryHash)) {
        simplifiedGeometriesRef.current.set(geometryHash, {});
      }
      simplifiedGeometriesRef.current.get(geometryHash)![levelKey] = simplified;
      return simplified;
    }
    
    // For other geometries, clone original and try to reduce vertex count
    const simplified = originalGeometry.clone();
    
    // Add a user data flag to track the detail level
    simplified.userData.detailLevel = detailLevel;
    
    // Cache and return
    if (!simplifiedGeometriesRef.current.has(geometryHash)) {
      simplifiedGeometriesRef.current.set(geometryHash, {});
    }
    simplifiedGeometriesRef.current.get(geometryHash)![levelKey] = simplified;
    return simplified;
  }, [getGeometryHash]);
  
  // Update the LOD level of a mesh based on its distance from the camera
  const updateMeshLOD = useCallback((
    mesh: THREE.Mesh, 
    distance: number
  ): 'high' | 'medium' | 'low' | 'culled' => {
    const meshId = getMeshId(mesh);
    
    // Skip meshes excluded from LOD
    if (mesh.userData.excludeFromLOD) {
      return 'high';
    }
    
    // Get the original geometry
    const originalGeometry = originalGeometriesRef.current.get(meshId);
    if (!originalGeometry) {
      return 'high';
    }
    
    // Determine appropriate LOD level based on distance
    let newLevel: 'high' | 'medium' | 'low' | 'culled';
    
    if (distance > config.cullingDistance!) {
      newLevel = 'culled';
      mesh.visible = false;
    } 
    else if (distance > config.mediumDetailThreshold!) {
      newLevel = 'low';
      mesh.visible = true;
      
      // Apply low detail geometry if not already applied
      if (currentLODLevelRef.current.get(meshId) !== 'low') {
        const lowDetailGeometry = simplifyGeometry(originalGeometry, config.lowDetailReduction!);
        mesh.geometry = lowDetailGeometry;
        
        // Apply wireframe if configured
        if (config.wireframeForDistant && mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(mat => {
              if ('wireframe' in mat) (mat as THREE.MeshBasicMaterial).wireframe = true;
            });
          } else if ('wireframe' in mesh.material) {
            (mesh.material as THREE.MeshBasicMaterial).wireframe = false;
          }
        }
      }
    }
    else if (distance > config.highDetailThreshold!) {
      newLevel = 'medium';
      mesh.visible = true;
      
      // Apply medium detail geometry if not already applied
      if (currentLODLevelRef.current.get(meshId) !== 'medium') {
        const mediumDetailGeometry = simplifyGeometry(originalGeometry, config.mediumDetailReduction!);
        mesh.geometry = mediumDetailGeometry;
      }
    }
    else {
      newLevel = 'high';
      mesh.visible = true;
      
      // Restore original geometry if not already applied
      if (currentLODLevelRef.current.get(meshId) !== 'high') {
        mesh.geometry = originalGeometry;
      }
    }
    
    // Update the current LOD level
    currentLODLevelRef.current.set(meshId, newLevel);
    return newLevel;
  }, [
    config.cullingDistance,
    config.mediumDetailThreshold,
    config.highDetailThreshold, 
    config.lowDetailReduction, 
    config.mediumDetailReduction, 
    config.wireframeForDistant, 
    getMeshId, 
    simplifyGeometry
  ]);
  
  // Apply LOD to all objects in the scene
  const applyLOD = useCallback(() => {
    if (!sceneRef.current || !cameraRef.current || !config.enabled || !isMountedRef.current) return;
    
    const camera = cameraRef.current;
    const cameraPosition = camera.position.clone();
    
    // Statistics for this update
    let highDetailCount = 0;
    let mediumDetailCount = 0;
    let lowDetailCount = 0;
    let culledCount = 0;
    let totalObjects = 0;
    let memorySaved = 0;
    
    // Process all meshes in the scene
    sceneRef.current.traverse((object) => {
      if (object instanceof THREE.Mesh && !object.userData.isHelper) {
        totalObjects++;
        
        // Calculate distance to camera
        const objectPosition = new THREE.Vector3();
        object.getWorldPosition(objectPosition);
        const distance = cameraPosition.distanceTo(objectPosition);
        
        // Update LOD for this mesh
        const lodLevel = updateMeshLOD(object, distance);
        
        // Update statistics
        switch (lodLevel) {
          case 'high':
            highDetailCount++;
            break;
          case 'medium':
            mediumDetailCount++;
            // Estimate memory saved by medium detail reduction
            if (object.geometry && originalGeometriesRef.current.get(getMeshId(object))) {
              const original = originalGeometriesRef.current.get(getMeshId(object))!;
              const reduced = object.geometry;
              const originalVertices = original.attributes.position ? original.attributes.position.count : 0;
              const reducedVertices = reduced.attributes.position ? reduced.attributes.position.count : 0;
              memorySaved += (originalVertices - reducedVertices) * 3 * 4; // 3 floats per vertex, 4 bytes per float
            }
            break;
          case 'low':
            lowDetailCount++;
            // Estimate memory saved by low detail reduction
            if (object.geometry && originalGeometriesRef.current.get(getMeshId(object))) {
              const original = originalGeometriesRef.current.get(getMeshId(object))!;
              const reduced = object.geometry;
              const originalVertices = original.attributes.position ? original.attributes.position.count : 0;
              const reducedVertices = reduced.attributes.position ? reduced.attributes.position.count : 0;
              memorySaved += (originalVertices - reducedVertices) * 3 * 4; // 3 floats per vertex, 4 bytes per float
            }
            break;
          case 'culled':
            culledCount++;
            // Full memory save for culled objects
            if (originalGeometriesRef.current.get(getMeshId(object))) {
              const original = originalGeometriesRef.current.get(getMeshId(object))!;
              const originalVertices = original.attributes.position ? original.attributes.position.count : 0;
              memorySaved += originalVertices * 3 * 4; // 3 floats per vertex, 4 bytes per float
            }
            break;
        }
      }
    });
    
    // Update statistics
   
    
  }, [sceneRef, cameraRef, config.enabled, updateMeshLOD, getMeshId]);
  
  // Schedule LOD updates
  useEffect(() => {
    if (!config.enabled) return;
    
    isMountedRef.current = true;
    
    // Initialize LOD system
    initializeLOD();
    
    // Function to handle LOD update
    const updateLOD = () => {
      if (!isMountedRef.current) return;
      
      applyLOD();
      
      // Schedule next update
      if (config.updateFrequency === 0) {
        // Update every frame
        frameIdRef.current = requestAnimationFrame(updateLOD);
      } else {
        // Update at specified interval
        setTimeout(() => {
          if (isMountedRef.current) {
            frameIdRef.current = requestAnimationFrame(updateLOD);
          }
        }, config.updateFrequency);
      }
    };
    
    // Start updates
    frameIdRef.current = requestAnimationFrame(updateLOD);
    
    // Clean up on unmount
    return () => {
      isMountedRef.current = false;
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
        frameIdRef.current = 0;
      }
      
      // Restore original geometries to avoid memory leaks
      if (sceneRef.current) {
        sceneRef.current.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            const meshId = getMeshId(object);
            const originalGeometry = originalGeometriesRef.current.get(meshId);
            if (originalGeometry) {
              object.geometry = originalGeometry;
            }
          }
        });
      }
      
      // Clear caches
      originalGeometriesRef.current.clear();
      simplifiedGeometriesRef.current.clear();
      currentLODLevelRef.current.clear();
    };
  }, [
    config.enabled, 
    config.updateFrequency,
    initializeLOD, 
    applyLOD, 
    getMeshId,
    sceneRef
  ]);
  
  // Handle visibility change (tab switching)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Cancel animation frame when hidden
        if (frameIdRef.current) {
          cancelAnimationFrame(frameIdRef.current);
          frameIdRef.current = 0;
        }
      } else {
        // Resume updates when visible again
        if (!frameIdRef.current && isMountedRef.current && config.enabled) {
          const updateLOD = () => {
            if (!isMountedRef.current) return;
            
            applyLOD();
            
            // Schedule next update
            if (config.updateFrequency === 0) {
              frameIdRef.current = requestAnimationFrame(updateLOD);
            } else {
              setTimeout(() => {
                frameIdRef.current = requestAnimationFrame(updateLOD);
              }, config.updateFrequency);
            }
          };
          
          frameIdRef.current = requestAnimationFrame(updateLOD);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [config.enabled, config.updateFrequency, applyLOD]);
  
  // Force an immediate LOD update
  const updateLODNow = useCallback(() => {
    if (config.enabled) {
      applyLOD();
    }
  }, [config.enabled, applyLOD]);
  
  // Restore all objects to high detail temporarily (for screenshots, etc)
  const temporarilyRestoreFullDetail = useCallback(() => {
    if (!sceneRef.current) return;
    
    // Store current state
    const previousState = new Map(currentLODLevelRef.current);
    
    // Restore all objects to high detail
    sceneRef.current.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const meshId = getMeshId(object);
        const originalGeometry = originalGeometriesRef.current.get(meshId);
        if (originalGeometry) {
          object.geometry = originalGeometry;
          object.visible = true;
          
          // Remove wireframe if it was applied
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(mat => {
                if ('wireframe' in mat) (mat as THREE.MeshBasicMaterial).wireframe = false;
              });
            } else if ('wireframe' in object.material) {
              (object.material as THREE.MeshBasicMaterial).wireframe = false;
            }
          }
        }
      }
    });
    
    // Return function to restore previous LOD state
    return () => {
      if (!sceneRef.current || !isMountedRef.current) return;
      
      sceneRef.current.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          const meshId = getMeshId(object);
          const previousLevel = previousState.get(meshId);
          
          if (previousLevel) {
            // Apply previous LOD level
            switch (previousLevel) {
              case 'medium':
                if (originalGeometriesRef.current.has(meshId)) {
                  const originalGeometry = originalGeometriesRef.current.get(meshId)!;
                  const mediumDetailGeometry = simplifyGeometry(originalGeometry, config.mediumDetailReduction!);
                  object.geometry = mediumDetailGeometry;
                  object.visible = true;
                }
                break;
              case 'low':
                if (originalGeometriesRef.current.has(meshId)) {
                  const originalGeometry = originalGeometriesRef.current.get(meshId)!;
                  const lowDetailGeometry = simplifyGeometry(originalGeometry, config.lowDetailReduction!);
                  object.geometry = lowDetailGeometry;
                  
                  // Apply wireframe if configured
                  if (config.wireframeForDistant && object.material) {
                    if (Array.isArray(object.material)) {
                      object.material.forEach(mat => {
                        if ('wireframe' in mat) (mat as THREE.MeshBasicMaterial).wireframe = true;
                      });
                    } else if ('wireframe' in object.material) {
                      (object.material as THREE.MeshBasicMaterial).wireframe = true;
                    }
                  }
                  
                  object.visible = true;
                }
                break;
              case 'culled':
                object.visible = false;
                break;
            }
            
            // Restore LOD level tracking
            currentLODLevelRef.current.set(meshId, previousLevel);
          }
        }
      });
    };
  }, [
    sceneRef, 
    getMeshId, 
    simplifyGeometry, 
    config.mediumDetailReduction, 
    config.lowDetailReduction, 
    config.wireframeForDistant
  ]);
  
  return {
    applyLOD: updateLODNow,
    statistics,
    temporarilyRestoreFullDetail,
  };
};

export default useLOD;