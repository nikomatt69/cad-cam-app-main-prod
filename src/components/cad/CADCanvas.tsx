import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import { useCADStore } from 'src/store/cadStore';
import { useElementsStore } from 'src/store/elementsStore';
import { useLayerStore } from 'src/store/layerStore';
import { HelpCircle, Maximize, Maximize2, Minimize2, Move, RotateCw } from 'react-feather';
import { predefinedComponents } from '@/src/lib/predefinedLibraries';
import { transformLibraryItemToCADElement, createComponentPreview } from '@/src/lib/libraryTransform';
import SnapIndicator from './SnapIndicator';
import { useSnap } from '@/src/hooks/useSnap';
import { useLOD } from 'src/hooks/canvas/useLod';
import { useThreePerformance } from 'src/hooks/canvas/useThreePerformance';
import { useCADKeyboardShortcuts } from 'src/hooks/useCADKeyboardShortcuts';
import DragDropIndicator from './DragDropIndicator';
import KeyboardShortcutsDialog from './KeyboardShortcutsDialog';
import ShortcutsDialog from '../ShortcutsDialog';


interface CADCanvasProps {
  width?: string | number;
  height?: string | number;
  previewComponent?: string | null;
  onComponentPlaced?: (component: string, position: {x: number, y: number, z: number}) => void;
  allowDragDrop?: boolean; // Nuova prop per abilitare il drag & drop
}

const CADCanvas: React.FC<CADCanvasProps> = ({ 
  width = '100%', 
  height = '100%',
  previewComponent = null,
  onComponentPlaced,
  allowDragDrop = true 
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const controlPointsRef = useRef<THREE.Object3D[]>([]);
  const { snapToPoint, snapIndicator, snapSettings } = useSnap();
  const [previewObject, setPreviewObject] = useState<THREE.Object3D | null>(null);
  const { viewMode, gridVisible, axisVisible, originOffset } = useCADStore();
  const { elements, selectedElement, selectElement, setMousePosition, updateElement, addElement } = useElementsStore();
  const { layers } = useLayerStore();
  
  // Nuovo stato per tracciare l'anteprima del componente e il suo posizionamento
  const [isPlacingComponent, setIsPlacingComponent] = useState<boolean>(false);
  const [previewPosition, setPreviewPosition] = useState<{x: number, y: number, z: number}>({x: 0, y: 0, z: 0});
  const previewRef = useRef<THREE.Object3D | null>(null);
  
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
  const [hoveredControlPoint, setHoveredControlPoint] = useState<{elementId: string, pointIndex: number} | null>(null);
  const [activeDragPoint, setActiveDragPoint] = useState<{elementId: string, pointIndex: number} | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  // Riferimenti per controlli di trasformazione avanzati
  const transformControlsRef = useRef<TransformControls | null>(null);
  
  // Nuovi stati per ottimizzazioni e migliori UX
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate');
  const [isDraggingComponent, setIsDraggingComponent] = useState(false);
  const [draggedComponent, setDraggedComponent] = useState<any>(null);
  const [dropPosition, setDropPosition] = useState<{x: number, y: number, z: number}>({x: 0, y: 0, z: 0});
  const [showPerformanceStats, setShowPerformanceStats] = useState(false);
  const [dropScreenPosition, setDropScreenPosition] = useState<{ x: number, y: number } | undefined>(undefined);
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);


  

  useEffect(() => {
    if (window.exposeCADCanvasAPI) {
      window.cadCanvasScene = sceneRef.current ?? undefined;
      window.cadCanvasCamera = cameraRef.current ?? undefined;
      
      return () => {
        window.cadCanvasScene = undefined;
        window.cadCanvasCamera = undefined;
      };
    }
  }, [sceneRef.current, cameraRef.current, window.exposeCADCanvasAPI]);

  
  
  // Utilizzo dei nuovi hooks
  const { optimizeScene, sceneStatistics } = useThreePerformance(sceneRef);
  const { applyLOD } = useLOD(sceneRef, cameraRef);
  

   useCADKeyboardShortcuts ({
    onDelete: () => {
      if (selectedElement) {
        // Delete the selected element
        useElementsStore.getState().deleteElement(selectedElement.id);
        selectElement(null);
      }
    },
    onEscape: () => {
      // Cancel placement or deselect
      if (isPlacingComponent) {
        if (previewRef.current && sceneRef.current) {
          sceneRef.current.remove(previewRef.current);
          previewRef.current = null;
        }
        setIsPlacingComponent(false);
        if (controlsRef.current) {
          controlsRef.current.enabled = true;
        }
      } else if (selectedElement) {
        selectElement(null);
      }
    },
    onTransform: (mode: 'translate' | 'rotate' | 'scale') => {
      if (transformControlsRef.current && mode) {
        setTransformMode(mode);
        transformControlsRef.current.setMode(mode);
      }
    },
    onToggleFullscreen: () => {
      toggleFullscreen();
    },
    onToggleGrid: () => {
      useCADStore.getState().toggleGrid();
    },
    onToggleAxis: () => {
      useCADStore.getState().toggleAxis();
    },
    onViewModeToggle: (mode: '3d' | '2d') => {
      useCADStore.getState().setViewMode(mode);
    },
    onZoomIn: () => {
      if (cameraRef.current && controlsRef.current) {
        // Zoom in by moving the camera closer
        controlsRef.current.zoom0 = controlsRef.current.zoom0 * 1.2;
        controlsRef.current.update();
      }
    },
    onZoomOut: () => {
      if (cameraRef.current && controlsRef.current) {
        // Zoom out by moving the camera farther
        controlsRef.current.zoom0 = controlsRef.current.zoom0 / 1.2;
        controlsRef.current.update();
      }
    },
    onZoomToFit: () => {
      // Implement zoom to fit selected elements or all elements
      fitCameraToElements();
    },
    onShowShortcuts: () => {
      // Show keyboard shortcuts dialog
      setShowKeyboardShortcuts(true);
    },
    onToggleSnap: () => {
      // Toggle snap using local state
      setSnapEnabled(prev => !prev);
    },
    onUndo: () => {
      // Implement undo functionality
      console.log("Undo action");
    },
    onRedo: () => {
      // Implement redo functionality
      console.log("Redo action");
    },
    onSave: () => {
      // Implement save functionality
      console.log("Save action");
    }
  });

  // Clear control points and recreate them for selected element
  const updateControlPoints = useCallback(() => {
    // Remove existing control points
    if (sceneRef.current) {
      controlPointsRef.current.forEach(point => {
        sceneRef.current?.remove(point);
      });
      controlPointsRef.current = [];
    }

    // Add control points for selected element
    if (selectedElement && sceneRef.current) {
      const controlPoints = createControlPointsForElement(selectedElement);
      controlPoints.forEach(point => {
        sceneRef.current?.add(point);
        controlPointsRef.current.push(point);
      });
    }
  }, [selectedElement]);

  const fitCameraToElements = useCallback(() => {
    if (!cameraRef.current || !sceneRef.current) return;
    
    const elementsToFit = selectedElement 
      ? [sceneRef.current.children.find(child => child.userData?.elementId === selectedElement.id)]
      : sceneRef.current.children.filter(child => child.userData?.isCADElement);
      
    if (elementsToFit.length === 0) return;
    
    // Create a bounding box encompassing all elements
    const boundingBox = new THREE.Box3();
    
    elementsToFit.forEach(element => {
      if (element) {
        const elementBox = new THREE.Box3().setFromObject(element);
        boundingBox.union(elementBox);
      }
    });
    
    // Get bounding box dimensions and center
    const center = new THREE.Vector3();
    boundingBox.getCenter(center);
    
    const size = new THREE.Vector3();
    boundingBox.getSize(size);
    
    // Compute the distance needed to fit the box in view
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = cameraRef.current.fov * (Math.PI / 180);
    const cameraDistance = Math.abs(maxDim / (2 * Math.tan(fov / 2)));
    
    // Position the camera to look at the center of the bounding box
    const direction = cameraRef.current.position.clone()
      .sub(new THREE.Vector3(0, 0, 0)).normalize();
      
    cameraRef.current.position.copy(
      center.clone().add(direction.multiplyScalar(cameraDistance * 1.25))
    );
    
    cameraRef.current.lookAt(center);
    
    // Update controls
    if (controlsRef.current) {
      controlsRef.current.target.copy(center);
      controlsRef.current.update();
    }
  }, [selectedElement]);

  const handleMouseMoveForPreview = useCallback((event: React.MouseEvent) => {
    if (!canvasRef.current || !sceneRef.current || !cameraRef.current || !isPlacingComponent || !previewObject) return;
    
    // Calcola le coordinate normalizzate del mouse (-1 a +1)
    const rect = canvasRef.current.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Calcola l'intersezione con un piano XY
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1)); // Piano XY
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouseRef.current, cameraRef.current);
    
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersection);
    
    // Applica snapping se necessario
    let snapPosition = { x: intersection.x, y: intersection.y, z: intersection.z };
    if (snapSettings.enabled) {
      const snappedPoint = snapToPoint(snapPosition);
      if (snappedPoint) {
        snapPosition = snappedPoint;
      }
    }
    
    // Aggiorna la posizione dell'anteprima
    previewObject.position.set(snapPosition.x, snapPosition.y, snapPosition.z);
    setPreviewPosition(snapPosition);
    
    // Aggiorna la posizione del mouse per la barra di stato
    setMousePosition({
      x: Math.round(snapPosition.x * 100) / 100,
      y: Math.round(snapPosition.y * 100) / 100,
      z: Math.round(snapPosition.z * 100) / 100
    });
  }, [isPlacingComponent, previewObject, snapSettings.enabled, setMousePosition, snapToPoint]);

  const handleClickForPlacement = useCallback((event: React.MouseEvent) => {
    if (!isPlacingComponent || !previewComponent || !previewRef.current) return;
    
    // Posiziona effettivamente il componente
    const position = { ...previewPosition };
    
    // Crea un elemento CAD basato sul componente
    const newElement = {
      id: `component-${Date.now()}`,
      type: 'component',
      x: position.x,
      y: position.y,
      z: position.z,
      componentId: previewComponent,
      layerId: layers[0]?.id || 'default', // Usa il primo layer disponibile
      // Altre proprietà necessarie...
    };
    
    // Aggiungi l'elemento al canvas
    addElement(newElement);
    
    // Notifica il posizionamento attraverso il callback
    if (onComponentPlaced) {
      onComponentPlaced(previewComponent, position);
    }
    
    // Riabilita i controlli orbitali dopo il posizionamento
    if (controlsRef.current) {
      controlsRef.current.enabled = true;
    }
    
    // Resetta lo stato di posizionamento
    setIsPlacingComponent(false);
  }, [isPlacingComponent, previewComponent, previewPosition, layers, addElement, onComponentPlaced]);

  useEffect(() => {
    if (!sceneRef.current || !previewComponent) {
      // Rimuovi l'anteprima se non c'è un componente selezionato
      if (previewRef.current && sceneRef.current) {
        sceneRef.current.remove(previewRef.current);
        previewRef.current = null;
      }
      setIsPlacingComponent(false);
      return;
    }
    
    // Rimuovi qualsiasi anteprima precedente
    if (previewRef.current) {
      sceneRef.current.remove(previewRef.current);
      previewRef.current = null;
    }
    
    // Trova il componente predefinito se è una stringa
    const component = typeof previewComponent === 'string' 
      ? predefinedComponents.find(c => c.data === previewComponent || c.name === previewComponent)
      : previewComponent;
      
    if (!component) return;
    
    // Crea un oggetto Three.js basato sul componente
    const threeObject = createComponentPreview(component);
    if (threeObject) {
      // Imposta l'oggetto come trasparente per indicare che è in anteprima
      if (threeObject instanceof THREE.Mesh) {
        const material = threeObject.material as THREE.MeshStandardMaterial;
        material.transparent = true;
        material.opacity = 0.7;
        material.color.set(0x4a90e2); // Colore blu per l'anteprima
      }
      
      // Posiziona l'oggetto all'origine o alla posizione del mouse
      threeObject.position.set(previewPosition.x, previewPosition.y, previewPosition.z);
      threeObject.userData.isPreview = true;
      threeObject.userData.componentId = previewComponent;
      
      sceneRef.current.add(threeObject);
      previewRef.current = threeObject;
      setIsPlacingComponent(true);
      
      // Disabilita i controlli orbitali durante il posizionamento
      if (controlsRef.current) {
        controlsRef.current.enabled = false;
      }
    }
  }, [previewComponent, previewPosition]);
  


  // Create control points for an element
  const createControlPointsForElement = (element: any): THREE.Object3D[] => {
    const controlPoints: THREE.Object3D[] = [];
    // Create smaller control points (reduced size from 5 to 3)
    const pointGeometry = new THREE.SphereGeometry(3, 12, 12);
    const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xff3366 });
    
    switch (element.type) {
      case 'line':
        // Create control points for line endpoints
        const point1 = new THREE.Mesh(pointGeometry, pointMaterial);
        point1.position.set(element.x1, element.y1, element.z1 || 0);
        point1.userData.isControlPoint = true;
        point1.userData.elementId = element.id;
        point1.userData.pointIndex = 0; // First endpoint
        point1.userData.controlFor = 'line';
        
        const point2 = new THREE.Mesh(pointGeometry, pointMaterial);
        point2.position.set(element.x2, element.y2, element.z2 || 0);
        point2.userData.isControlPoint = true;
        point2.userData.elementId = element.id;
        point2.userData.pointIndex = 1; // Second endpoint
        point2.userData.controlFor = 'line';
        
        controlPoints.push(point1, point2);
        break;
        
      case 'rectangle':
        // Create control points for rectangle corners and midpoints
        const halfWidth = element.width / 2;
        const halfHeight = element.height / 2;
        const rotationRad = (element.angle || 0) * Math.PI / 180;
        
        // Helper function to calculate rotated position
        const getRotatedPos = (x: number, y: number) => {
          const cos = Math.cos(rotationRad);
          const sin = Math.sin(rotationRad);
          const xRot = (x * cos - y * sin) + element.x;
          const yRot = (x * sin + y * cos) + element.y;
          return { x: xRot, y: yRot };
        };
        
        // Corner points
        const corners = [
          getRotatedPos(-halfWidth, -halfHeight), // Top-left
          getRotatedPos(halfWidth, -halfHeight),  // Top-right
          getRotatedPos(halfWidth, halfHeight),   // Bottom-right
          getRotatedPos(-halfWidth, halfHeight)   // Bottom-left
        ];
        
        corners.forEach((pos, idx) => {
          const point = new THREE.Mesh(pointGeometry, pointMaterial);
          point.position.set(pos.x, pos.y, element.z || 0);
          point.userData.isControlPoint = true;
          point.userData.elementId = element.id;
          point.userData.pointIndex = idx;
          point.userData.controlFor = 'rectangle';
          point.userData.isCorner = true;
          controlPoints.push(point);
        });
        
        // Midpoints
        const midpoints = [
          getRotatedPos(0, -halfHeight),  // Top
          getRotatedPos(halfWidth, 0),    // Right
          getRotatedPos(0, halfHeight),   // Bottom
          getRotatedPos(-halfWidth, 0)    // Left
        ];
        
        midpoints.forEach((pos, idx) => {
          const point = new THREE.Mesh(pointGeometry, pointMaterial);
          point.position.set(pos.x, pos.y, element.z || 0);
          point.userData.isControlPoint = true;
          point.userData.elementId = element.id;
          point.userData.pointIndex = idx + 4; // Offset after corners
          point.userData.controlFor = 'rectangle';
          point.userData.isMidpoint = true;
          controlPoints.push(point);
        });
        
        // Rotation handle - slightly smaller than in the previous implementation
        const rotationPoint = new THREE.Mesh(
          new THREE.CylinderGeometry(2, 2, 10, 12),
          new THREE.MeshBasicMaterial({ color: 0x00aaff })
        );
        const rotHandlePos = getRotatedPos(0, -halfHeight - 15);
        rotationPoint.position.set(rotHandlePos.x, rotHandlePos.y, element.z || 0);
        rotationPoint.userData.isControlPoint = true;
        rotationPoint.userData.elementId = element.id;
        rotationPoint.userData.pointIndex = 8;
        rotationPoint.userData.controlFor = 'rectangle';
        rotationPoint.userData.isRotationHandle = true;
        controlPoints.push(rotationPoint);
        break;
        
      case 'circle':
        // Create control points for circle - center and radius points
        const centerPoint = new THREE.Mesh(pointGeometry, pointMaterial);
        centerPoint.position.set(element.x, element.y, element.z || 0);
        centerPoint.userData.isControlPoint = true;
        centerPoint.userData.elementId = element.id;
        centerPoint.userData.pointIndex = 0;
        centerPoint.userData.controlFor = 'circle';
        centerPoint.userData.isCenter = true;
        
        // Points at cardinal directions for radius control
        const radiusPoints = [];
        for (let i = 0; i < 4; i++) {
          const angle = i * Math.PI / 2;
          const radiusPoint = new THREE.Mesh(pointGeometry, pointMaterial);
          radiusPoint.position.set(
            element.x + element.radius * Math.cos(angle),
            element.y + element.radius * Math.sin(angle),
            element.z || 0
          );
          radiusPoint.userData.isControlPoint = true;
          radiusPoint.userData.elementId = element.id;
          radiusPoint.userData.pointIndex = i + 1;
          radiusPoint.userData.controlFor = 'circle';
          radiusPoint.userData.isRadiusControl = true;
          radiusPoints.push(radiusPoint);
        }
        
        controlPoints.push(centerPoint, ...radiusPoints);
        break;
        
      case 'cube':
        // Create control points for cube - center and size controls
        const cubeCenter = new THREE.Mesh(pointGeometry, pointMaterial);
        cubeCenter.position.set(element.x, element.y, element.z || 0);
        cubeCenter.userData.isControlPoint = true;
        cubeCenter.userData.elementId = element.id;
        cubeCenter.userData.pointIndex = 0;
        cubeCenter.userData.controlFor = 'cube';
        cubeCenter.userData.isCenter = true;
        
        // Eight corners of the cube
        const corners3D = [];
        for (let i = 0; i < 8; i++) {
          const xSign = (i & 1) ? 1 : -1;
          const ySign = (i & 2) ? 1 : -1;
          const zSign = (i & 4) ? 1 : -1;
          
          const cornerPoint = new THREE.Mesh(pointGeometry, pointMaterial);
          cornerPoint.position.set(
            element.x + xSign * element.width / 2,
            element.y + ySign * element.height / 2,
            element.z + zSign * element.depth / 2
          );
          cornerPoint.userData.isControlPoint = true;
          cornerPoint.userData.elementId = element.id;
          cornerPoint.userData.pointIndex = i + 1;
          cornerPoint.userData.controlFor = 'cube';
          cornerPoint.userData.isCorner = true;
          corners3D.push(cornerPoint);
        }
        
        controlPoints.push(cubeCenter, ...corners3D);
        break;
        
      case 'sphere':
        // Create control points for sphere - center and radius controls
        const sphereCenter = new THREE.Mesh(pointGeometry, pointMaterial);
        sphereCenter.position.set(element.x, element.y, element.z || 0);
        sphereCenter.userData.isControlPoint = true;
        sphereCenter.userData.elementId = element.id;
        sphereCenter.userData.pointIndex = 0;
        sphereCenter.userData.controlFor = 'sphere';
        sphereCenter.userData.isCenter = true;
        
        // Six direction controls for radius
        const directions = [
          [1, 0, 0], [-1, 0, 0],  // X axis
          [0, 1, 0], [0, -1, 0],  // Y axis
          [0, 0, 1], [0, 0, -1]   // Z axis
        ];
        
        const radiusControls = directions.map((dir, idx) => {
          const radiusPoint = new THREE.Mesh(pointGeometry, pointMaterial);
          radiusPoint.position.set(
            element.x + dir[0] * element.radius,
            element.y + dir[1] * element.radius,
            element.z + dir[2] * element.radius
          );
          radiusPoint.userData.isControlPoint = true;
          radiusPoint.userData.elementId = element.id;
          radiusPoint.userData.pointIndex = idx + 1;
          radiusPoint.userData.controlFor = 'sphere';
          radiusPoint.userData.isRadiusControl = true;
          radiusPoint.userData.direction = dir;
          return radiusPoint;
        });
        
        controlPoints.push(sphereCenter, ...radiusControls);
        break;
        
      case 'cylinder':
        // Create control points for cylinder
        const cylinderCenter = new THREE.Mesh(pointGeometry, pointMaterial);
        cylinderCenter.position.set(element.x, element.y, element.z || 0);
        cylinderCenter.userData.isControlPoint = true;
        cylinderCenter.userData.elementId = element.id;
        cylinderCenter.userData.pointIndex = 0;
        cylinderCenter.userData.controlFor = 'cylinder';
        
        // Radius control point
        const cylinderRadiusPoint = new THREE.Mesh(pointGeometry, pointMaterial);
        cylinderRadiusPoint.position.set(
          element.x + element.radius, 
          element.y, 
          element.z || 0
        );
        cylinderRadiusPoint.userData.isControlPoint = true;
        cylinderRadiusPoint.userData.elementId = element.id;
        cylinderRadiusPoint.userData.pointIndex = 1;
        cylinderRadiusPoint.userData.controlFor = 'cylinder';
        
        // Height control points
        const topPoint = new THREE.Mesh(pointGeometry, pointMaterial);
        topPoint.position.set(
          element.x,
          element.y,
          element.z + element.height / 2
        );
        topPoint.userData.isControlPoint = true;
        topPoint.userData.elementId = element.id;
        topPoint.userData.pointIndex = 2;
        topPoint.userData.controlFor = 'cylinder';
        
        const bottomPoint = new THREE.Mesh(pointGeometry, pointMaterial);
        bottomPoint.position.set(
          element.x,
          element.y,
          element.z - element.height / 2
        );
        bottomPoint.userData.isControlPoint = true;
        bottomPoint.userData.elementId = element.id;
        bottomPoint.userData.pointIndex = 3;
        bottomPoint.userData.controlFor = 'cylinder';
        
        controlPoints.push(cylinderCenter, cylinderRadiusPoint, topPoint, bottomPoint);
        break;
        
      case 'cone':
        // Create control points for cone
        const coneBaseCenter = new THREE.Mesh(pointGeometry, pointMaterial);
        coneBaseCenter.position.set(element.x, element.y, element.z || 0);
        coneBaseCenter.userData.isControlPoint = true;
        coneBaseCenter.userData.elementId = element.id;
        coneBaseCenter.userData.pointIndex = 0;
        coneBaseCenter.userData.controlFor = 'cone';
        
        // Base radius control point
        const coneRadiusPoint = new THREE.Mesh(pointGeometry, pointMaterial);
        coneRadiusPoint.position.set(
          element.x + element.radius,
          element.y,
          element.z || 0
        );
        coneRadiusPoint.userData.isControlPoint = true;
        coneRadiusPoint.userData.elementId = element.id;
        coneRadiusPoint.userData.pointIndex = 1;
        coneRadiusPoint.userData.controlFor = 'cone';
        
        // Tip (height) control point
        const coneTipPoint = new THREE.Mesh(pointGeometry, pointMaterial);
        coneTipPoint.position.set(
          element.x,
          element.y,
          element.z + element.height
        );
        coneTipPoint.userData.isControlPoint = true;
        coneTipPoint.userData.elementId = element.id;
        coneTipPoint.userData.pointIndex = 2;
        coneTipPoint.userData.controlFor = 'cone';
        
        controlPoints.push(coneBaseCenter, coneRadiusPoint, coneTipPoint);
        break;
        
      case 'torus':
        // Create control points for torus
        const torusCenter = new THREE.Mesh(pointGeometry, pointMaterial);
        torusCenter.position.set(element.x, element.y, element.z || 0);
        torusCenter.userData.isControlPoint = true;
        torusCenter.userData.elementId = element.id;
        torusCenter.userData.pointIndex = 0;
        torusCenter.userData.controlFor = 'torus';
        
        // Main radius control point
        const mainRadiusPoint = new THREE.Mesh(pointGeometry, pointMaterial);
        mainRadiusPoint.position.set(
          element.x + element.radius,
          element.y,
          element.z || 0
        );
        mainRadiusPoint.userData.isControlPoint = true;
        mainRadiusPoint.userData.elementId = element.id;
        mainRadiusPoint.userData.pointIndex = 1;
        mainRadiusPoint.userData.controlFor = 'torus';
        
        // Tube radius control point
        const tubeRadius = element.tube || element.radius / 4;
        const tubeRadiusPoint = new THREE.Mesh(pointGeometry, pointMaterial);
        tubeRadiusPoint.position.set(
          element.x + element.radius + tubeRadius,
          element.y,
          element.z || 0
        );
        tubeRadiusPoint.userData.isControlPoint = true;
        tubeRadiusPoint.userData.elementId = element.id;
        tubeRadiusPoint.userData.pointIndex = 2;
        tubeRadiusPoint.userData.controlFor = 'torus';
        
        controlPoints.push(torusCenter, mainRadiusPoint, tubeRadiusPoint);
        break;
        
      case 'polygon':
        // Create control points for polygon
        const polygonCenter = new THREE.Mesh(pointGeometry, pointMaterial);
        polygonCenter.position.set(element.x, element.y, element.z || 0);
        polygonCenter.userData.isControlPoint = true;
        polygonCenter.userData.elementId = element.id;
        polygonCenter.userData.pointIndex = 0;
        polygonCenter.userData.controlFor = 'polygon';
        
        const polygonPoints = [polygonCenter];
        
        // If it's a regular polygon with radius
        if (element.radius) {
          const radiusPoint = new THREE.Mesh(pointGeometry, pointMaterial);
          radiusPoint.position.set(
            element.x + element.radius,
            element.y,
            element.z || 0
          );
          radiusPoint.userData.isControlPoint = true;
          radiusPoint.userData.elementId = element.id;
          radiusPoint.userData.pointIndex = 1;
          radiusPoint.userData.controlFor = 'polygon';
          polygonPoints.push(radiusPoint);
        }
        
        // If it has custom points, add control points for each vertex
        if (element.points && element.points.length >= 3) {
          element.points.forEach((point: any, idx: number) => {
            const vertexPoint = new THREE.Mesh(pointGeometry, pointMaterial);
            vertexPoint.position.set(
              point.x || 0,
              point.y || 0,
              point.z || element.z || 0
            );
            vertexPoint.userData.isControlPoint = true;
            vertexPoint.userData.elementId = element.id;
            vertexPoint.userData.pointIndex = idx + 2; // Offset for center and radius points
            vertexPoint.userData.controlFor = 'polygon';
            polygonPoints.push(vertexPoint);
          });
        }
        
        controlPoints.push(...polygonPoints);
        break;
        
      case 'extrusion':
        // Create control points for extrusion
        const extrusionCenter = new THREE.Mesh(pointGeometry, pointMaterial);
        extrusionCenter.position.set(element.x, element.y, element.z || 0);
        extrusionCenter.userData.isControlPoint = true;
        extrusionCenter.userData.elementId = element.id;
        extrusionCenter.userData.pointIndex = 0;
        extrusionCenter.userData.controlFor = 'extrusion';
        
        const extrusionPoints = [extrusionCenter];
        
        // Shape size control point
        const shapeControlPoint = new THREE.Mesh(pointGeometry, pointMaterial);
        let controlX = element.x;
        let controlY = element.y;
        
        if (element.shape === 'rect' && element.width && element.height) {
          controlX = element.x + element.width / 2;
          controlY = element.y + element.height / 2;
        } else if (element.shape === 'circle' && element.radius) {
          controlX = element.x + element.radius;
        }
        
        shapeControlPoint.position.set(controlX, controlY, element.z || 0);
        shapeControlPoint.userData.isControlPoint = true;
        shapeControlPoint.userData.elementId = element.id;
        shapeControlPoint.userData.pointIndex = 1;
        shapeControlPoint.userData.controlFor = 'extrusion';
        extrusionPoints.push(shapeControlPoint);
        
        // Depth control point
        const depthControlPoint = new THREE.Mesh(pointGeometry, pointMaterial);
        depthControlPoint.position.set(
          element.x,
          element.y,
          (element.z || 0) + element.depth
        );
        depthControlPoint.userData.isControlPoint = true;
        depthControlPoint.userData.elementId = element.id;
        depthControlPoint.userData.pointIndex = 2;
        depthControlPoint.userData.controlFor = 'extrusion';
        extrusionPoints.push(depthControlPoint);
        
        // Points for custom shapes
        if (element.points && element.points.length >= 3) {
          element.points.forEach((point: any, idx: number) => {
            const shapePoint = new THREE.Mesh(pointGeometry, pointMaterial);
            shapePoint.position.set(
              element.x + (point.x || 0),
              element.y + (point.y || 0),
              element.z || 0
            );
            shapePoint.userData.isControlPoint = true;
            shapePoint.userData.elementId = element.id;
            shapePoint.userData.pointIndex = idx + 3; // Offset for center, shape, and depth
            shapePoint.userData.controlFor = 'extrusion';
            extrusionPoints.push(shapePoint);
          });
        }
        
        controlPoints.push(...extrusionPoints);
        break;
        
      case 'tube':
        // Create control points for tube
        const tubePoints = [];
        
        // Path points
        if (element.path && element.path.length >= 2) {
          element.path.forEach((point: any, idx: number) => {
            const pathPoint = new THREE.Mesh(pointGeometry, pointMaterial);
            pathPoint.position.set(
              point.x || 0,
              point.y || 0,
              point.z || 0
            );
            pathPoint.userData.isControlPoint = true;
            pathPoint.userData.elementId = element.id;
            pathPoint.userData.pointIndex = idx;
            pathPoint.userData.controlFor = 'tube';
            tubePoints.push(pathPoint);
          });
          
          // Radius control point - place it near the first path point
          const firstPoint = element.path[0];
          const secondPoint = element.path[1];
          
          // Calculate a direction perpendicular to the tube
          const dx = secondPoint.x - firstPoint.x;
          const dy = secondPoint.y - firstPoint.y;
          const length = Math.sqrt(dx*dx + dy*dy);
          
          // Normalize and get perpendicular direction
          const perpX = dy / length;
          const perpY = -dx / length;
          
          const radiusPoint = new THREE.Mesh(pointGeometry, pointMaterial);
          radiusPoint.position.set(
            firstPoint.x + perpX * element.radius,
            firstPoint.y + perpY * element.radius,
            firstPoint.z || 0
          );
          radiusPoint.userData.isControlPoint = true;
          radiusPoint.userData.elementId = element.id;
          radiusPoint.userData.pointIndex = element.path.length; // After all path points
          radiusPoint.userData.controlFor = 'tube';
          tubePoints.push(radiusPoint);
        }
        
        controlPoints.push(...tubePoints);
        break;
        
      case 'lathe':
        // Create control points for lathe
        const latheCenter = new THREE.Mesh(pointGeometry, pointMaterial);
        latheCenter.position.set(element.x, element.y, element.z || 0);
        latheCenter.userData.isControlPoint = true;
        latheCenter.userData.elementId = element.id;
        latheCenter.userData.pointIndex = 0;
        latheCenter.userData.controlFor = 'lathe';
        
        const lathePoints = [latheCenter];
        
        // Profile points
        if (element.points && element.points.length >= 2) {
          element.points.forEach((point: any, idx: number) => {
            const profilePoint = new THREE.Mesh(pointGeometry, pointMaterial);
            profilePoint.position.set(
              element.x + (point.x || 0),
              element.y + (point.y || 0),
              element.z || 0
            );
            profilePoint.userData.isControlPoint = true;
            profilePoint.userData.elementId = element.id;
            profilePoint.userData.pointIndex = idx + 1; // Offset for center
            profilePoint.userData.controlFor = 'lathe';
            lathePoints.push(profilePoint);
          });
        }
        
        controlPoints.push(...lathePoints);
        break;

      default:
        break;
    }
    useCADStore
    return controlPoints;
  };

  // Handle transforms when control points are dragged
  const handleControlPointDrag = useCallback((elementId: string, pointIndex: number, newX: number, newY: number, newZ: number = 0) => {
    const element = elements.find(el => el.id === elementId);
    if (!element) return;
    
    let updates: any = {};
    
    switch (element.type) {
      case 'line':
        if (pointIndex === 0) {
          // First endpoint
          updates = { x1: newX, y1: newY, z1: newZ };
        } else if (pointIndex === 1) {
          // Second endpoint
          updates = { x2: newX, y2: newY, z2: newZ };
        }
        break;
        
      case 'rectangle':
        // Handle rectangle control points differently based on the point type
        if (pointIndex < 4) {
          // It's a corner - we need to recalculate dimensions
          const originalCenter = { x: element.x, y: element.y };
          const angle = (element.angle || 0) * Math.PI / 180;
          
          // Rotate the new position back to get aligned coordinates
          const cosAngle = Math.cos(-angle);
          const sinAngle = Math.sin(-angle);
          const alignedX = (newX - originalCenter.x) * cosAngle - (newY - originalCenter.y) * sinAngle;
          const alignedY = (newX - originalCenter.x) * sinAngle + (newY - originalCenter.y) * cosAngle;
          
          // Which corner is it?
          const isLeft = (pointIndex === 0 || pointIndex === 3);
          const isTop = (pointIndex === 0 || pointIndex === 1);
          
          // Get the opposite corner
          const oppCornerIdx = pointIndex < 2 ? pointIndex + 2 : pointIndex - 2;
          const oppCornerPoint = controlPointsRef.current.find(
            pt => pt.userData.elementId === elementId && pt.userData.pointIndex === oppCornerIdx
          );
          
          if (!oppCornerPoint) return;
          
          // Rotate the opposite corner position back too
          const oppX = (oppCornerPoint.position.x - originalCenter.x) * cosAngle - 
                      (oppCornerPoint.position.y - originalCenter.y) * sinAngle;
          const oppY = (oppCornerPoint.position.x - originalCenter.x) * sinAngle + 
                      (oppCornerPoint.position.y - originalCenter.y) * cosAngle;
          
          // Calculate new width, height and center
          const newWidth = Math.abs(alignedX - oppX);
          const newHeight = Math.abs(alignedY - oppY);
          const newCenterX = (alignedX + oppX) / 2;
          const newCenterY = (alignedY + oppY) / 2;
          
          // Rotate the center back to world coordinates
          const worldCenterX = originalCenter.x + newCenterX * Math.cos(angle) - newCenterY * Math.sin(angle);
          const worldCenterY = originalCenter.y + newCenterX * Math.sin(angle) + newCenterY * Math.cos(angle);
          
          updates = {
            width: newWidth,
            height: newHeight,
            x: worldCenterX,
            y: worldCenterY
          };
          
        } else if (pointIndex < 8) {
          // It's a midpoint - adjust one dimension
          const angle = (element.angle || 0) * Math.PI / 180;
          const direction = pointIndex - 4; // 0: top, 1: right, 2: bottom, 3: left
          
          // Get vector from center to new point
          const deltaX = newX - element.x;
          const deltaY = newY - element.y;
          
          // Rotate it to align with rectangle
          const rotDeltaX = deltaX * Math.cos(-angle) - deltaY * Math.sin(-angle);
          const rotDeltaY = deltaX * Math.sin(-angle) + deltaY * Math.cos(-angle);
          
          if (direction === 0 || direction === 2) {
            // Top or bottom - adjust height
            const newHeight = Math.abs(rotDeltaY) * 2;
            updates = { height: newHeight };
          } else {
            // Left or right - adjust width
            const newWidth = Math.abs(rotDeltaX) * 2;
            updates = { width: newWidth };
          }
          
        } else if (pointIndex === 8) {
          // Rotation handle
          // Calculate angle from center to current position
          const deltaX = newX - element.x;
          const deltaY = newY - element.y;
          const newAngle = (Math.atan2(deltaY, deltaX) * 180 / Math.PI) + 90;
          updates = { angle: newAngle };
        }
        break;
        
      case 'circle':
        if (pointIndex === 0) {
          // Center point
          updates = { x: newX, y: newY, z: newZ };
        } else {
          // Radius control point
          const dx = newX - element.x;
          const dy = newY - element.y;
          const newRadius = Math.sqrt(dx*dx + dy*dy);
          updates = { radius: newRadius };
        }
        break;
        
      case 'cube':
        if (pointIndex === 0) {
          // Center point
          updates = { x: newX, y: newY, z: newZ };
        } else {
          // Corner point - need to recalculate dimensions
          const i = pointIndex - 1;
          const xSign = (i & 1) ? 1 : -1;
          const ySign = (i & 2) ? 1 : -1;
          const zSign = (i & 4) ? 1 : -1;
          
          // Distance from corner to center along each axis
          const dx = Math.abs(newX - element.x);
          const dy = Math.abs(newY - element.y);
          const dz = Math.abs(newZ - element.z);
          
          updates = {
            width: dx * 2,
            height: dy * 2,
            depth: dz * 2
          };
        }
        break;
        
      case 'sphere':
        if (pointIndex === 0) {
          // Center point
          updates = { x: newX, y: newY, z: newZ };
        } else {
          // Radius control point
          const dx = newX - element.x;
          const dy = newY - element.y;
          const dz = newZ - element.z;
          const newRadius = Math.sqrt(dx*dx + dy*dy + dz*dz);
          updates = { radius: newRadius };
        }
        break;
        
      case 'cylinder':
        if (pointIndex === 0) {
          // Center point
          updates = { x: newX, y: newY, z: newZ };
        } else if (pointIndex === 1) {
          // Radius control point
          const dx = newX - element.x;
          const dy = newY - element.y;
          const newRadius = Math.sqrt(dx*dx + dy*dy);
          updates = { radius: newRadius };
        } else if (pointIndex === 2 || pointIndex === 3) {
          // Height control points
          const dz = Math.abs(newZ - element.z);
          updates = { height: dz * 2 };
        }
        break;
        
      case 'cone':
        if (pointIndex === 0) {
          // Center point (base center)
          updates = { x: newX, y: newY, z: newZ };
        } else if (pointIndex === 1) {
          // Base radius control point
          const dx = newX - element.x;
          const dy = newY - element.y;
          const newRadius = Math.sqrt(dx*dx + dy*dy);
          updates = { radius: newRadius };
        } else if (pointIndex === 2) {
          // Height control point (tip of cone)
          const dz = Math.abs(newZ - element.z);
          updates = { height: dz };
        }
        break;
        
      case 'torus':
        if (pointIndex === 0) {
          // Center point
          updates = { x: newX, y: newY, z: newZ };
        } else if (pointIndex === 1) {
          // Main radius control point
          const dx = newX - element.x;
          const dy = newY - element.y;
          const newRadius = Math.sqrt(dx*dx + dy*dy);
          updates = { radius: newRadius };
        } else if (pointIndex === 2) {
          // Tube radius control point
          const tubeRadius = element.tube || element.radius / 4;
          const mainRadius = element.radius;
          
          // Calculate new tube radius based on drag distance from torus ring
          const dx = newX - element.x;
          const dy = newY - element.y;
          const distanceFromCenter = Math.sqrt(dx*dx + dy*dy);
          const newTubeRadius = Math.abs(distanceFromCenter - mainRadius);
          
          updates = { tube: newTubeRadius };
        }
        break;
        
      case 'polygon':
        if (pointIndex === 0) {
          // Center point
          updates = { x: newX, y: newY, z: newZ };
        } else if (pointIndex === 1) {
          // Radius control point
          const dx = newX - element.x;
          const dy = newY - element.y;
          const newRadius = Math.sqrt(dx*dx + dy*dy);
          updates = { radius: newRadius };
        } else if (pointIndex > 1 && element.points) {
          // Vertex control point
          const vertexIndex = pointIndex - 2;
          if (vertexIndex < element.points.length) {
            // Create a copy of points array
            const newPoints = [...element.points];
            // Update the point being dragged
            newPoints[vertexIndex] = { x: newX, y: newY, z: newZ };
            updates = { points: newPoints };
          }
        }
        break;
        
      case 'extrusion':
        if (pointIndex === 0) {
          // Center point
          updates = { x: newX, y: newY, z: newZ };
        } else if (pointIndex === 1) {
          // Width/height control point
          const dx = newX - element.x;
          const dy = newY - element.y;
          
          // For rectangular extrusions
          if (element.shape === 'rect') {
            const distance = Math.sqrt(dx*dx + dy*dy);
            updates = { width: distance * 2, height: distance * 1.5 };
          } 
          // For circular extrusions
          else if (element.shape === 'circle') {
            const newRadius = Math.sqrt(dx*dx + dy*dy);
            updates = { radius: newRadius };
          }
        } else if (pointIndex === 2) {
          // Depth control point
          const dz = Math.abs(newZ - element.z);
          updates = { depth: dz };
        } else if (pointIndex > 2 && element.points) {
          // Shape point control (for custom shapes)
          const adjustedPointIndex = pointIndex - 3;
          if (adjustedPointIndex < element.points.length) {
            // Create a copy of points array
            const newPoints = [...element.points];
            // Update the point being dragged
            newPoints[pointIndex] = { x: newX - element.x, y: newY - element.y };
            updates = { points: newPoints };
          }
        }
        break;
        
      case 'tube':
        if (element.path && pointIndex < element.path.length) {
          // Path point control
          const newPath = [...element.path];
          newPath[pointIndex] = { x: newX, y: newY, z: newZ };
          updates = { path: newPath };
        } else if (pointIndex === element.path?.length) {
          // Radius control point
          // First find the closest point on the path
          let minDist = Infinity;
          let closestPointIndex = 0;
          
          for (let i = 0; i < element.path.length; i++) {
            const point = element.path[i];
            const dist = Math.sqrt(
              Math.pow(point.x - newX, 2) + 
              Math.pow(point.y - newY, 2) + 
              Math.pow((point.z || 0) - newZ, 2)
            );
            
            if (dist < minDist) {
              minDist = dist;
              closestPointIndex = i;
            }
          }
          
          // Calculate new radius as distance from path point to drag position
          const pathPoint = element.path[closestPointIndex];
          const dx = newX - pathPoint.x;
          const dy = newY - pathPoint.y;
          const dz = newZ - (pathPoint.z || 0);
          const newRadius = Math.sqrt(dx*dx + dy*dy + dz*dz);
          
          updates = { radius: newRadius };
        }
        break;
        
      case 'lathe':
        if (pointIndex === 0) {
          // Center of rotation
          updates = { x: newX, y: newY, z: newZ };
        } else if (element.points && pointIndex - 1 < element.points.length) {
          // Profile point control
          const updatedPointIndex = pointIndex - 1;
          const newPoints = [...element.points];
          
          // Update relative to center of rotation
          newPoints[updatedPointIndex] = { 
            x: Math.abs(newX - element.x), // Keep x positive for lathe profile
            y: newY - element.y
          };
          
          updates = { points: newPoints };
        }
        break;
        
      default:
        console.warn(`Unknown element type for control point drag: ${element.type}`);
    }
    
    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      updateElement(elementId, updates);
    }
  }, [elements, updateElement]);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#2A2A2A');
    sceneRef.current = scene;

    // Create camera
    const camera = new THREE.PerspectiveCamera(
      75,
      canvasRef.current.clientWidth / canvasRef.current.clientHeight,
      0.01,   // Near plane molto più vicino per zoom estremo (era 0.1)
      5000    // Far plane molto più lontano per vista distante (era 1000)
    );
    camera.position.set(0, 0, 5);
    cameraRef.current = camera;

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    canvasRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Add orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    // Aumenta il range di zoom permettendo sia un livello molto ravvicinato che molto distante
    controls.minDistance = 0.1;  // Zoom ravvicinato molto più vicino (era 5)
    controls.maxDistance = 500;  // Zoom molto più lontano (era 100)
    // Aggiungi la velocità di zoom per un controllo più preciso
    controls.zoomSpeed = 1.5;
    // Attiva il pannello sensibile alla rotella del mouse per uno zoom più intuitivo
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };
    controlsRef.current = controls;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    // Add grid
    const gridHelper = new THREE.GridHelper(500, 500);  // Griglia molto più ampia (era 100x100)
    gridHelper.rotation.x = Math.PI / 2; // Rotate to XY plane
    gridHelper.visible = gridVisible;
    scene.add(gridHelper);

    // Create custom axes
    const createCustomAxes = (size: number) => {
      // Create materials for each axis with distinct colors
      const xAxisMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff }); // Blue for X axis
      const yAxisMaterial = new THREE.LineBasicMaterial({ color: 0xff00ff }); // Magenta for Y axis
      const zAxisMaterial = new THREE.LineBasicMaterial({ color: 0x00ff7f }); // Green for Z axis

      // Create geometries for each axis - raddoppiata la lunghezza
      const xAxisGeometry = new THREE.BufferGeometry();
      xAxisGeometry.setAttribute('position', new THREE.Float32BufferAttribute([-size*2, 0, 0, size*2, 0, 0], 3));
      const xAxis = new THREE.Line(xAxisGeometry, xAxisMaterial);
      
      const yAxisGeometry = new THREE.BufferGeometry();
      yAxisGeometry.setAttribute('position', new THREE.Float32BufferAttribute([0, -size*2, 0, 0, size*2, 0], 3));
      const yAxis = new THREE.Line(yAxisGeometry, yAxisMaterial);
      
      const zAxisGeometry = new THREE.BufferGeometry();
      zAxisGeometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -size*2, 0, 0, size*2], 3));
      const zAxis = new THREE.Line(zAxisGeometry, zAxisMaterial);

      // Add labels for axes
      const addAxisLabel = (text: string, position: [number, number, number], color: THREE.Color) => {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        if (context) {
          context.fillStyle = `rgb(${color.r * 255}, ${color.g * 255}, ${color.b * 255})`;
          context.font = 'Bold 48px Arial';
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          context.fillText(text, 32, 32);
          
          const texture = new THREE.CanvasTexture(canvas);
          const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
          const sprite = new THREE.Sprite(spriteMaterial);
          sprite.position.set(...position);
          sprite.scale.set(2, 2, 2);
          return sprite;
        }
        return null;
      };

      // Create a group to contain all axis elements
      const axesGroup = new THREE.Group();
      axesGroup.add(xAxis);
      axesGroup.add(yAxis);
      axesGroup.add(zAxis);
      
      // Add labels
      const xLabel = addAxisLabel('X', [size + 1, 0, 0], new THREE.Color(0, 0, 1));
      const yLabel = addAxisLabel('Y', [0, size + 1, 0], new THREE.Color(1, 0, 1));
      const zLabel = addAxisLabel('Z', [0, 0, size + 1], new THREE.Color(0, 1, 0.5));
      
      if (xLabel) axesGroup.add(xLabel);
      if (yLabel) axesGroup.add(yLabel);
      if (zLabel) axesGroup.add(zLabel);
      
      return axesGroup;
    };

    // Create and add custom axes to the scene
    const customAxes = createCustomAxes(20);  // Assi più lunghi (era 10)
    customAxes.visible = axisVisible;
    customAxes.userData.isCustomAxes = true;
    scene.add(customAxes);

    // Store canvas dimensions
    setCanvasDimensions({
      width: canvasRef.current.clientWidth,
      height: canvasRef.current.clientHeight
    });

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      if (rendererRef.current && cameraRef.current && sceneRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!canvasRef.current || !cameraRef.current || !rendererRef.current) return;
      
      const width = canvasRef.current.clientWidth;
      const height = canvasRef.current.clientHeight;
      
      setCanvasDimensions({ width, height });
      
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      
      rendererRef.current.setSize(width, height);
    };
    
    window.addEventListener('resize', handleResize);

    // Add fullscreen change event listeners
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      
      if (rendererRef.current) {
        rendererRef.current.domElement.parentElement?.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, [axisVisible, gridVisible]);

  // Handle fullscreen change
  const handleFullscreenChange = () => {
    const isCurrentlyFullscreen = document.fullscreenElement;
    setIsFullscreen(!!isCurrentlyFullscreen);
    
    // Adjust renderer size after fullscreen change
    setTimeout(() => {
      if (canvasRef.current && rendererRef.current && cameraRef.current) {
        const width = canvasRef.current.clientWidth;
        const height = canvasRef.current.clientHeight;
        
        setCanvasDimensions({ width, height });
        
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
        
        rendererRef.current.setSize(width, height);
      }
    }, 100);
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!canvasRef.current) return;
    
    if (!isFullscreen) {
      if (canvasRef.current.requestFullscreen) {
        canvasRef.current.requestFullscreen();
      } else if ((canvasRef.current as any).webkitRequestFullscreen) {
        (canvasRef.current as any).webkitRequestFullscreen();
      } else if ((canvasRef.current as any).mozRequestFullScreen) {
        (canvasRef.current as any).mozRequestFullScreen();
      } else if ((canvasRef.current as any).msRequestFullscreen) {
        (canvasRef.current as any).msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    }
  };

  // Update grid and axis visibility
  useEffect(() => {
    if (!sceneRef.current) return;
    
    // Update grid visibility
    const gridHelper = sceneRef.current.children.find(
      child => child instanceof THREE.GridHelper
    ) as THREE.GridHelper | undefined;
    
    if (gridHelper) {
      gridHelper.visible = gridVisible;
    }
    
    // Update custom axes visibility
    const customAxes = sceneRef.current.children.find(
      child => child.userData.isCustomAxes
    );
    
    if (customAxes) {
      customAxes.visible = axisVisible;
    }
  }, [gridVisible, axisVisible]);

  // Update camera and controls when view mode changes
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current) return;
    
    switch (viewMode) {
      case '2d':
        // Position camera for top-down 2D view
        cameraRef.current.position.set(0, 0, 10);
        cameraRef.current.lookAt(0, 0, 0);
        controlsRef.current.enableRotate = false;
        controlsRef.current.enablePan = true;
        controlsRef.current.minDistance = 0.1;   // Ridotto per permettere uno zoom ravvicinato
        controlsRef.current.maxDistance = 1000;  // Aumentato per permettere una visione d'insieme più ampia
        break;
      case '3d':
        // Position camera for 3D view
        cameraRef.current.position.set(5, 5, 5);
        cameraRef.current.lookAt(0, 0, 0);
        controlsRef.current.enableRotate = true;
        controlsRef.current.enablePan = true;
        controlsRef.current.minDistance = 0.1;   // Ridotto per permettere uno zoom ravvicinato
        controlsRef.current.maxDistance = 1000;  // Aumentato per permettere una visione d'insieme più ampia
        break;
      default:
        break;
    }
  }, [viewMode]);

  // Handle preview component changes
  useEffect(() => {
    if (!sceneRef.current || !previewComponent) {
      // Remove preview object if no component is selected
      if (previewObject && sceneRef.current) {
        sceneRef.current.remove(previewObject);
        setPreviewObject(null);
      }
      return;
    }
    
    // Remove any previous preview objects
    if (previewObject) {
      sceneRef.current.remove(previewObject);
      setPreviewObject(null);
    }
    
    // Find the predefined component if it's a string name
    const component = typeof previewComponent === 'string' 
      ? predefinedComponents.find(c => c.name === previewComponent)
      : previewComponent;
      
    if (!component) return;
    
    // Create a Three.js object based on the component
    const threeObject = createComponentPreview(component);
    if (threeObject) {
      threeObject.position.set(0, 0, 0); // Position at center of scene
      threeObject.userData.isPreview = true;
      sceneRef.current.add(threeObject);
      setPreviewObject(threeObject);
    }
  }, [previewComponent, previewObject]);

  // Create Three.js objects from CAD elements
  const createThreeObject = (element: any): THREE.Object3D | null => {
  const { originOffset } = useCADStore.getState();
  
  switch (element.type) {
    case 'workpiece':
      // Create a transparent cube to represent the raw workpiece
      const workpieceGeometry = new THREE.BoxGeometry(
        element.width,
        element.height,
        element.depth
      );
      
      const workpieceMaterial = new THREE.MeshStandardMaterial({
        color: element.color || 0xaaaaaa,
        wireframe: element.wireframe || false,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
      });
      
      const workpiece = new THREE.Mesh(workpieceGeometry, workpieceMaterial);
      workpiece.position.set(
        (element.x || 0) + originOffset.x, 
        (element.y || 0) + originOffset.y, 
        (element.z || 0) + originOffset.z
      );
      
      if (!element.wireframe) {
        const edgesGeometry = new THREE.EdgesGeometry(workpieceGeometry);
        const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
        const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
        workpiece.add(edges);
      }
      
      return workpiece;
      
    case 'line':
      const lineMaterial = new THREE.LineBasicMaterial({ 
        color: element.color || 0x000000,
        linewidth: element.linewidth || 1
      });
      
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(
          element.x1 + originOffset.x,
          element.y1 + originOffset.y,
          (element.z1 || 0) + originOffset.z
        ),
        new THREE.Vector3(
          element.x2 + originOffset.x,
          element.y2 + originOffset.y,
          (element.z2 || 0) + originOffset.z
        )
      ]);
      
      return new THREE.Line(lineGeometry, lineMaterial);
      
    case 'circle':
      const circleGeometry = new THREE.CircleGeometry(
        element.radius,
        32
      );
      
      const circleMaterial = new THREE.MeshBasicMaterial({
        color: element.color || 0x000000,
        wireframe: true
      });
      
      const circle = new THREE.Mesh(circleGeometry, circleMaterial);
      circle.position.set(
        element.x + originOffset.x,
        element.y + originOffset.y,
        (element.z || 0) + originOffset.z
      );
      
      return circle;
      
    case 'rectangle':
      const rectGeometry = new THREE.PlaneGeometry(
        element.width,
        element.height
      );
      
      const rectMaterial = new THREE.MeshBasicMaterial({
        color: element.color || 0x000000,
        wireframe: true,
        side: THREE.DoubleSide
      });
      
      const rect = new THREE.Mesh(rectGeometry, rectMaterial);
      rect.position.set(
        element.x + originOffset.x,
        element.y + originOffset.y,
        (element.z || 0) + originOffset.z
      );
      
      if (element.angle) {
        rect.rotation.z = element.angle * Math.PI / 180;
      }
      
      return rect;
      
    case 'cube':
      const cubeGeometry = new THREE.BoxGeometry(
        element.width,
        element.height,
        element.depth
      );
      
      const cubeMaterial = new THREE.MeshStandardMaterial({
        color: element.color || 0x1e88e5,
        wireframe: element.wireframe || false
      });
      
      const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
      cube.position.set(
        element.x + originOffset.x,
        element.y + originOffset.y,
        (element.z || 0) + originOffset.z
      );
      
      return cube;
      
    case 'sphere':
      const sphereGeometry = new THREE.SphereGeometry(
        element.radius,
        32,
        32
      );
      
      const sphereMaterial = new THREE.MeshStandardMaterial({
        color: element.color || 0x1e88e5,
        wireframe: element.wireframe || false
      });
      
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.position.set(
        element.x + originOffset.x,
        element.y + originOffset.y,
        (element.z || 0) + originOffset.z
      );
      
      return sphere;
    
    case 'cylinder':
      const cylinderGeometry = new THREE.CylinderGeometry(
        element.radius,
        element.radius,
        element.height,
        element.segments || 32
      );
      
      const cylinderMaterial = new THREE.MeshStandardMaterial({
        color: element.color || 0xFFC107,
        wireframe: element.wireframe || false
      });
      
      const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
      cylinder.position.set(
        element.x + originOffset.x,
        element.y + originOffset.y,
        (element.z || 0) + originOffset.z
      );
      
      cylinder.rotation.x = Math.PI / 2;
      return cylinder;
    
    case 'cone':
      const coneGeometry = new THREE.ConeGeometry(
        element.radius,
        element.height,
        element.segments || 32
      );
      
      const coneMaterial = new THREE.MeshStandardMaterial({
        color: element.color || 0x9C27B0,
        wireframe: element.wireframe || false
      });
      
      const cone = new THREE.Mesh(coneGeometry, coneMaterial);
      cone.position.set(
        element.x + originOffset.x,
        element.y + originOffset.y,
        (element.z || 0) + originOffset.z
      );
      
      cone.rotation.x = Math.PI / 2;
      return cone;
    
    case 'torus':
      const torusGeometry = new THREE.TorusGeometry(
        element.radius,
        element.tube || element.radius / 4,
        element.radialSegments || 16,
        element.tubularSegments || 100
      );
      
      const torusMaterial = new THREE.MeshStandardMaterial({
        color: element.color || 0xFF9800,
        wireframe: element.wireframe || false
      });
      
      const torus = new THREE.Mesh(torusGeometry, torusMaterial);
      torus.position.set(
        element.x + originOffset.x,
        element.y + originOffset.y,
        (element.z || 0) + originOffset.z
      );
      
      return torus;
    
    case 'polygon':
      const polygonShape = new THREE.Shape();
      
      if (element.points && element.points.length >= 3) {
        const firstPoint = element.points[0];
        polygonShape.moveTo(firstPoint.x, firstPoint.y);
        
        for (let i = 1; i < element.points.length; i++) {
          polygonShape.lineTo(element.points[i].x, element.points[i].y);
        }
        
        polygonShape.closePath();
        
        const polygonGeometry = new THREE.ShapeGeometry(polygonShape);
        const polygonMaterial = new THREE.MeshBasicMaterial({
          color: element.color || 0x795548,
          wireframe: element.wireframe || true,
          side: THREE.DoubleSide
        });
        
        const polygon = new THREE.Mesh(polygonGeometry, polygonMaterial);
        polygon.position.set(
          (element.x || 0) + originOffset.x,
          (element.y || 0) + originOffset.y,
          (element.z || 0) + originOffset.z
        );
        
        return polygon;
      }
      return null;
    
    case 'extrusion':
      if (!element.shape || !element.depth) return null;
      
      const extrudeShape = new THREE.Shape();
      if (element.shape === 'rect') {
        const width = element.width || 50;
        const height = element.height || 30;
        extrudeShape.moveTo(-width/2, -height/2);
        extrudeShape.lineTo(width/2, -height/2);
        extrudeShape.lineTo(width/2, height/2);
        extrudeShape.lineTo(-width/2, height/2);
        extrudeShape.closePath();
      } else if (element.shape === 'circle') {
        const radius = element.radius || 25;
        extrudeShape.absarc(0, 0, radius, 0, Math.PI * 2, false);
      } else if (element.points && element.points.length >= 3) {
        const firstPoint = element.points[0];
        extrudeShape.moveTo(firstPoint.x, firstPoint.y);
        
        for (let i = 1; i < element.points.length; i++) {
          extrudeShape.lineTo(element.points[i].x, element.points[i].y);
        }
        
        extrudeShape.closePath();
      }
      
      const extrudeSettings = {
        depth: element.depth,
        bevelEnabled: element.bevel || false,
        bevelThickness: element.bevelThickness || 1,
        bevelSize: element.bevelSize || 1,
        bevelSegments: element.bevelSegments || 1
      };
      
      const extrudeGeometry = new THREE.ExtrudeGeometry(extrudeShape, extrudeSettings);
      const extrudeMaterial = new THREE.MeshStandardMaterial({
        color: element.color || 0x4CAF50,
        wireframe: element.wireframe || false
      });
      
      const extrusion = new THREE.Mesh(extrudeGeometry, extrudeMaterial);
      extrusion.position.set(
        (element.x || 0) + originOffset.x,
        (element.y || 0) + originOffset.y,
        (element.z || 0) + originOffset.z
      );
      
      return extrusion;
    
    case 'tube':
      if (!element.path || element.path.length < 2) return null;
      
      // Apply origin offset to all path points
      const offsetPath = element.path.map((pt: { x: number, y: number, z?: number }) => 
        new THREE.Vector3(
          pt.x + originOffset.x,
          pt.y + originOffset.y,
          (pt.z || 0) + originOffset.z
        )
      );
      
      const curve = new THREE.CatmullRomCurve3(offsetPath);
      
      const tubeGeometry = new THREE.TubeGeometry(
        curve,
        element.tubularSegments || 64,
        element.radius || 1,
        element.radialSegments || 8,
        element.closed || false
      );
      
      const tubeMaterial = new THREE.MeshStandardMaterial({
        color: element.color || 0x2196F3,
        wireframe: element.wireframe || false
      });
      
      return new THREE.Mesh(tubeGeometry, tubeMaterial);
    
    case 'lathe':
      if (!element.points || element.points.length < 2) return null;
      
      const lathePoints = element.points.map((pt: { x: number, y: number }) => 
        new THREE.Vector2(pt.x, pt.y)
      );
      
      const latheGeometry = new THREE.LatheGeometry(
        lathePoints,
        element.segments || 12,
        element.phiStart || 0,
        element.phiLength || Math.PI * 2
      );
      
      const latheMaterial = new THREE.MeshStandardMaterial({
        color: element.color || 0x607D8B,
        wireframe: element.wireframe || false
      });
      
      const lathe = new THREE.Mesh(latheGeometry, latheMaterial);
      lathe.position.set(
        (element.x || 0) + originOffset.x,
        (element.y || 0) + originOffset.y,
        (element.z || 0) + originOffset.z
      );
      
      return lathe;
      
    case 'text':
      if (!element.text) return null;
      
      // Assuming you have a TextGeometry implementation or similar
      // This is a placeholder as THREE.TextGeometry requires font loading
      const textGeometry = new THREE.PlaneGeometry(
        element.width || element.text.length * 5,
        element.height || 10
      );
      
      const textMaterial = new THREE.MeshBasicMaterial({
        color: element.color || 0x000000,
        wireframe: true
      });
      
      const text = new THREE.Mesh(textGeometry, textMaterial);
      text.position.set(
        (element.x || 0) + originOffset.x,
        (element.y || 0) + originOffset.y,
        (element.z || 0) + originOffset.z
      );
      
      return text;
    
    case 'grid':
      const gridHelper = new THREE.GridHelper(
        element.size || 100,
        element.divisions || 10,
        element.colorCenterLine || 0x444444,
        element.colorGrid || 0x888888
      );
      
      if (element.plane === 'xy') {
        gridHelper.rotation.x = Math.PI / 2;
      }
      
      gridHelper.position.set(
        (element.x || 0) + originOffset.x,
        (element.y || 0) + originOffset.y,
        (element.z || 0) + originOffset.z
      );
      
      return gridHelper;
      
    case 'group':
      if (!element.elements || !Array.isArray(element.elements)) return null;
      
      const group = new THREE.Group();
      group.position.set(
        (element.x || 0) + originOffset.x,
        (element.y || 0) + originOffset.y,
        (element.z || 0) + originOffset.z
      );
      
      // Create and add all child elements
      element.elements.forEach((childElement: any) => {
        const child = createThreeObject(childElement);
        if (child) {
          group.add(child);
        }
      });
      
      return group;
      
    default:
      console.warn(`Unknown element type: ${element.type}`);
      return null;
  }
};

  // Handle mouse move for hover effects and control points
  
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
      // Se stiamo posizionando un componente, usa la logica di anteprima
      if (isPlacingComponent) {
        handleMouseMoveForPreview(event);
        return;
      }
    if (!canvasRef.current || !sceneRef.current || !cameraRef.current) return;
    
    // Don't process hover effects during camera movement
    if (controlsRef.current?.enabled && controlsRef.current?.enablePan && event.buttons > 0) {
      return;
    }
    
    // Calculate normalized device coordinates (-1 to +1)
    const rect = canvasRef.current.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Update raycaster
    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    
    // If we're actively dragging a control point
    if (activeDragPoint) {
      // Calculate the intersection point with a plane
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1)); // XY plane
      const planeIntersection = new THREE.Vector3();
      raycasterRef.current.ray.intersectPlane(plane, planeIntersection);
      
      // Update the control point position
      handleControlPointDrag(
        activeDragPoint.elementId,
        activeDragPoint.pointIndex,
        planeIntersection.x,
        planeIntersection.y,
        planeIntersection.z
      );
      
      // Update the control points visual positions
      updateControlPoints();
      return;
    }
    
    // Check for control point intersections first
    const controlPointIntersects = raycasterRef.current.intersectObjects(
      controlPointsRef.current
    );
    
    if (controlPointIntersects.length > 0) {
      const intersectedPoint = controlPointIntersects[0].object;
      if (intersectedPoint.userData.isControlPoint) {
        setHoveredControlPoint({
          elementId: intersectedPoint.userData.elementId,
          pointIndex: intersectedPoint.userData.pointIndex
        });
        canvasRef.current.style.cursor = 'pointer';
        return;
      }
    } else {
      setHoveredControlPoint(null);
    }
    
    // Check for element intersections
    const elementIntersects = raycasterRef.current.intersectObjects(
      sceneRef.current.children.filter(child => child.userData.isCADElement)
    );
    
    if (elementIntersects.length > 0) {
      const intersectedObject = elementIntersects[0].object;
      const elementId = intersectedObject.userData.elementId;
      
      if (elementId) {
        setHoveredElementId(elementId);
        canvasRef.current.style.cursor = 'pointer';
      }
    } else {
      setHoveredElementId(null);
      canvasRef.current.style.cursor = 'default';
    }
    
    // Update mouse position in 3D space for status bar
    // Convert screen coordinates to 3D world coordinates
    const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const mouse3D = new THREE.Vector3(mouseRef.current.x, mouseRef.current.y, 0);
    mouse3D.unproject(cameraRef.current);
    
    const raycaster = new THREE.Raycaster(cameraRef.current.position, 
      mouse3D.sub(cameraRef.current.position).normalize());
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(planeZ, intersection);
    
    // Update store with mouse position
    setMousePosition({
      x: Math.round(intersection.x * 100) / 100,
      y: Math.round(intersection.y * 100) / 100,
      z: Math.round(intersection.z * 100) / 100
    });
  }, [activeDragPoint, handleControlPointDrag, setMousePosition, updateControlPoints, isPlacingComponent, handleMouseMoveForPreview]);

  // Handle mouse down for element selection or control point dragging
  const handleMouseDown = useCallback((event: React.MouseEvent) => {

    if (isPlacingComponent) {
      // Se stiamo posizionando un componente, gestiamo il click per il posizionamento
      handleClickForPlacement(event);
      return;
    }
    if (!canvasRef.current || !sceneRef.current || !cameraRef.current) return;
    
    // Only handle left clicks
    if (event.button !== 0) return;
    
    // Calculate normalized device coordinates
    const rect = canvasRef.current.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Update raycaster
    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    
    // Check for control point intersections first
    const controlPointIntersects = raycasterRef.current.intersectObjects(
      controlPointsRef.current
    );
    
    if (controlPointIntersects.length > 0) {
      const intersectedPoint = controlPointIntersects[0].object;
      if (intersectedPoint.userData.isControlPoint) {
        // Starting a control point drag
        event.stopPropagation();
        setActiveDragPoint({
          elementId: intersectedPoint.userData.elementId,
          pointIndex: intersectedPoint.userData.pointIndex
        });
        setIsDragging(true);
        
        // Disable orbit controls while dragging
        if (controlsRef.current) {
          controlsRef.current.enabled = false;
        }
        return;
      }
    }
    
    // If not clicking on a control point, check for element intersections
    const elementIntersects = raycasterRef.current.intersectObjects(
      sceneRef.current.children.filter(child => child.userData.isCADElement)
    );
    
    if (elementIntersects.length > 0) {
      const intersectedObject = elementIntersects[0].object;
      const elementId = intersectedObject.userData.elementId;
      
      if (elementId) {
        selectElement(elementId);
      }
    } else {
      // Clicked on empty space, deselect
      selectElement(null);
      updateControlPoints(); // Clear control points
    }
  }, [selectElement, updateControlPoints, isPlacingComponent, handleClickForPlacement]);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPlacingComponent) {
        // Annulla il posizionamento
        if (previewRef.current && sceneRef.current) {
          sceneRef.current.remove(previewRef.current);
          previewRef.current = null;
        }
        setIsPlacingComponent(false);
        
        // Riabilita i controlli orbitali
        if (controlsRef.current) {
          controlsRef.current.enabled = true;
        }
        
        // Notifica che l'utente ha annullato
        if (onComponentPlaced) {
          onComponentPlaced(previewComponent || '', { x: 0, y: 0, z: 0 });
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPlacingComponent, previewComponent, onComponentPlaced]);

  // Handle mouse up to finish dragging
  const handleMouseUp = useCallback(() => {
    if (activeDragPoint) {
      setActiveDragPoint(null);
      if (controlsRef.current) {
        controlsRef.current.enabled = true;
      }
    }
    setIsDragging(false);
  }, [activeDragPoint]);

  // Update control points when selected element changes
  useEffect(() => {
    updateControlPoints();
  }, [selectedElement, updateControlPoints]);

  // Update camera and controls when view mode changes
  
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current || !sceneRef.current) return;
    
    switch (viewMode) {
      case '2d':
        // Set dark background for 2D mode
        sceneRef.current.background = new THREE.Color('#2A2A2A');
        
        // Position camera to look at XZ plane (from Y axis)
        cameraRef.current.position.set(0, 50, 0);
        cameraRef.current.up.set(0, 0, 1); // Set Z as the up direction
        cameraRef.current.lookAt(0, 0, 0);
        
        // Update grid for XZ plane view
        const gridHelper = sceneRef.current.children.find(
          child => child instanceof THREE.GridHelper
        ) as THREE.GridHelper | undefined;
        
        if (gridHelper) {
          gridHelper.material.opacity = 0.2;
          gridHelper.material.transparent = true;
          // Align grid with XZ plane
          gridHelper.rotation.x = 0;
        }
        
        // Disable rotation in 2D mode
        controlsRef.current.enableRotate = false;
        controlsRef.current.enablePan = true;
        
        // Show only X and Z axes in 2D mode
        const customAxes = sceneRef.current.children.find(
          child => child.userData.isCustomAxes
        );
        
        if (customAxes) {
          customAxes.visible = axisVisible;
          customAxes.children.forEach((child, index) => {
            // Show X (index 0) and Z (index 2), hide Y (index 1)
            if (index === 1) {
              child.visible = false;
            } else {
              child.visible = true;
            }
          });
        }
        break;
        
      case '3d':
        // Restore original background color for 3D mode
        sceneRef.current.background = new THREE.Color('#2A2A2A');
        
        // Reset camera for 3D view
        cameraRef.current.position.set(5, 5, 5);
        cameraRef.current.up.set(0, 1, 0); // Reset up vector to Y
        cameraRef.current.lookAt(0, 0, 0);
        
        // Enable all controls for 3D mode
        controlsRef.current.enableRotate = true;
        controlsRef.current.enablePan = true;
        
        // Show all axes in 3D mode
        const axes3D = sceneRef.current.children.find(
          child => child.userData.isCustomAxes
        );
        
        if (axes3D) {
          axes3D.visible = axisVisible;
          axes3D.children.forEach(child => {
            child.visible = true;
          });
        }
        break;
        
      default:
        break;
    }
  }, [viewMode, axisVisible]);

  useEffect(() => {
    if (!sceneRef.current) return;
    
    const { originOffset } = useCADStore.getState();
    
    // Aggiornare posizione griglia
    const gridHelper = sceneRef.current.children.find(
      child => child instanceof THREE.GridHelper
    ) as THREE.GridHelper | undefined;
    
    if (gridHelper) {
      gridHelper.visible = gridVisible;
      // Sposta la griglia per compensare l'offset dell'origine
      gridHelper.position.set(originOffset.x, originOffset.y, originOffset.z);
    }
    
    // Aggiornare posizione assi
    const customAxes = sceneRef.current.children.find(
      child => child.userData.isCustomAxes
    );
    
    if (customAxes) {
      customAxes.visible = axisVisible;
      customAxes.position.set(originOffset.x, originOffset.y, originOffset.z);
    }
    
    // Aggiungi indicatore visuale dell'origine
    addOriginIndicator();
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridVisible, axisVisible, useCADStore.getState().originOffset]);
  
  // Funzione per aggiungere l'indicatore dell'origine
  const addOriginIndicator = () => {
    if (!sceneRef.current) return;
    
    // Rimuovi indicatore esistente se presente
    const existingIndicator = sceneRef.current.children.find(
      child => child.userData.isOriginIndicator
    );
    
    if (existingIndicator) {
      sceneRef.current.remove(existingIndicator);
    }
    
    // Crea nuovo indicatore
    const originIndicator = new THREE.Group();
    originIndicator.userData.isOriginIndicator = true;
    
    // Piccolo punto all'origine
    const pointGeometry = new THREE.SphereGeometry(2, 16, 16);
    const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const point = new THREE.Mesh(pointGeometry, pointMaterial);
    originIndicator.add(point);
    
    sceneRef.current.add(originIndicator);
  };
  // Render elements when they change
  useEffect(() => {
    if (!sceneRef.current) return;
    
    // Remove existing elements
    const elementsToRemove = sceneRef.current.children.filter(
      child => child.userData.isCADElement
    );
    
    elementsToRemove.forEach(element => {
      sceneRef.current?.remove(element);
    });
    
    // Aggrega elementi per tipo per potenziale instanziazione
    const elementsByType: Record<string, any[]> = {};
    
    elements.forEach(element => {
      const layer = layers.find(l => l.id === element.layerId);
      if (!layer || !layer.visible) return;
      
      const type = element.type;
      if (!elementsByType[type]) {
        elementsByType[type] = [];
      }
      elementsByType[type].push(element);
    });
    
    // Per ogni tipo di elemento, determina se usare instanziazione o renderizzazione individuale
    Object.entries(elementsByType).forEach(([type, elements]) => {
      if (elements.length > 20 && ['cube', 'sphere', 'cylinder'].includes(type)) {
        // Usa InstancedMesh per tipi semplici con molte istanze
        createInstancedMesh(type, elements);
      } else {
        // Renderizza individualmente
        elements.forEach(element => {
          const threeObject = createThreeObject(element);
          if (threeObject) {
            threeObject.userData.isCADElement = true;
            threeObject.userData.elementId = element.id;
            
            // Evidenziazione e selezione
            highlightElement(threeObject, element);
            
            sceneRef.current?.add(threeObject);
          }
        });
      }
    });
    
    // Applica LOD dopo aver aggiunto tutti gli elementi
    if (typeof applyLOD === 'function') {
      applyLOD();
    }
    
    // Ottimizza la scena (merge di geometrie, etc)
    if (typeof optimizeScene === 'function') {
      optimizeScene();
    }
    
    // Aggiorna i punti di controllo
    if (typeof updateControlPoints === 'function') {
      updateControlPoints();
    }
  }, [elements, layers, hoveredElementId, selectedElement, applyLOD, optimizeScene, updateControlPoints, createThreeObject]);

  // Funzione ottimizzata per gestire il drag & drop dalla libreria
  const handleComponentDragOver = useCallback((event: React.DragEvent) => {
    if (!allowDragDrop) return;
    
    event.preventDefault();
    setIsDraggingComponent(true);
    
    if (!canvasRef.current || !cameraRef.current || !sceneRef.current) return;
    
    try {
      // Calcola le coordinate normalizzate del mouse
      const rect = canvasRef.current.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      // Calcola l'intersezione con un piano XY
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouseRef.current, cameraRef.current);
      
      // Verifica intersezione con oggetti esistenti o usa un piano di base
      const intersects = raycaster.intersectObjects(
        sceneRef.current.children.filter(child => 
          child.userData?.isCADElement && 
          child.visible
        ),
        true
      );
      
      let targetPosition: { x: number, y: number, z: number };
      
      if (intersects.length > 0) {
        // Usa il punto di intersezione più vicino
        const point = intersects[0].point;
        targetPosition = { x: point.x, y: point.y, z: point.z };
      } else {
        // Calcola intersezione con il piano XY
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1));
        const intersection = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(plane, intersection)) {
          targetPosition = { 
            x: intersection.x - originOffset.x, 
            y: intersection.y - originOffset.y, 
            z: intersection.z - originOffset.z 
          };
        } else {
          // Fallback
          targetPosition = { x: 0, y: 0, z: 0 };
        }
      }
      
      // Applica snapping se necessario
      if (snapSettings.enabled) {
        const snappedPoint = snapToPoint(targetPosition);
        if (snappedPoint) {
          targetPosition = snappedPoint;
        }
      }
      
      // Calcola posizione sullo schermo per l'indicatore
      const worldPos = new THREE.Vector3(
        targetPosition.x + originOffset.x,
        targetPosition.y + originOffset.y,
        targetPosition.z + originOffset.z
      );
      const screenPos = worldToScreen(worldPos);
      
      setDropPosition(targetPosition);
      setDropScreenPosition(screenPos || undefined);
      
    } catch (error) {
      console.error("Error during drag over:", error);
    }
  }, [allowDragDrop, snapSettings.enabled, snapToPoint, originOffset]);

  const handleComponentDrop = useCallback((event: React.DragEvent) => {
    if (!allowDragDrop) return;
    
    event.preventDefault();
    const componentId = event.dataTransfer.getData('component/id');
    
    if (!componentId) return;
    
    // Recupera il componente dalla libreria
    const component = predefinedComponents.find(c => c.data === componentId || c.name === componentId);
    
    if (!component) return;
    
    // Crea un nuovo elemento CAD basato sul componente
    const newElement = transformLibraryItemToCADElement(component, dropPosition);
    
    // Aggiungi l'elemento al canvas
    addElement(newElement);
    
    // Resetta gli stati del drag & drop
    setIsDraggingComponent(false);
    setDraggedComponent(null);
  }, [allowDragDrop, dropPosition, addElement]);

  const handleComponentDragLeave = useCallback(() => {
    setIsDraggingComponent(false);
  }, []);

  // Hook per ottimizzare la renderizzazione degli elementi con useMemo
  useEffect(() => {
    if (!sceneRef.current) return;
    
    // Rimuovi elementi CAD esistenti dalla scena
    const elementsToRemove = sceneRef.current.children
      .filter(child => child.userData && child.userData.isCADElement)
      .slice();
    
    elementsToRemove.forEach(element => {
      sceneRef.current?.remove(element);
    });
    
    // Aggrega elementi per tipo per potenziale instanziazione
    const elementsByType: Record<string, any[]> = {};
    
    elements.forEach(element => {
      const layer = layers.find(l => l.id === element.layerId);
      if (!layer || !layer.visible) return;
      
      const type = element.type;
      if (!elementsByType[type]) {
        elementsByType[type] = [];
      }
      elementsByType[type].push(element);
    });
    
    // Per ogni tipo di elemento, determina se usare instanziazione o renderizzazione individuale
    Object.entries(elementsByType).forEach(([type, elements]) => {
      if (elements.length > 20 && ['cube', 'sphere', 'cylinder'].includes(type)) {
        // Usa InstancedMesh per tipi semplici con molte istanze
        createInstancedMesh(type, elements);
      } else {
        // Renderizza individualmente
        elements.forEach(element => {
          const threeObject = createThreeObject(element);
          if (threeObject) {
            threeObject.userData.isCADElement = true;
            threeObject.userData.elementId = element.id;
            
            // Evidenziazione e selezione
            highlightElement(threeObject, element);
            
            sceneRef.current?.add(threeObject);
          }
        });
      }
    });
    
    // Applica LOD dopo aver aggiunto tutti gli elementi
    if (typeof applyLOD === 'function') {
      applyLOD();
    }
    
    // Ottimizza la scena (merge di geometrie, etc)
    if (typeof optimizeScene === 'function') {
      optimizeScene();
    }
    
    // Aggiorna i punti di controllo
    if (typeof updateControlPoints === 'function') {
      updateControlPoints();
    }
    
  }, [elements, layers, hoveredElementId, selectedElement, applyLOD, optimizeScene, updateControlPoints, createThreeObject]);

  // Funzione per creare mesh istanziati per elementi simili
  const createInstancedMesh = useCallback((type: string, elements: any[]) => {
    if (!sceneRef.current) return;
    
    // Crea geometria in base al tipo
    let geometry: THREE.BufferGeometry;
    
    switch (type) {
      case 'cube':
        geometry = new THREE.BoxGeometry(1, 1, 1);
        break;
      case 'sphere':
        geometry = new THREE.SphereGeometry(1, 16, 16);
        break;
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(1, 1, 1, 16);
        break;
      default:
        return;
    }
    
    // Crea materiale
    const material = new THREE.MeshStandardMaterial();
    
    // Crea InstancedMesh
    const instancedMesh = new THREE.InstancedMesh(
      geometry,
      material,
      elements.length
    );
    instancedMesh.userData.isCADElement = true;
    instancedMesh.userData.isInstanced = true;
    instancedMesh.userData.instanceMap = new Map();
    
    // Configura ogni istanza
    elements.forEach((element, index) => {
      const matrix = new THREE.Matrix4();
      const position = new THREE.Vector3(
        element.x + originOffset.x,
        element.y + originOffset.y,
        (element.z || 0) + originOffset.z
      );
      
      // Applica scala in base al tipo
      let scale: THREE.Vector3;
      
      switch (type) {
        case 'cube':
          scale = new THREE.Vector3(element.width, element.height, element.depth);
          break;
        case 'sphere':
          scale = new THREE.Vector3(element.radius * 2, element.radius * 2, element.radius * 2);
          break;
        case 'cylinder':
          scale = new THREE.Vector3(element.radius * 2, element.height, element.radius * 2);
          break;
        default:
          scale = new THREE.Vector3(1, 1, 1);
      }
      
      // Imposta matrice di trasformazione
      matrix.compose(position, new THREE.Quaternion(), scale);
      instancedMesh.setMatrixAt(index, matrix);
      
      // Imposta colore
      const color = new THREE.Color(element.color || 0x1e88e5);
      instancedMesh.setColorAt(index, color);
      
      // Mappa l'elemento all'indice
      instancedMesh.userData.instanceMap.set(element.id, index);
    });
    
    instancedMesh.instanceMatrix.needsUpdate = true;
    if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;
    
    sceneRef.current.add(instancedMesh);
  }, [originOffset]);

  // Funzione per evidenziare elementi
  const highlightElement = useCallback((threeObject: THREE.Object3D, element: any) => {
    if (element.id === hoveredElementId) {
      if (threeObject instanceof THREE.Line) {
        (threeObject.material as THREE.LineBasicMaterial).color.set(0x4a90e2);
        (threeObject.material as THREE.LineBasicMaterial).linewidth = (element.linewidth || 1) + 1;
      } else if (threeObject instanceof THREE.Mesh) {
        if ((threeObject.material as THREE.MeshBasicMaterial).wireframe) {
          (threeObject.material as THREE.MeshBasicMaterial).color.set(0x4a90e2);
        } else {
          const material = threeObject.material as THREE.MeshStandardMaterial;
          material.emissive.set(0x4a90e2);
          material.emissiveIntensity = 0.3;
        }
      }
    }
    
    if (selectedElement && element.id === selectedElement.id) {
      if (threeObject instanceof THREE.Line) {
        (threeObject.material as THREE.LineBasicMaterial).color.set(0xff3366);
        (threeObject.material as THREE.LineBasicMaterial).linewidth = (element.linewidth || 1) + 2;
      } else if (threeObject instanceof THREE.Mesh) {
        if ((threeObject.material as THREE.MeshBasicMaterial).wireframe) {
          (threeObject.material as THREE.MeshBasicMaterial).color.set(0xff3366);
        } else {
          const material = threeObject.material as THREE.MeshStandardMaterial;
          material.emissive.set(0xff3366);
          material.emissiveIntensity = 0.5;
        }
      }
    }
  }, [hoveredElementId, selectedElement]);

  // Inizializzazione dei TransformControls
  useEffect(() => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;
    
    // Crea transform controls per manipolazione diretta
    const transformControls = new TransformControls(
      cameraRef.current,
      rendererRef.current.domElement
    );
    transformControls.size = 0.8; // Dimensione ridotta per non intralciare
    transformControls.addEventListener('dragging-changed', (event: THREE.Event) => {
      if (controlsRef.current) {
        controlsRef.current.enabled = !(event as any).value;
      }
    });
    
    sceneRef.current.add(transformControls);
    transformControlsRef.current = transformControls;
    
    return () => {
      if (transformControls && sceneRef.current) {
        sceneRef.current.remove(transformControls);
      }
    };
  }, []);

  // Aggiorna transform controls quando cambia l'elemento selezionato
  useEffect(() => {
    if (!transformControlsRef.current) return;
    
    if (selectedElement) {
      // Trova l'oggetto threejs corrispondente all'elemento selezionato
      const selectedObject = sceneRef.current?.children.find(
        child => child.userData?.isCADElement && child.userData?.elementId === selectedElement.id
      );
      
      if (selectedObject) {
        try {
          // Se è un gruppo o un oggetto complesso, trova il primo mesh figlio
          let targetObject = selectedObject;
          
          // Cerca un mesh figlio appropriato se l'oggetto selezionato è un gruppo
          if (selectedObject instanceof THREE.Group) {
            selectedObject.traverse(child => {
              if (child instanceof THREE.Mesh && !(targetObject instanceof THREE.Mesh)) {
                targetObject = child;
              }
            });
          }
          
          transformControlsRef.current.attach(targetObject);
          transformControlsRef.current.setMode(transformMode);
          transformControlsRef.current.visible = true;
          
          // Assicurati che i controlli siano in cima alla gerarchia della scena
          if (sceneRef.current) {
            sceneRef.current.remove(transformControlsRef.current);
            sceneRef.current.add(transformControlsRef.current);
          }
        } catch (error) {
          console.error("Error attaching transform controls:", error);
          transformControlsRef.current.detach();
          transformControlsRef.current.visible = false;
        }
      } else {
        transformControlsRef.current.detach();
        transformControlsRef.current.visible = false;
      }
    } else {
      transformControlsRef.current.detach();
      transformControlsRef.current.visible = false;
    }
  }, [selectedElement, transformMode]);

  // Gestisci aggiornamenti quando un elemento viene modificato tramite transform controls
  useEffect(() => {
    if (!transformControlsRef.current) return;
    
    const handleObjectChange = () => {
      if (!selectedElement) return;
      
      const object = transformControlsRef.current?.object;
      if (!object) return;
      
      // Estrai posizione, rotazione e scala
      const position = new THREE.Vector3();
      const rotation = new THREE.Euler();
      const scale = new THREE.Vector3();
      
      object.getWorldPosition(position);
      rotation.copy(object.rotation);
      scale.copy(object.scale);
      
      // Aggiorna l'elemento nel store
      const updates: any = {
        x: position.x - originOffset.x,
        y: position.y - originOffset.y,
        z: position.z - originOffset.z
      };
      
      // Aggiungi rotazione in gradi
      if (transformMode === 'rotate') {
        updates.rotationX = THREE.MathUtils.radToDeg(rotation.x);
        updates.rotationY = THREE.MathUtils.radToDeg(rotation.y);
        updates.rotationZ = THREE.MathUtils.radToDeg(rotation.z);
      }
      
      // Aggiungi scala
      if (transformMode === 'scale') {
        updates.scaleX = scale.x;
        updates.scaleY = scale.y;
        updates.scaleZ = scale.z;
      }
      
      updateElement(selectedElement.id, updates);
    };
    
    transformControlsRef.current.addEventListener('objectChange', handleObjectChange);
    
    return () => {
      transformControlsRef.current?.removeEventListener('objectChange', handleObjectChange);
    };
  }, [selectedElement, updateElement, originOffset, transformMode]);

  // Aggiungi questa funzione ausiliaria per implementare la conversione da 3D a 2D
  const worldToScreen = (worldPos: THREE.Vector3): { x: number, y: number } | null => {
    if (!cameraRef.current || !canvasRef.current) return null;
    
    const vector = worldPos.clone();
    const canvas = canvasRef.current;
    
    // Proietta dalla posizione 3D allo spazio normalizzato 2D
    vector.project(cameraRef.current);
    
    // Converti lo spazio normalizzato in coordinate del canvas
    return { 
      x: ((vector.x + 1) / 2) * canvas.clientWidth,
      y: ((-vector.y + 1) / 2) * canvas.clientHeight
    };
  };

  // Aggiungi questa funzione all'interno del componente CADCanvas
  const getScreenPosition = (position3D: THREE.Vector3): { x: number, y: number } | null => {
    if (!cameraRef.current || !rendererRef.current) return null;
    
    const vector = position3D.clone();
    const canvas = rendererRef.current.domElement;
    
    vector.project(cameraRef.current);
    
    return { 
      x: (vector.x * 0.5 + 0.5) * canvas.width,
      y: (vector.y * -0.5 + 0.5) * canvas.height
    };
  };



  

  return (
    <div 
      ref={canvasRef} 
      style={{ 
        width: width,
        height: height
      }}
      className={`relative bg-gray-200 overflow-hidden ${isPlacingComponent || isDraggingComponent ? 'cursor-cell' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onDragOver={handleComponentDragOver}
      onDrop={handleComponentDrop}
      onDragLeave={handleComponentDragLeave}
    >
      <SnapIndicator 
        x={snapIndicator.x} 
        y={snapIndicator.y} 
        type={snapIndicator.type} 
        visible={snapIndicator.visible} 
      />
      
      {/* Istruzioni per il posizionamento */}
      {isPlacingComponent && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-md shadow-lg z-100">
          <p className="text-sm font-medium">Click per posizionare il componente o premere ESC per annullare</p>
        </div>
      )}
      
      {/* Indicatore per drag & drop */}
      {isDraggingComponent && (
        <DragDropIndicator 
          position={dropPosition} 
          screenPosition={dropScreenPosition}
        />
      )}
      
      {/* Pannello degli strumenti di trasformazione */}
      {selectedElement && (
        <div className="absolute top-4 right-4 flex space-x-2 bg-[#F8FBFF] dark:bg-gray-800 p-2 rounded-md shadow-md z-10">
          <button 
            onClick={() => {
              setTransformMode('translate');
              transformControlsRef.current?.setMode('translate');
            }}
            className={`p-2 rounded ${transformMode === 'translate' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
            title="Move (G)"
          >
            <Move size={16} />
          </button>
          <button 
            onClick={() => {
              setTransformMode('rotate');
              transformControlsRef.current?.setMode('rotate');
            }}
            className={`p-2 rounded ${transformMode === 'rotate' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
            title="Rotate (R)"
          >
            <RotateCw size={16} />
          </button>
          <button 
            onClick={() => {
              setTransformMode('scale');
              transformControlsRef.current?.setMode('scale');
            }}
            className={`p-2 rounded ${transformMode === 'scale' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'}`}
            title="Scale (S)"
          >
            <Maximize size={16} />
          </button>
        </div>
      )}
      {/* Pannello performance */}
      
      
      {/* Fullscreen button */}
      <div className="absolute bottom-4 right-4 flex space-x-2">
       
        <button
          onClick={toggleFullscreen}
          className="p-2 bg-[#F8FBFF] dark:bg-black dark:text-white bg-opacity-80 rounded-md shadow-md hover:bg-opacity-100 z-10 transition-all duration-200"
          title={isFullscreen ? "Exit fullscreen mode" : "Fullscreen view"}
        >
          {isFullscreen ? (
            <Minimize2 size={20} className="text-gray-700" />
          ) : (
            <Maximize2 size={20} className="text-gray-700" />
          )}
        </button>
      </div>
      
      {/* Keyboard shortcuts info - attivato con ? */}
      <div className="absolute bottom-4 left-4">
        <div>
      <button 
        onClick={() => setShowKeyboardShortcuts(true)}
        className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300"
        title="Show keyboard shortcuts"
      >
        <HelpCircle size={16} />
      </button>
      
      {/* Render dialog outside of button */}
      <ShortcutsDialog 
        isOpen={showKeyboardShortcuts} 
        onClose={() => setShowKeyboardShortcuts(false)} 
      />
      </div>
      </div>
    </div>
  );
};

export default CADCanvas;
declare global {
  interface Window {
    cadCanvasScene?: THREE.Scene;
    cadCanvasCamera?: THREE.Camera;
    exposeCADCanvasAPI?: boolean;
  }
}