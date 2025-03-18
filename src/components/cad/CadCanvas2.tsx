import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import { useCADStore } from 'src/store/cadStore';
import { useElementsStore } from 'src/store/elementsStore';
import { useLayerStore } from 'src/store/layerStore';
import { HelpCircle, Maximize, Maximize2, Minimize2, Move, RotateCw, Users, Save } from 'react-feather';
import { transformLibraryItemToCADElement, createComponentPreview } from '@/src/lib/libraryTransform';
import SnapIndicator from './SnapIndicator';
import { useSnap } from '@/src/hooks/useSnap';
import { useLOD } from 'src/hooks/canvas/useLod';
import { useThreePerformance } from 'src/hooks/canvas/useThreePerformance';
import { useCADKeyboardShortcuts } from 'src/hooks/useCADKeyboardShortcuts';
import DragDropIndicator from './DragDropIndicator';
import ShortcutsDialog, { ShortcutCategory } from '../ShortcutsDialog';
import { useCADSelection } from 'src/hooks/useCadSelection';
import SelectionControls from './SelectionControls';
import SaveSelectionModal from './SaveSelectionModal';
import { createComponentFromElements } from 'src/lib/componentsService';
import toast from 'react-hot-toast';

// Import exporters for model export
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';

interface CADCanvasProps {
  width?: string | number;
  height?: string | number;
  previewComponent?: string | null;
  onComponentPlaced?: (component: string, position: {x: number, y: number, z: number}) => void;
  allowDragDrop?: boolean;
}

interface CommandHistory {
  undo: () => void;
  redo: () => void;
  description: string;
}

// For window augmentation
declare global {
  interface Window {
    cadCanvasScene?: THREE.Scene;
    cadCanvasCamera?: THREE.Camera;
    exposeCADCanvasAPI?: boolean;
    cadExporter?: {
      exportSTEP: (scene: THREE.Scene | null, filename: string) => void;
    };
  }
}

const CADCanvasEnhanced: React.FC<CADCanvasProps> = ({ 
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
  const { elements, selectedElement, selectElement, setMousePosition, updateElement, addElement, selectedElements } = useElementsStore();
  const { layers } = useLayerStore();
  const selectedObjectsRef = useRef<THREE.Object3D[]>([]);
  
  // State for component preview and placement
  const [isPlacingComponent, setIsPlacingComponent] = useState<boolean>(false);
  const [previewPosition, setPreviewPosition] = useState<{x: number, y: number, z: number}>({x: 0, y: 0, z: 0});
  const previewRef = useRef<THREE.Object3D | null>(null);
  
  // State for UI elements
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
  const [hoveredControlPoint, setHoveredControlPoint] = useState<{elementId: string, pointIndex: number} | null>(null);
  const [activeDragPoint, setActiveDragPoint] = useState<{elementId: string, pointIndex: number} | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  
  // State for transform controls
  const transformControlsRef = useRef<TransformControls | null>(null);
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate');
  
  // State for drag and drop
  const [isDraggingComponent, setIsDraggingComponent] = useState(false);
  const [draggedComponent, setDraggedComponent] = useState<any>(null);
  const [dropPosition, setDropPosition] = useState<{x: number, y: number, z: number}>({x: 0, y: 0, z: 0});
  const [dropScreenPosition, setDropScreenPosition] = useState<{ x: number, y: number } | undefined>(undefined);
  
  // State for selection feature
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  
  // Use selection hook
  const selection = useCADSelection(sceneRef, cameraRef, canvasRef);
  
  // Use LOD and performance hooks
  const { optimizeScene, sceneStatistics } = useThreePerformance(sceneRef);
  const { applyLOD } = useLOD(sceneRef, cameraRef);
  
  // Reference to store command history for undo/redo
  const [commandHistory, setCommandHistory] = useState<CommandHistory[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Create selection data for the component
  const selectionData = selection.createSelectionData();
  const selectionBounds = selection.getSelectionBounds();

  // Handle keyboard shortcuts
  useCADKeyboardShortcuts({
    onDelete: () => {
      if (selectedElements.length > 0) {
        selection.deleteSelectedElements();
      } else if (selectedElement) {
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
      } else if (selectedElements.length > 0) {
        useElementsStore.getState().clearSelectedElements();
      } else if (selectedElement) {
        selectElement(null);
      }
      
      // Also exit selection mode
      selection.setSelectionModeActive(false);
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
      // Toggle snap using snap settings
      snapSettings.enabled = !snapSettings.enabled;
    },
    onUndo: () => {
      // Implement undo functionality
      undo();
    },
    onRedo: () => {
      // Implement redo functionality
      redo();
    },
    onSave: () => {
      // If elements are selected, show save dialog
      if (selectedElements.length > 0) {
        setShowSelectionModal(true);
      } else {
        // Otherwise, notify user to select elements first
        toast('Select elements to save as a component');
      }
    },
    onSelectAll: () => {
      // Select all visible elements from active layers
      const visibleLayers = layers.filter(layer => layer.visible && !layer.locked);
      const visibleLayerIds = visibleLayers.map(layer => layer.id);
      
      const visibleElements = elements.filter(element => 
        visibleLayerIds.includes(element.layerId)
      );
      
      // Clear current selection
      useElementsStore.getState().clearSelectedElements();
      
      // Select all visible elements
      visibleElements.forEach(element => {
        useElementsStore.getState().toggleElementSelection(element.id);
      });
      
      toast.success(`Selected ${visibleElements.length} elements`);
    },
    onCopy: () => {
      if (selectedElements.length > 0) {
        // Implement copy functionality
        // Store selection in a global state or localStorage
        const selectionToCopy = selection.createSelectionData();
        if (selectionToCopy) {
          localStorage.setItem('cadCopiedElements', JSON.stringify(selectionToCopy));
          toast.success(`Copied ${selectionToCopy.elements.length} elements`);
        }
      }
    },
    onPaste: () => {
      // Implement paste functionality
      const copiedData = localStorage.getItem('cadCopiedElements');
      if (copiedData) {
        try {
          const parsed = JSON.parse(copiedData);
          if (parsed.elements && Array.isArray(parsed.elements)) {
            // Offset the pasted elements slightly
            const pastedElements = parsed.elements.map((el: any) => {
              // Create a deep copy
              const newEl = JSON.parse(JSON.stringify(el));
              
              // Add offset to be visible
              if ('x' in newEl && 'y' in newEl) {
                newEl.x += 20;
                newEl.y += 20;
                if ('z' in newEl) newEl.z += 0;
              } else if ('x1' in newEl && 'y1' in newEl) {
                newEl.x1 += 20;
                newEl.y1 += 20;
                newEl.x2 += 20;
                newEl.y2 += 20;
                if ('z1' in newEl && 'z2' in newEl) {
                  newEl.z1 += 0;
                  newEl.z2 += 0;
                }
              }
              
              // Set to active layer
              newEl.layerId = useLayerStore.getState().activeLayer;
              
              return newEl;
            });
            
            // Add elements to the scene
            const newIds = useElementsStore.getState().addElements(pastedElements);
            
            // Select pasted elements
            useElementsStore.getState().clearSelectedElements();
            newIds.forEach(id => {
              useElementsStore.getState().toggleElementSelection(id);
            });
            
            toast.success(`Pasted ${pastedElements.length} elements`);
          }
        } catch (error) {
          console.error('Error pasting elements:', error);
          toast.error('Failed to paste elements');
        }
      } else {
        toast('Nothing to paste');
      }
    },
    onDuplicate: () => {
      if (selectedElements.length > 0) {
        selection.duplicateSelectedElements();
      }
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
    
    let elementsToFit: THREE.Object3D[] = [];
    
    // If elements are selected, fit to selection
    if (selectedElements.length > 0) {
      // Find objects corresponding to selected elements
      elementsToFit = sceneRef.current.children.filter(
        child => child.userData?.elementId && selectedElements.includes(child.userData.elementId)
      );
    } 
    // If single element is selected, fit to it
    else if (selectedElement) {
      const selectedObj = sceneRef.current.children.find(
        child => child.userData?.elementId === selectedElement.id
      );
      if (selectedObj) elementsToFit = [selectedObj];
    } 
    // Otherwise fit to all elements
    else {
      elementsToFit = sceneRef.current.children.filter(
        child => child.userData?.isCADElement
      );
    }
      
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
    
    toast.success('Zoomed to fit elements');
  }, [selectedElement, selectedElements]);

  const handleMouseMoveForPreview = useCallback((event: React.MouseEvent) => {
    if (!canvasRef.current || !sceneRef.current || !cameraRef.current || !isPlacingComponent || !previewObject) return;
    
    // Calculate normalized mouse coordinates (-1 to +1)
    const rect = canvasRef.current.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Calculate intersection with a plane
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1)); // XY plane
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouseRef.current, cameraRef.current);
    
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersection);
    
    // Apply snapping if necessary
    let snapPosition = { x: intersection.x, y: intersection.y, z: intersection.z };
    if (snapSettings.enabled) {
      const snappedPoint = snapToPoint(snapPosition);
      if (snappedPoint) {
        snapPosition = snappedPoint;
      }
    }
    
    // Update preview position
    previewObject.position.set(snapPosition.x, snapPosition.y, snapPosition.z);
    setPreviewPosition(snapPosition);
    
    // Update mouse position for status bar
    setMousePosition({
      x: Math.round(snapPosition.x * 100) / 100,
      y: Math.round(snapPosition.y * 100) / 100,
      z: Math.round(snapPosition.z * 100) / 100
    });
  }, [isPlacingComponent, previewObject, snapSettings.enabled, setMousePosition, snapToPoint]);

  const handleClickForPlacement = useCallback((event: React.MouseEvent) => {
    if (!isPlacingComponent || !previewComponent || !previewRef.current) return;
    
    // Place the component
    const position = { ...previewPosition };
    
    // Create a CAD element based on the component
    const newElement = {
      id: `component-${Date.now()}`,
      type: 'component',
      x: position.x,
      y: position.y,
      z: position.z,
      componentId: previewComponent,
      layerId: layers[0]?.id || 'default', // Use first available layer
    };
    
    // Add element to canvas
    addElement(newElement);
    
    // Notify via callback
    if (onComponentPlaced) {
      onComponentPlaced(previewComponent, position);
    }
    
    // Re-enable orbit controls after placement
    if (controlsRef.current) {
      controlsRef.current.enabled = true;
    }
    
    // Reset placement state
    setIsPlacingComponent(false);
  }, [isPlacingComponent, previewComponent, previewPosition, layers, addElement, onComponentPlaced]);

  // Handle window resize
  useEffect(() => {
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
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

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

  // Initialize scene
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
      0.01,   // Near plane for extreme zoom
      5000    // Far plane for distant view
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
    controls.minDistance = 0.1;  // Allow very close zoom
    controls.maxDistance = 500;  // Allow distant zoom
    controls.zoomSpeed = 1.5;
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
    const gridHelper = new THREE.GridHelper(500, 500);
    gridHelper.rotation.x = Math.PI / 2; // Rotate to XY plane
    gridHelper.visible = gridVisible;
    scene.add(gridHelper);

    // Create custom axes
    const createCustomAxes = (size: number) => {
      // Create materials for each axis with distinct colors
      const xAxisMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff }); // Blue for X axis
      const yAxisMaterial = new THREE.LineBasicMaterial({ color: 0xff00ff }); // Magenta for Y axis
      const zAxisMaterial = new THREE.LineBasicMaterial({ color: 0x00ff7f }); // Green for Z axis

      // Create geometries for each axis
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
    const customAxes = createCustomAxes(20);
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

    // Add fullscreen change event listeners
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    // Expose scene and camera if enabled
    if (window.exposeCADCanvasAPI) {
      window.cadCanvasScene = scene;
      window.cadCanvasCamera = camera;
    }
    const handleResize = () => {
        if (!canvasRef.current || !cameraRef.current || !rendererRef.current) return;
        
        const width = canvasRef.current.clientWidth;
        const height = canvasRef.current.clientHeight;
        
        setCanvasDimensions({ width, height });
        
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
        
        rendererRef.current.setSize(width, height);
      };

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

      // Clean up API exposure
      if (window.exposeCADCanvasAPI) {
        window.cadCanvasScene = undefined;
        window.cadCanvasCamera = undefined;
      }
    };
  }, []);

  // Handle Escape key for canceling component placement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPlacingComponent) {
        // Cancel placement
        if (previewRef.current && sceneRef.current) {
          sceneRef.current.remove(previewRef.current);
          previewRef.current = null;
        }
        setIsPlacingComponent(false);
        
        // Re-enable orbit controls
        if (controlsRef.current) {
          controlsRef.current.enabled = true;
        }
        
        // Notify cancellation
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

  // Update grid and axis visibility
  useEffect(() => {
    if (!sceneRef.current) return;
    
    const { originOffset } = useCADStore.getState();
    
    // Update grid
    const gridHelper = sceneRef.current.children.find(
      child => child instanceof THREE.GridHelper
    ) as THREE.GridHelper | undefined;
    
    if (gridHelper) {
      gridHelper.visible = gridVisible;
      // Move grid to compensate for origin offset
      gridHelper.position.set(originOffset.x, originOffset.y, originOffset.z);
    }
    
    // Update axes
    const customAxes = sceneRef.current.children.find(
      child => child.userData.isCustomAxes
    );
    
    if (customAxes) {
      customAxes.visible = axisVisible;
      customAxes.position.set(originOffset.x, originOffset.y, originOffset.z);
    }
    
    // Add origin indicator
    addOriginIndicator();
  }, [gridVisible, axisVisible, originOffset]);
  
  // Function to add origin indicator
  const addOriginIndicator = () => {
    if (!sceneRef.current) return;
    
    // Remove existing indicator if present
    const existingIndicator = sceneRef.current.children.find(
      child => child.userData.isOriginIndicator
    );
    
    if (existingIndicator) {
      sceneRef.current.remove(existingIndicator);
    }
    
    // Create new indicator
    const originIndicator = new THREE.Group();
    originIndicator.userData.isOriginIndicator = true;
    
    // Small dot at origin
    const pointGeometry = new THREE.SphereGeometry(2, 16, 16);
    const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const point = new THREE.Mesh(pointGeometry, pointMaterial);
    originIndicator.add(point);
    
    sceneRef.current.add(originIndicator);
  };

  // Create control points for an element
  const createControlPointsForElement = (element: any): THREE.Object3D[] => {
    const controlPoints: THREE.Object3D[] = [];
    // Create smaller control points
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
        
        // Rotation handle
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
        
      // Add cases for other element types here...
      // This is a condensed version, but you would implement control points for all element types
      
      default:
        // For other types, create a simple control point at the center
        if ('x' in element && 'y' in element) {
          const centerPoint = new THREE.Mesh(pointGeometry, pointMaterial);
          centerPoint.position.set(element.x, element.y, element.z || 0);
          centerPoint.userData.isControlPoint = true;
          centerPoint.userData.elementId = element.id;
          centerPoint.userData.pointIndex = 0;
          centerPoint.userData.controlFor = element.type;
          centerPoint.userData.isCenter = true;
          controlPoints.push(centerPoint);
        }
        break;
    }
    
    return controlPoints;
  };

  // Handle control point drag
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
          // It's a corner - recalculate dimensions
          const originalCenter = { x: element.x, y: element.y };
          const angle = (element.angle || 0) * Math.PI / 180;
          
          // Rotate the new position back to get aligned coordinates
          const cosAngle = Math.cos(-angle);
          const sinAngle = Math.sin(-angle);
          const alignedX = (newX - originalCenter.x) * cosAngle - (newY - originalCenter.y) * sinAngle;
          const alignedY = (newX - originalCenter.x) * sinAngle + (newY - originalCenter.y) * cosAngle;
          
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
      
      // Handle additional element types here...
      // This is a condensed version, you would implement handling for all element types
        
      default:
        if ('x' in element && 'y' in element) {
          // For center-based elements
          updates = { x: newX, y: newY, z: newZ };
        }
        break;
    }
    
    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      updateElement(elementId, updates);
    }
  }, [elements, updateElement]);

  // Track key presses for multi-select
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        if (!selection.isMultiSelectMode) {
          selection.toggleMultiSelectMode();
        }
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        if (selection.isMultiSelectMode) {
          selection.toggleMultiSelectMode();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selection.isMultiSelectMode, selection.toggleMultiSelectMode]);

  // Handle mouse events
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    // Handle component placement or dragging
    if (isPlacingComponent) {
      handleMouseMoveForPreview(event);
      return;
    }
    
    // Handle selection box if active
    if (selection.selectionBox?.active) {
      selection.updateSelectionBox(event.clientX, event.clientY);
      return;
    }
    
    if (!canvasRef.current || !sceneRef.current || !cameraRef.current) return;
    
    // Don't process hover effects during camera movement
    if (controlsRef.current?.enabled && controlsRef.current?.enablePan && event.buttons > 0) {
      return;
    }
    
    // Calculate normalized device coordinates
    const rect = canvasRef.current.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Update raycaster
    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    
    // If we're actively dragging a control point
    if (activeDragPoint) {
      // Calculate intersection with a plane
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1)); // XY plane
      const planeIntersection = new THREE.Vector3();
      raycasterRef.current.ray.intersectPlane(plane, planeIntersection);
      
      // Update control point position
      handleControlPointDrag(
        activeDragPoint.elementId,
        activeDragPoint.pointIndex,
        planeIntersection.x,
        planeIntersection.y,
        planeIntersection.z
      );
      
      // Update control points visual positions
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
    const selectableObjects = sceneRef.current.children.filter(
      child => child.userData && child.userData.isCADElement
    );
    
    const intersects = raycasterRef.current.intersectObjects(selectableObjects, true);
    
    if (intersects.length > 0) {
      // Find the first intersected object with an elementId
      let elementId = null;
      for (const intersect of intersects) {
        // Check if the object or its ancestors have an elementId
        let obj: THREE.Object3D | null = intersect.object;
        while (obj && !elementId) {
          if (obj.userData?.elementId) {
            elementId = obj.userData.elementId;
            break;
          }
          obj = obj.parent;
        }
        if (elementId) break;
      }
      
      if (elementId) {
        setHoveredElementId(elementId);
        canvasRef.current.style.cursor = selection.isSelectionMode ? 'cell' : 'pointer';
      } else {
        setHoveredElementId(null);
        canvasRef.current.style.cursor = 'default';
      }
    } else {
      setHoveredElementId(null);
      canvasRef.current.style.cursor = selection.isSelectionMode ? 'crosshair' : 'default';
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
  }, [
    activeDragPoint,
    handleControlPointDrag,
    handleMouseMoveForPreview,
    isPlacingComponent,
    selection.isSelectionMode,
    selection.selectionBox?.active,
    selection.updateSelectionBox,
    setMousePosition,
    updateControlPoints
  ]);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    // Handle component placement
    if (isPlacingComponent) {
      handleClickForPlacement(event);
      return;
    }
    
    if (!canvasRef.current || !sceneRef.current || !cameraRef.current) return;
    
    // Only handle left clicks
    if (event.button !== 0) return;
    
    // Start selection box in selection mode
    if (selection.isSelectionMode || event.shiftKey) {
      selection.startSelectionBox(event.clientX, event.clientY);
      return;
    }
    
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
    
    // Find all selectable objects
    const selectableObjects: THREE.Object3D[] = [];
    sceneRef.current.traverse((child) => {
      if (child.userData?.isCADElement && !child.userData?.isHelper) {
        selectableObjects.push(child);
      }
    });
    
    // Check for element intersections
    const intersects = raycasterRef.current.intersectObjects(selectableObjects, true);
    
    if (intersects.length > 0) {
      // Find element ID, considering both the object and its parents
      let elementId = null;
      let currentObj: THREE.Object3D | null = intersects[0].object;
      
      // Traverse up the hierarchy to find element ID
      while (currentObj && !elementId) {
        if (currentObj.userData && currentObj.userData.elementId) {
          elementId = currentObj.userData.elementId;
        }
        currentObj = currentObj.parent;
      }
      
      if (elementId) {
        // Handle selection based on mode
        selection.handleElementSelection(elementId, event.shiftKey);
      } else {
        // Clicked on space, clear selection if not in multi-select mode
        if (!event.shiftKey && !selection.isMultiSelectMode) {
          useElementsStore.getState().clearSelectedElements();
          selectElement(null);
        }
      }
    } else {
      // Clicked on empty space, clear selection if not in multi-select mode
      if (!event.shiftKey && !selection.isMultiSelectMode) {
        useElementsStore.getState().clearSelectedElements();
        selectElement(null);
      }
    }
  }, [isPlacingComponent, handleClickForPlacement, selection, selectElement]);

  const handleMouseUp = useCallback((event: React.MouseEvent) => {
    // End selection box if active
    if (selection.selectionBox?.active) {
      selection.endSelectionBox();
      return;
    }
    
    // End control point drag
    if (activeDragPoint) {
      setActiveDragPoint(null);
      if (controlsRef.current) {
        controlsRef.current.enabled = true;
      }
    }
    
    setIsDragging(false);
  }, [activeDragPoint, selection]);

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
        cameraRef.current.up.set(0, 1, 0); // Set Z as the up direction
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
            // Show X (index 0) and Y (index 1), hide Z (index 2)
            if (index === 2) {
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


  
  // Create Three.js objects from CAD elements
  const createThreeObject = (element: any): THREE.Object3D | null => {
    const { originOffset } = useCADStore.getState();
    const ensureObjectMetadata = (object: THREE.Object3D, elementId: string) => {
        // Imposta i metadata sull'oggetto principale
        object.userData.isCADElement = true;
        object.userData.elementId = elementId;
        
        // Propaga i metadata a tutti i figli
        object.traverse((child) => {
          if (child !== object) {
            child.userData.isCADElement = true;
            child.userData.elementId = elementId;
            child.userData.isChild = true; // Opzionale: per distinguere i figli
          }
        });
      };
    // Check if element is on a visible layer
    const layer = layers.find(l => l.id === element.layerId);
    if (!layer || !layer.visible) return null;
    
    let threeObject: THREE.Object3D | null = null;
    
    switch (element.type) {
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
              element.segments || 32,
              element.segments || 32
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
            
            // Rotation for standard orientation
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
              element.tubeRadius || element.radius / 4,
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
            
          // ======= ADVANCED PRIMITIVES =======
          case 'pyramid':
            // Create pyramid geometry using BufferGeometry
            const pyramidGeometry = new THREE.BufferGeometry();
            
            // Define vertices for a square-based pyramid
            const baseWidth = element.baseWidth || 1;
            const baseDepth = element.baseDepth || 1;
            const pyramidHeight = element.height || 1;
            
            const vertices = new Float32Array([
              // Base
              -baseWidth/2, -pyramidHeight/2, -baseDepth/2,
              baseWidth/2, -pyramidHeight/2, -baseDepth/2,
              baseWidth/2, -pyramidHeight/2, baseDepth/2,
              -baseWidth/2, -pyramidHeight/2, baseDepth/2,
              // Apex
              0, pyramidHeight/2, 0
            ]);
            
            // Define faces using indices
            const indices = [
              // Base
              0, 1, 2,
              0, 2, 3,
              // Sides
              0, 4, 1,
              1, 4, 2,
              2, 4, 3,
              3, 4, 0
            ];
            
            pyramidGeometry.setIndex(indices);
            pyramidGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
            pyramidGeometry.computeVertexNormals();
            
            const pyramidMaterial = new THREE.MeshStandardMaterial({
              color: element.color || 0xE91E63,
              wireframe: element.wireframe || false
            });
            
            const pyramid = new THREE.Mesh(pyramidGeometry, pyramidMaterial);
            pyramid.position.set(
              element.x + originOffset.x,
              element.y + originOffset.y,
              (element.z || 0) + originOffset.z
            );
            
            return pyramid;
            
          case 'prism':
            // Create prism geometry (like a cylinder with polygon base)
            const sides = element.sides || 6;
            const prismGeometry = new THREE.CylinderGeometry(
              element.radius,
              element.radius,
              element.height,
              sides
            );
            
            const prismMaterial = new THREE.MeshStandardMaterial({
              color: element.color || 0x3F51B5,
              wireframe: element.wireframe || false
            });
            
            const prism = new THREE.Mesh(prismGeometry, prismMaterial);
            prism.position.set(
              element.x + originOffset.x,
              element.y + originOffset.y,
              (element.z || 0) + originOffset.z
            );
            
            prism.rotation.x = Math.PI / 2;
            return prism;
            
          case 'hemisphere':
            const hemisphereGeometry = new THREE.SphereGeometry(
              element.radius,
              element.segments || 32,
              element.segments || 32,
              0,
              Math.PI * 2,
              0,
              Math.PI / 2
            );
            
            const hemisphereMaterial = new THREE.MeshStandardMaterial({
              color: element.color || 0x00BCD4,
              wireframe: element.wireframe || false
            });
            
            const hemisphere = new THREE.Mesh(hemisphereGeometry, hemisphereMaterial);
            hemisphere.position.set(
              element.x + originOffset.x,
              element.y + originOffset.y,
              (element.z || 0) + originOffset.z
            );
            
            // Rotate based on direction
            if (element.direction === "down") {
              hemisphere.rotation.x = Math.PI;
            }
            
            return hemisphere;
            
          case 'ellipsoid':
            // Create sphere and scale it to make an ellipsoid
            const ellipsoidGeometry = new THREE.SphereGeometry(
              1, // We'll scale it
              element.segments || 32,
              element.segments || 32
            );
            
            const ellipsoidMaterial = new THREE.MeshStandardMaterial({
              color: element.color || 0x8BC34A,
              wireframe: element.wireframe || false
            });
            
            const ellipsoid = new THREE.Mesh(ellipsoidGeometry, ellipsoidMaterial);
            ellipsoid.position.set(
              element.x + originOffset.x,
              element.y + originOffset.y,
              (element.z || 0) + originOffset.z
            );
            
            // Scale to create ellipsoid shape
            ellipsoid.scale.set(
              element.radiusX || 1,
              element.radiusY || 0.75,
              element.radiusZ || 0.5
            );
            
            return ellipsoid;
            
          case 'capsule':
            // Three.js doesn't have a built-in capsule, so use CapsuleGeometry from three/examples
            // Fallback to cylinder with hemisphere caps if not available
            let capsuleGeometry;
            
            try {
              // Try to use CapsuleGeometry if available
              capsuleGeometry = new THREE.CapsuleGeometry(
                element.radius || 0.5,
                element.height || 2,
                element.capSegments || 8,
                element.radialSegments || 16
              );
            } catch (e) {
              // Fallback: Create a group with cylinder and two hemispheres
              const capsuleGroup = new THREE.Group();
              
              const radius = element.radius || 0.5;
              const height = element.height || 2;
              
              // Cylinder for body
              const bodyCylinder = new THREE.Mesh(
                new THREE.CylinderGeometry(radius, radius, height, 32),
                new THREE.MeshStandardMaterial({ color: element.color || 0x673AB7 })
              );
              capsuleGroup.add(bodyCylinder);
              
              // Top hemisphere
              const topHemisphere = new THREE.Mesh(
                new THREE.SphereGeometry(radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
                new THREE.MeshStandardMaterial({ color: element.color || 0x673AB7 })
              );
              topHemisphere.position.y = height / 2;
              topHemisphere.rotation.x = Math.PI;
              capsuleGroup.add(topHemisphere);
              
              // Bottom hemisphere
              const bottomHemisphere = new THREE.Mesh(
                new THREE.SphereGeometry(radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
                new THREE.MeshStandardMaterial({ color: element.color || 0x673AB7 })
              );
              bottomHemisphere.position.y = -height / 2;
              capsuleGroup.add(bottomHemisphere);
              
              capsuleGroup.position.set(
                element.x + originOffset.x,
                element.y + originOffset.y,
                (element.z || 0) + originOffset.z
              );
              
              // Set rotation based on direction
              if (element.direction === "x") {
                capsuleGroup.rotation.z = Math.PI / 2;
              } else if (element.direction === "z") {
                capsuleGroup.rotation.x = Math.PI / 2;
              }
              
              return capsuleGroup;
            }
            
            // If CapsuleGeometry is available
            const capsuleMaterial = new THREE.MeshStandardMaterial({
              color: element.color || 0x673AB7,
              wireframe: element.wireframe || false
            });
            
            const capsule = new THREE.Mesh(capsuleGeometry, capsuleMaterial);
            capsule.position.set(
              element.x + originOffset.x,
              element.y + originOffset.y,
              (element.z || 0) + originOffset.z
            );
            
            // Set rotation based on direction
            if (element.direction === "x") {
              capsule.rotation.z = Math.PI / 2;
            } else if (element.direction === "z") {
              capsule.rotation.x = Math.PI / 2;
            }
            
            return capsule;
          
          // ======= 2D ELEMENTS =======
          case 'circle':
            const circleGeometry = new THREE.CircleGeometry(
              element.radius,
              element.segments || 32
            );
            
            const circleMaterial = new THREE.MeshBasicMaterial({
              color: element.color || 0x000000,
              wireframe: element.wireframe || true,
              side: THREE.DoubleSide
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
              wireframe: element.wireframe || true,
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
            
          case 'triangle':
            const triangleShape = new THREE.Shape();
            
            // If points are provided, use them
            if (element.points && element.points.length >= 3) {
              triangleShape.moveTo(element.points[0].x, element.points[0].y);
              triangleShape.lineTo(element.points[1].x, element.points[1].y);
              triangleShape.lineTo(element.points[2].x, element.points[2].y);
            } else {
              // Otherwise, create an equilateral triangle
              const size = element.size || 1;
              triangleShape.moveTo(0, size);
              triangleShape.lineTo(-size * Math.sqrt(3) / 2, -size / 2);
              triangleShape.lineTo(size * Math.sqrt(3) / 2, -size / 2);
            }
            
            triangleShape.closePath();
            
            const triangleGeometry = new THREE.ShapeGeometry(triangleShape);
            const triangleMaterial = new THREE.MeshBasicMaterial({
              color: element.color || 0x000000,
              wireframe: element.wireframe || true,
              side: THREE.DoubleSide
            });
            
            const triangle = new THREE.Mesh(triangleGeometry, triangleMaterial);
            triangle.position.set(
              element.x + originOffset.x,
              element.y + originOffset.y,
              (element.z || 0) + originOffset.z
            );
            
            return triangle;
            
          case 'polygon':
            const polygonShape = new THREE.Shape();
            
            if (element.points && element.points.length >= 3) {
              // Use provided points
              polygonShape.moveTo(element.points[0].x, element.points[0].y);
              
              for (let i = 1; i < element.points.length; i++) {
                polygonShape.lineTo(element.points[i].x, element.points[i].y);
              }
            } else if (element.sides && element.radius) {
              // Create regular polygon
              const sides = element.sides || 6;
              const radius = element.radius || 1;
              
              for (let i = 0; i < sides; i++) {
                const angle = (i / sides) * Math.PI * 2;
                const x = radius * Math.cos(angle);
                const y = radius * Math.sin(angle);
                
                if (i === 0) {
                  polygonShape.moveTo(x, y);
                } else {
                  polygonShape.lineTo(x, y);
                }
              }
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
            
          case 'ellipse':
            const ellipseShape = new THREE.Shape();
            const rx = element.radiusX || 1;
            const ry = element.radiusY || 0.5;
            
            // Create ellipse shape
            ellipseShape.ellipse(0, 0, rx, ry, 0, Math.PI * 2, false, 0);
            
            const ellipseGeometry = new THREE.ShapeGeometry(ellipseShape);
            const ellipseMaterial = new THREE.MeshBasicMaterial({
              color: element.color || 0x000000,
              wireframe: element.wireframe || true,
              side: THREE.DoubleSide
            });
            
            const ellipseMesh = new THREE.Mesh(ellipseGeometry, ellipseMaterial);
            ellipseMesh.position.set(
              element.x + originOffset.x,
              element.y + originOffset.y,
              (element.z || 0) + originOffset.z
            );
            
            return ellipseMesh;
            
          case 'arc':
            const arcShape = new THREE.Shape();
            const arcRadius = element.radius || 1;
            const startAngle = element.startAngle || 0;
            const endAngle = element.endAngle || Math.PI;
            
            // Create arc shape
            arcShape.moveTo(0, 0);
            arcShape.lineTo(
              arcRadius * Math.cos(startAngle),
              arcRadius * Math.sin(startAngle)
            );
            arcShape.absarc(0, 0, arcRadius, startAngle, endAngle, false);
            arcShape.lineTo(0, 0);
            
            const arcGeometry = new THREE.ShapeGeometry(arcShape);
            const arcMaterial = new THREE.MeshBasicMaterial({
              color: element.color || 0x000000,
              wireframe: element.wireframe || true,
              side: THREE.DoubleSide
            });
            
            const arc = new THREE.Mesh(arcGeometry, arcMaterial);
            arc.position.set(
              element.x + originOffset.x,
              element.y + originOffset.y,
              (element.z || 0) + originOffset.z
            );
            
            return arc;
          
          // ======= CURVE ELEMENTS =======
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
            
          case 'spline':
            if (!element.points || element.points.length < 2) return null;
            
            // Convert points to Vector3 and apply offset
            const splinePoints = element.points.map((point: any) => 
              new THREE.Vector3(
                point.x + originOffset.x,
                point.y + originOffset.y,
                (point.z || 0) + originOffset.z
              )
            );
            
            // Create curve
            const splineCurve = new THREE.CatmullRomCurve3(splinePoints);
            
            // Sample points along the curve for the line geometry
            const splineDivisions = element.divisions || 50;
            const splineGeometry = new THREE.BufferGeometry().setFromPoints(
              splineCurve.getPoints(splineDivisions)
            );
            
            const splineMaterial = new THREE.LineBasicMaterial({
              color: element.color || 0x000000,
              linewidth: element.linewidth || 1
            });
            
            return new THREE.Line(splineGeometry, splineMaterial);
            
          case 'bezier':
            if (!element.points || element.points.length < 4) return null;
            
            // For a cubic bezier, we need at least 4 points (start, 2 control points, end)
            const bezierPoints = element.points.map((point: any) => 
              new THREE.Vector3(
                point.x + originOffset.x,
                point.y + originOffset.y,
                (point.z || 0) + originOffset.z
              )
            );
            
            // Create cubic bezier curve
            const bezierCurve = new THREE.CubicBezierCurve3(
              bezierPoints[0],
              bezierPoints[1],
              bezierPoints[2],
              bezierPoints[3]
            );
            
            // Sample points along the curve for the line geometry
            const bezierDivisions = element.divisions || 50;
            const bezierGeometry = new THREE.BufferGeometry().setFromPoints(
              bezierCurve.getPoints(bezierDivisions)
            );
            
            const bezierMaterial = new THREE.LineBasicMaterial({
              color: element.color || 0x000000,
              linewidth: element.linewidth || 1
            });
            
            return new THREE.Line(bezierGeometry, bezierMaterial);
            
          case 'nurbs':
            if (!element.points || element.points.length < 4) return null;
            
            // This is a simplified NURBS implementation using SplineCurve3
            // For a full NURBS implementation, you'd need additional libraries
            
            // Convert points to Vector3 and apply offset
            const nurbsPoints = element.points.map((point: any) => 
              new THREE.Vector3(
                point.x + originOffset.x,
                point.y + originOffset.y,
                (point.z || 0) + originOffset.z
              )
            );
            
            // Create curve
            const nurbsCurve = new THREE.CatmullRomCurve3(nurbsPoints, false, "centripetal");
            
            // Sample points along the curve for the line geometry
            const nurbsDivisions = element.divisions || 100;
            const nurbsGeometry = new THREE.BufferGeometry().setFromPoints(
              nurbsCurve.getPoints(nurbsDivisions)
            );
            
            const nurbsMaterial = new THREE.LineBasicMaterial({
              color: element.color || 0x000000,
              linewidth: element.linewidth || 1
            });
            
            return new THREE.Line(nurbsGeometry, nurbsMaterial);
          
          // ======= TRANSFORMATION OPERATIONS =======
          case 'extrusion':
            if (!element.shape && !element.profile) return null;
            
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
            } else if (element.profile && element.profile.length >= 3) {
              const firstPoint = element.profile[0];
              extrudeShape.moveTo(firstPoint.x, firstPoint.y);
              
              for (let i = 1; i < element.profile.length; i++) {
                extrudeShape.lineTo(element.profile[i].x, element.profile[i].y);
              }
              
              extrudeShape.closePath();
            }
            
            const extrudeSettings = {
              depth: element.depth || 10,
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
            
          case 'revolution':
            if (!element.profile || element.profile.length < 2) return null;
            
            // Create a shape from the profile points
            const revolutionPoints = element.profile.map((point: any) => 
              new THREE.Vector2(point.x, point.y)
            );
            
            // LatheGeometry revolves a shape around an axis
            const revolutionGeometry = new THREE.LatheGeometry(
              revolutionPoints,
              element.segments || 32,
              element.phiStart || 0,
              element.angle || Math.PI * 2
            );
            
            const revolutionMaterial = new THREE.MeshStandardMaterial({
              color: element.color || 0xFF5722,
              wireframe: element.wireframe || false
            });
            
            const revolution = new THREE.Mesh(revolutionGeometry, revolutionMaterial);
            revolution.position.set(
              (element.x || 0) + originOffset.x,
              (element.y || 0) + originOffset.y,
              (element.z || 0) + originOffset.z
            );
            
            // Rotate based on the specified axis
            if (element.axis === 'x') {
              revolution.rotation.y = Math.PI / 2;
            } else if (element.axis === 'y') {
              revolution.rotation.x = Math.PI / 2;
            }
            
            return revolution;
            
          case 'sweep':
            if (!element.profile || !element.path) return null;
            
            // This requires the three-csg library or similar for advanced operations
            // Simplified implementation using TubeGeometry
            
            // Create a shape from the profile
            const sweepShape = new THREE.Shape();
            if (element.profile.length >= 3) {
              sweepShape.moveTo(element.profile[0].x, element.profile[0].y);
              for (let i = 1; i < element.profile.length; i++) {
                sweepShape.lineTo(element.profile[i].x, element.profile[i].y);
              }
              sweepShape.closePath();
            } else {
              // Default to circle if profile not provided properly
              sweepShape.absarc(0, 0, element.radius || 0.5, 0, Math.PI * 2, false);
            }
            
            // Create a path for the sweep
            const pathPoints = element.path.map((point: any) => 
              new THREE.Vector3(point.x, point.y, point.z || 0)
            );
            
            const sweepPath = new THREE.CatmullRomCurve3(pathPoints);
            
            // Create a tube along the path with the shape as cross-section
            // Note: This is a simplification; full sweep would need custom geometry
            const tubeGeometry = new THREE.TubeGeometry(
              sweepPath,
              element.segments || 64,
              element.radius || 0.5,
              element.radialSegments || 8,
              element.closed || false
            );
            
            const sweepMaterial = new THREE.MeshStandardMaterial({
              color: element.color || 0x2196F3,
              wireframe: element.wireframe || false
            });
            
            const sweep = new THREE.Mesh(tubeGeometry, sweepMaterial);
            sweep.position.set(
              originOffset.x,
              originOffset.y,
              originOffset.z
            );
            
            return sweep;
            
            case 'loft':
              if (!element.profiles || !element.positions || element.profiles.length < 2) return null;
              
              // Create a group to hold all sections
              const loftGroup = new THREE.Group();
              loftGroup.position.set(
                (element.x || 0) + originOffset.x,
                (element.y || 0) + originOffset.y,
                (element.z || 0) + originOffset.z
              );
              
              // Create meshes between consecutive profile sections
              for (let i = 0; i < element.profiles.length - 1; i++) {
                const profileA = element.profiles[i];
                const profileB = element.profiles[i + 1];
                
                const posA = element.positions[i];
                const posB = element.positions[i + 1];
                
                // Create simple representation for now (would need custom geometry for proper loft)
                const sectionGeometry = new THREE.CylinderGeometry(
                  profileA.radius || 1,
                  profileB.radius || 1,
                  Math.sqrt(
                    Math.pow(posB.x - posA.x, 2) +
                    Math.pow(posB.y - posA.y, 2) +
                    Math.pow(posB.z - posA.z, 2)
                  ),
                  32
                );
                
                const sectionMesh = new THREE.Mesh(
                  sectionGeometry,
                  new THREE.MeshStandardMaterial({
                    color: element.color || 0x9C27B0,
                    wireframe: element.wireframe || false
                  })
                );
                
                // Position and orient the section
                const midPoint = {
                  x: (posA.x + posB.x) / 2,
                  y: (posA.y + posB.y) / 2,
                  z: (posA.z + posB.z) / 2
                };
                
                sectionMesh.position.set(midPoint.x, midPoint.y, midPoint.z);
                
                // Orient section to point from A to B
                sectionMesh.lookAt(new THREE.Vector3(posB.x, posB.y, posB.z));
                sectionMesh.rotateX(Math.PI / 2);
                
                loftGroup.add(sectionMesh);
              }
              
              return loftGroup;
            
            // ======= BOOLEAN OPERATIONS =======
            case 'boolean-union':
            case 'boolean-subtract':
            case 'boolean-intersect':
              if (!element.operands || element.operands.length < 2) return null;
              
              // This requires the three-csg library for CSG operations
              // For now, we'll just render a placeholder or the first operand
              
              // Create a placeholder for boolean operation result
              const booleanPlaceholder = new THREE.Mesh(
                new THREE.SphereGeometry(1, 16, 16),
                new THREE.MeshStandardMaterial({
                  color: element.color || 0x4CAF50,
                  wireframe: true,
                  opacity: 0.7,
                  transparent: true
                })
              );
              
              booleanPlaceholder.position.set(
                (element.x || 0) + originOffset.x,
                (element.y || 0) + originOffset.y,
                (element.z || 0) + originOffset.z
              );
              
              booleanPlaceholder.userData.isBooleanOperation = true;
              booleanPlaceholder.userData.operationType = element.type;
              booleanPlaceholder.userData.operandIds = element.operands;
              
              return booleanPlaceholder;
            
            // ======= INDUSTRIAL ELEMENTS =======
            case 'thread':
              // Create a simplified thread representation
              const threadGroup = new THREE.Group();
              
              // Base cylinder
              const threadBase = new THREE.Mesh(
                new THREE.CylinderGeometry(element.diameter / 2, element.diameter / 2, element.length, 32),
                new THREE.MeshStandardMaterial({
                  color: element.color || 0xB0BEC5,
                  wireframe: element.wireframe || false
                })
              );
              
              // Thread helix (simplified representation)
              const helixSegments = Math.ceil(element.length / element.pitch) * 8;
              const threadCurvePoints = [];
              
              for (let i = 0; i <= helixSegments; i++) {
                const t = i / helixSegments;
                const angle = t * (element.length / element.pitch) * Math.PI * 2;
                const radius = element.diameter / 2 + element.pitch * 0.1; // Slightly larger than base
                const x = radius * Math.cos(angle);
                const y = -element.length / 2 + t * element.length;
                const z = radius * Math.sin(angle);
                
                threadCurvePoints.push(new THREE.Vector3(x, y, z));
              }
              
              const threadCurve = new THREE.CatmullRomCurve3(threadCurvePoints);
              const threadGeometry = new THREE.TubeGeometry(
                threadCurve,
                helixSegments,
                element.pitch * 0.1, // Thread thickness
                8,
                false
              );
              
              const threadMaterial = new THREE.MeshStandardMaterial({
                color: element.color || 0x9E9E9E,
                wireframe: element.wireframe || false
              });
              
              const threadHelix = new THREE.Mesh(threadGeometry, threadMaterial);
              
              threadGroup.add(threadBase);
              threadGroup.add(threadHelix);
              
              // Set handedness rotation
              if (element.handedness === 'left') {
                threadHelix.rotation.y = Math.PI;
              }
              
              threadGroup.position.set(
                element.x + originOffset.x,
                element.y + originOffset.y,
                (element.z || 0) + originOffset.z
              );
              
              // Rotate to standard orientation
              threadGroup.rotation.x = Math.PI / 2;
              
              return threadGroup;
              
            case 'chamfer':
              // Chamfer would normally modify an existing edge
              // For standalone visualization, create a placeholder
              const chamferGroup = new THREE.Group();
              
              // Create a box with chamfered edges (simplified representation)
              const chamferBaseGeometry = new THREE.BoxGeometry(
                element.width || 1,
                element.height || 1, 
                element.depth || 1
              );
              
              const chamferBaseMaterial = new THREE.MeshStandardMaterial({
                color: element.color || 0x607D8B,
                wireframe: element.wireframe || false
              });
              
              const chamferBase = new THREE.Mesh(chamferBaseGeometry, chamferBaseMaterial);
              chamferGroup.add(chamferBase);
              
              // Highlight the chamfered edges
              if (element.edges && element.edges.length > 0) {
                const edgesMaterial = new THREE.LineBasicMaterial({ 
                  color: 0xFF5722,
                  linewidth: 3
                });
                
                // Here we'd create proper chamfer visualization
                // For now just highlight edges
                const edgesGeometry = new THREE.EdgesGeometry(chamferBaseGeometry);
                const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
                chamferGroup.add(edges);
              }
              
              chamferGroup.position.set(
                element.x + originOffset.x,
                element.y + originOffset.y,
                (element.z || 0) + originOffset.z
              );
              
              return chamferGroup;
              
            case 'fillet':
              // Similar to chamfer, fillets modify existing edges
              // Create a simplified representation
              const filletGroup = new THREE.Group();
              
              // Create a base geometry
              const filletBaseGeometry = new THREE.BoxGeometry(
                element.width || 1,
                element.height || 1,
                element.depth || 1
              );
              
              const filletBaseMaterial = new THREE.MeshStandardMaterial({
                color: element.color || 0x607D8B,
                wireframe: element.wireframe || false
              });
              
              const filletBase = new THREE.Mesh(filletBaseGeometry, filletBaseMaterial);
              filletGroup.add(filletBase);
              
              // Highlight the filleted edges
              if (element.edges && element.edges.length > 0) {
                const filletedEdgesMaterial = new THREE.LineBasicMaterial({ 
                  color: 0x4CAF50,
                  linewidth: 3
                });
                
                // Here we'd create proper fillet visualization
                // For now just highlight edges
                const edgesGeometry = new THREE.EdgesGeometry(filletBaseGeometry);
                const edges = new THREE.LineSegments(edgesGeometry, filletedEdgesMaterial);
                filletGroup.add(edges);
              }
              
              filletGroup.position.set(
                element.x + originOffset.x,
                element.y + originOffset.y,
                (element.z || 0) + originOffset.z
              );
              
              return filletGroup;
              
            case 'gear':
              // Create a simplified gear visualization
              const gearGroup = new THREE.Group();
              
              // Basic parameters
              const moduleValue = element.moduleValue || 1; // Module in mm
              const teeth = element.teeth || 20;
              const thickness = element.thickness || 5;
              const pressureAngle = (element.pressureAngle || 20) * Math.PI / 180;
              
              // Derived parameters
              const pitchDiameter = moduleValue * teeth;
              const pitchRadius = pitchDiameter / 2;
              const baseRadius = pitchRadius * Math.cos(pressureAngle);
              const addendum = moduleValue;
              const dedendum = 1.25 * moduleValue;
              const outerRadius = pitchRadius + addendum;
              const rootRadius = pitchRadius - dedendum;
              
              // Create the base cylinder
              const gearCylinder = new THREE.Mesh(
                new THREE.CylinderGeometry(pitchRadius, pitchRadius, thickness, 32),
                new THREE.MeshStandardMaterial({
                  color: element.color || 0xB0BEC5,
                  wireframe: element.wireframe || false
                })
              );
              gearGroup.add(gearCylinder);
              
              // Create teeth (simplified as cylinders)
              for (let i = 0; i < teeth; i++) {
                const angle = (i / teeth) * Math.PI * 2;
                const x = (outerRadius + moduleValue * 0.25) * Math.cos(angle);
                const z = (outerRadius + moduleValue * 0.25) * Math.sin(angle);
                
                const tooth = new THREE.Mesh(
                  new THREE.CylinderGeometry(
                    moduleValue * 0.8, 
                    moduleValue * 0.8, 
                    thickness, 
                    8
                  ),
                  new THREE.MeshStandardMaterial({
                    color: element.color || 0xB0BEC5
                  })
                );
                
                tooth.position.set(x, 0, z);
                gearGroup.add(tooth);
              }
              
              // Create center hole if specified
              if (element.holeDiameter) {
                const hole = new THREE.Mesh(
                  new THREE.CylinderGeometry(element.holeDiameter / 2, element.holeDiameter / 2, thickness + 1, 32),
                  new THREE.MeshStandardMaterial({
                    color: 0x212121
                  })
                );
                gearGroup.add(hole);
              }
              
              gearGroup.position.set(
                element.x + originOffset.x,
                element.y + originOffset.y,
                (element.z || 0) + originOffset.z
              );
              
              // Rotate to standard orientation
              gearGroup.rotation.x = Math.PI / 2;
              
              return gearGroup;
              
            case 'spring':
              // Create a helical spring
              const springRadius = element.radius || 1;
              const wireRadius = element.wireRadius || 0.1;
              const turns = element.turns || 5;
              const height = element.height || 5;
              
              const springCurvePoints = [];
              const segments = turns * 16;
              
              for (let i = 0; i <= segments; i++) {
                const t = i / segments;
                const angle = t * turns * Math.PI * 2;
                const x = springRadius * Math.cos(angle);
                const y = -height / 2 + t * height;
                const z = springRadius * Math.sin(angle);
                
                springCurvePoints.push(new THREE.Vector3(x, y, z));
              }
              
              const springCurve = new THREE.CatmullRomCurve3(springCurvePoints);
              const springGeometry = new THREE.TubeGeometry(
                springCurve,
                segments,
                wireRadius,
                8,
                false
              );
              
              const springMaterial = new THREE.MeshStandardMaterial({
                color: element.color || 0x9E9E9E,
                wireframe: element.wireframe || false
              });
              
              const spring = new THREE.Mesh(springGeometry, springMaterial);
              spring.position.set(
                element.x + originOffset.x,
                element.y + originOffset.y,
                (element.z || 0) + originOffset.z
              );
              
              return spring;
            
            // ======= ASSEMBLY ELEMENTS =======
            case 'screw':
            case 'bolt':
              // Create a simplified screw or bolt
              const screwGroup = new THREE.Group();
              
              // Parse size
              let diameter = 5; // Default 5mm
              if (element.size && typeof element.size === 'string') {
                const match = element.size.match(/M(\d+)/i);
                if (match) {
                  diameter = parseInt(match[1], 10);
                }
              }
              
              // Create head
              const headDiameter = diameter * 1.8;
              const headHeight = diameter * 0.8;
              const screwHead = new THREE.Mesh(
                new THREE.CylinderGeometry(headDiameter / 2, headDiameter / 2, headHeight, 32),
                new THREE.MeshStandardMaterial({
                  color: element.color || 0x9E9E9E,
                  wireframe: element.wireframe || false
                })
              );
              screwHead.position.y = (element.length || 20) / 2 - headHeight / 2;
              screwGroup.add(screwHead);
              
              // Create shaft
              const shaftLength2 = (element.length || 20) - headHeight;
              const shaft2 = new THREE.Mesh(
                new THREE.CylinderGeometry(diameter / 2, diameter / 2, shaftLength2, 32),
                new THREE.MeshStandardMaterial({
                  color: element.color || 0x9E9E9E,
                  wireframe: element.wireframe || false
                })
              );
              shaft2.position.y = -shaftLength2 / 2;
              screwGroup.add(shaft2);
              
              // Add thread detail
              const threadHelixPoints = [];
              const threadSegments = Math.ceil(shaftLength2 / (diameter * 0.2)) * 8;
              
              for (let i = 0; i <= threadSegments; i++) {
                const t = i / threadSegments;
                const angle = t * (shaftLength2 / (diameter * 0.2)) * Math.PI * 2;
                const radius = diameter / 2 + 0.05;
                const x = radius * Math.cos(angle);
                const y = -shaftLength2 + t * shaftLength2;
                const z = radius * Math.sin(angle);
                
                threadHelixPoints.push(new THREE.Vector3(x, y, z));
              }
              
              const threadCurve2 = new THREE.CatmullRomCurve3(threadHelixPoints);
              const threadGeometry2 = new THREE.TubeGeometry(
                threadCurve2,
                threadSegments,
                diameter * 0.05,
                8,
                false
              );
              
              const threadMaterial2 = new THREE.MeshStandardMaterial({
                color: element.color || 0x9E9E9E,
                wireframe: element.wireframe || false
              });
              
              const thread = new THREE.Mesh(threadGeometry2, threadMaterial2);
              screwGroup.add(thread);
              
              screwGroup.position.set(
                element.x + originOffset.x,
                element.y + originOffset.y,
                (element.z || 0) + originOffset.z
              );
              
              // Apply rotation if specified
              if (element.rotation) {
                screwGroup.rotation.x = THREE.MathUtils.degToRad(element.rotation.x || 0);
                screwGroup.rotation.y = THREE.MathUtils.degToRad(element.rotation.y || 0);
                screwGroup.rotation.z = THREE.MathUtils.degToRad(element.rotation.z || 0);
              } else {
                // Default orientation
                screwGroup.rotation.x = Math.PI;
              }
              
              return screwGroup;
              
            case 'nut':
              // Create a simplified nut
              const nutGroup = new THREE.Group();
              
              // Parse size
              let nutDiameter = 5; // Default 5mm
              if (element.size && typeof element.size === 'string') {
                const match = element.size.match(/M(\d+)/i);
                if (match) {
                  nutDiameter = parseInt(match[1], 10);
                }
              }
              
              // Derived dimensions
              const nutThickness = nutDiameter * 0.8;
              const nutWidth = nutDiameter * 1.8;
              
              // Create hexagonal prism
              const nutShape = new THREE.Shape();
              for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                const x = (nutWidth / 2) * Math.cos(angle);
                const y = (nutWidth / 2) * Math.sin(angle);
                
                if (i === 0) {
                  nutShape.moveTo(x, y);
                } else {
                  nutShape.lineTo(x, y);
                }
              }
              nutShape.closePath();
              
              const extrudeSettings2 = {
                depth: nutThickness,
                bevelEnabled: false
              };
              
              const nutGeometry = new THREE.ExtrudeGeometry(nutShape, extrudeSettings2);
              const nutMaterial = new THREE.MeshStandardMaterial({
                color: element.color || 0x9E9E9E,
                wireframe: element.wireframe || false
              });
              
              const nutBody = new THREE.Mesh(nutGeometry, nutMaterial);
              nutBody.rotation.x = Math.PI / 2;
              nutGroup.add(nutBody);
              
              // Create center hole
              const holeGeometry = new THREE.CylinderGeometry(
                nutDiameter / 2,
                nutDiameter / 2,
                nutThickness + 0.2,
                32
              );
              
              const holeMaterial = new THREE.MeshBasicMaterial({
                color: 0x000000
              });
              
              const hole = new THREE.Mesh(holeGeometry, holeMaterial);
              nutGroup.add(hole);
              
              nutGroup.position.set(
                element.x + originOffset.x,
                element.y + originOffset.y,
                (element.z || 0) + originOffset.z
              );
              
              // Apply rotation if specified
              if (element.rotation) {
                nutGroup.rotation.x = THREE.MathUtils.degToRad(element.rotation.x || 0);
                nutGroup.rotation.y = THREE.MathUtils.degToRad(element.rotation.y || 0);
                nutGroup.rotation.z = THREE.MathUtils.degToRad(element.rotation.z || 0);
              }
              
              return nutGroup;
              
            case 'washer':
              // Create a washer
              let washerDiameter = 5; // Default 5mm
              if (element.size && typeof element.size === 'string') {
                const match = element.size.match(/M(\d+)/i);
                if (match) {
                  washerDiameter = parseInt(match[1], 10);
                }
              }
              
              // Derived dimensions
              const outerDiameter = washerDiameter * 2.2;
              const washerThickness = washerDiameter * 0.2;
              
              // Create washer geometry (toroidal shape)
              const washerGeometry = new THREE.RingGeometry(
                washerDiameter / 2,
                outerDiameter / 2,
                32,
                1
              );
              
              const washerMaterial = new THREE.MeshStandardMaterial({
                color: element.color || 0x9E9E9E,
                wireframe: element.wireframe || false
              });
              
              const washer = new THREE.Mesh(washerGeometry, washerMaterial);
              washer.position.set(
                element.x + originOffset.x,
                element.y + originOffset.y,
                (element.z || 0) + originOffset.z
              );
              
              // Give it thickness
              washer.scale.set(1, 1, washerThickness);
              
              // Apply rotation if specified
              if (element.rotation) {
                washer.rotation.x = THREE.MathUtils.degToRad(element.rotation.x || 0);
                washer.rotation.y = THREE.MathUtils.degToRad(element.rotation.y || 0);
                washer.rotation.z = THREE.MathUtils.degToRad(element.rotation.z || 0);
              }
              
              return washer;
              
            case 'rivet':
              // Create a simplified rivet
              const rivetGroup = new THREE.Group();
              
              const rivetDiameter = element.diameter || 3;
              const rivetLength = element.length || 10;
              
              // Create head
              const rivetHeadDiameter = rivetDiameter * 2;
              const rivetHeadHeight = rivetDiameter * 0.6;
              
              const rivetHead = new THREE.Mesh(
                new THREE.CylinderGeometry(rivetHeadDiameter / 2, rivetHeadDiameter / 2, rivetHeadHeight, 32),
                new THREE.MeshStandardMaterial({
                  color: element.color || 0x9E9E9E,
                  wireframe: element.wireframe || false
                })
              );
              rivetHead.position.y = rivetLength / 2 - rivetHeadHeight / 2;
              rivetGroup.add(rivetHead);
              
              // Create shaft
              const shaftLength = rivetLength - rivetHeadHeight;
              const shaft = new THREE.Mesh(
                new THREE.CylinderGeometry(rivetDiameter / 2, rivetDiameter / 2, shaftLength, 32),
                new THREE.MeshStandardMaterial({
                  color: element.color || 0x9E9E9E,
                  wireframe: element.wireframe || false
                })
              );
              shaft.position.y = -shaftLength / 2;
              rivetGroup.add(shaft);
              
              rivetGroup.position.set(
                element.x + originOffset.x,
                element.y + originOffset.y,
                (element.z || 0) + originOffset.z
              );
              
              // Apply rotation if specified
              if (element.rotation) {
                rivetGroup.rotation.x = THREE.MathUtils.degToRad(element.rotation.x || 0);
                rivetGroup.rotation.y = THREE.MathUtils.degToRad(element.rotation.y || 0);
                rivetGroup.rotation.z = THREE.MathUtils.degToRad(element.rotation.z || 0);
              } else {
                // Default orientation
                rivetGroup.rotation.x = Math.PI;
              }
              
              return rivetGroup;
            
            // ======= ARCHITECTURAL ELEMENTS =======
            case 'wall':
              const wallLength = element.length || 100;
              const wallHeight = element.height || 30;
              const wallThickness = element.thickness || 5;
              
              const wallGeometry = new THREE.BoxGeometry(wallLength, wallHeight, wallThickness);
              const wallMaterial = new THREE.MeshStandardMaterial({
                color: element.color || 0xE0E0E0,
                wireframe: element.wireframe || false
              });
              
              const wall = new THREE.Mesh(wallGeometry, wallMaterial);
              
              // Position wall with bottom at y=0 by default
              wall.position.set(
                (element.x || 0) + originOffset.x,
                (element.y || (wallHeight / 2)) + originOffset.y,
                (element.z || 0) + originOffset.z
              );
              
              // Add openings if specified
              if (element.openings && Array.isArray(element.openings)) {
                // This would require CSG operations for proper holes
                // For now, we'll just add visual markers for the openings
                element.openings.forEach((opening: any) => {
                  const openingMaterial = new THREE.MeshBasicMaterial({
                    color: 0x000000,
                    wireframe: true
                  });
                  
                  const openingGeometry = new THREE.BoxGeometry(
                    opening.width || 10,
                    opening.height || 20,
                    wallThickness + 0.2
                  );
                  
                  const openingMesh = new THREE.Mesh(openingGeometry, openingMaterial);
                  
                  openingMesh.position.set(
                    opening.x || 0,
                    opening.y || 0,
                    0
                  );
                  
                  wall.add(openingMesh);
                });
              }
              
              return wall;
              
            case 'floor':
              const floorWidth = element.width || 100;
              const floorLength = element.length || 100;
              const floorThickness = element.thickness || 2;
              
              const floorGeometry = new THREE.BoxGeometry(floorWidth, floorThickness, floorLength);
              const floorMaterial = new THREE.MeshStandardMaterial({
                color: element.color || 0xBCAAA4,
                wireframe: element.wireframe || false
              });
              
              const floor = new THREE.Mesh(floorGeometry, floorMaterial);
              floor.position.set(
                (element.x || 0) + originOffset.x,
                (element.y || 0) + originOffset.y,
                (element.z || 0) + originOffset.z
              );
              
              return floor;
              
            case 'roof':
              const roofWidth = element.width || 100;
              const roofLength = element.length || 100;
              const roofHeight = element.height || 20;
              const roofStyle = element.style || 'pitched';
              
              const roofGroup = new THREE.Group();
              roofGroup.position.set(
                (element.x || 0) + originOffset.x,
                (element.y || 0) + originOffset.y,
                (element.z || 0) + originOffset.z
              );
              
              if (roofStyle === 'flat') {
                // Flat roof is just a box
                const flatRoofGeometry = new THREE.BoxGeometry(roofWidth, roofHeight / 4, roofLength);
                const flatRoofMaterial = new THREE.MeshStandardMaterial({
                  color: element.color || 0x795548,
                  wireframe: element.wireframe || false
                });
                
                const flatRoof = new THREE.Mesh(flatRoofGeometry, flatRoofMaterial);
                roofGroup.add(flatRoof);
              } else if (roofStyle === 'pitched') {
                // Create a pitched roof (triangle extrusion)
                const pitchedRoofShape = new THREE.Shape();
                pitchedRoofShape.moveTo(-roofWidth / 2, 0);
                pitchedRoofShape.lineTo(roofWidth / 2, 0);
                pitchedRoofShape.lineTo(0, roofHeight);
                pitchedRoofShape.closePath();
                
                const extrudeSettings = {
                  depth: roofLength,
                  bevelEnabled: false
                };
                
                const pitchedRoofGeometry = new THREE.ExtrudeGeometry(pitchedRoofShape, extrudeSettings);
                const pitchedRoofMaterial = new THREE.MeshStandardMaterial({
                  color: element.color || 0x795548,
                  wireframe: element.wireframe || false
                });
                
                const pitchedRoof = new THREE.Mesh(pitchedRoofGeometry, pitchedRoofMaterial);
                pitchedRoof.rotation.x = -Math.PI / 2;
                pitchedRoof.position.z = -roofLength / 2;
                roofGroup.add(pitchedRoof);
              }
              
              return roofGroup;
              
            case 'window':
              const windowWidth = element.width || 10;
              const windowHeight = element.height || 15;
              const windowThickness = element.thickness || 0.5;
              const windowStyle = element.style || 'simple';
              
              const windowGroup = new THREE.Group();
              
              // Create window frame
              const frameGeometry = new THREE.BoxGeometry(windowWidth, windowHeight, windowThickness);
              const frameMaterial = new THREE.MeshStandardMaterial({
                color: element.frameColor || 0x8D6E63,
                wireframe: element.wireframe || false
              });
              
              const frame = new THREE.Mesh(frameGeometry, frameMaterial);
              windowGroup.add(frame);
              
              // Create glass
              const glassWidth = windowWidth * 0.8;
              const glassHeight = windowHeight * 0.8;
              
              const glassGeometry = new THREE.BoxGeometry(glassWidth, glassHeight, windowThickness * 0.2);
              const glassMaterial = new THREE.MeshStandardMaterial({
                color: 0xB3E5FC,
                transparent: true,
                opacity: 0.6,
                wireframe: element.wireframe || false
              });
              
              const glass = new THREE.Mesh(glassGeometry, glassMaterial);
              glass.position.z = windowThickness * 0.3;
              windowGroup.add(glass);
              
              // Add window details based on style
              if (windowStyle === 'divided') {
                // Add dividers
                const dividerWidth = windowWidth * 0.05;
                const horizontalDivider = new THREE.Mesh(
                  new THREE.BoxGeometry(glassWidth + dividerWidth, dividerWidth, windowThickness * 0.4),
                  frameMaterial
                );
                horizontalDivider.position.z = windowThickness * 0.3;
                windowGroup.add(horizontalDivider);
                const verticalDivider = new THREE.Mesh(
                  new THREE.BoxGeometry(dividerWidth, glassHeight + dividerWidth, windowThickness * 0.4),
                  frameMaterial
                );
                verticalDivider.position.z = windowThickness * 0.3;
                windowGroup.add(verticalDivider);
              }
              
              windowGroup.position.set(
                element.x + originOffset.x,
                element.y + originOffset.y,
                (element.z || 0) + originOffset.z
              );
              
              return windowGroup;
              
            case 'door':
              const doorWidth = element.width || 10;
              const doorHeight = element.height || 20;
              const doorThickness = element.thickness || 1;
              const doorStyle = element.style || 'simple';
              
              const doorGroup = new THREE.Group();
              
              // Create door panel
              const doorGeometry = new THREE.BoxGeometry(doorWidth, doorHeight, doorThickness);
              const doorMaterial = new THREE.MeshStandardMaterial({
                color: element.color || 0x8D6E63,
                wireframe: element.wireframe || false
              });
              
              const door = new THREE.Mesh(doorGeometry, doorMaterial);
              doorGroup.add(door);
              
              // Add details based on style
              if (doorStyle === 'paneled') {
                // Add panels
                const panelDepth = doorThickness * 0.3;
                const panelWidth = doorWidth * 0.7;
                const panelHeight = doorHeight * 0.25;
                
                const topPanel = new THREE.Mesh(
                  new THREE.BoxGeometry(panelWidth, panelHeight, panelDepth),
                  doorMaterial
                );
                topPanel.position.y = doorHeight * 0.25;
                topPanel.position.z = -doorThickness * 0.2;
                doorGroup.add(topPanel);
                
                const bottomPanel = new THREE.Mesh(
                  new THREE.BoxGeometry(panelWidth, panelHeight, panelDepth),
                  doorMaterial
                );
                bottomPanel.position.y = -doorHeight * 0.25;
                bottomPanel.position.z = -doorThickness * 0.2;
                doorGroup.add(bottomPanel);
              }
              
              // Add doorknob
              const doorknob = new THREE.Mesh(
                new THREE.SphereGeometry(doorWidth * 0.08, 16, 16),
                new THREE.MeshStandardMaterial({
                  color: 0xFFD700,
                  wireframe: element.wireframe || false
                })
              );
              doorknob.position.x = doorWidth * 0.4;
              doorknob.position.z = doorThickness * 0.6;
              doorGroup.add(doorknob);
              
              doorGroup.position.set(
                element.x + originOffset.x,
                element.y + originOffset.y,
                (element.z || 0) + originOffset.z
              );
              
              return doorGroup;
              
            case 'stair':
              const stairWidth = element.width || 10;
              const stairHeight = element.height || 20;
              const stairDepth = element.depth || 30;
              const stepsCount = element.steps || 10;
              
              const stairGroup = new THREE.Group();
              
              // Create individual steps
              const stepWidth = stairWidth;
              const stepHeight = stairHeight / stepsCount;
              const stepDepth = stairDepth / stepsCount;
              
              for (let i = 0; i < stepsCount; i++) {
                const stepGeometry = new THREE.BoxGeometry(stepWidth, stepHeight, stepDepth);
                const stepMaterial = new THREE.MeshStandardMaterial({
                  color: element.color || 0xBCAAA4,
                  wireframe: element.wireframe || false
                });
                
                const step = new THREE.Mesh(stepGeometry, stepMaterial);
                step.position.y = i * stepHeight + stepHeight / 2;
                step.position.z = i * stepDepth + stepDepth / 2;
                
                stairGroup.add(step);
              }
              
              stairGroup.position.set(
                element.x + originOffset.x,
                element.y + originOffset.y,
                (element.z || 0) + originOffset.z
              );
              
              return stairGroup;
              
            case 'column':
              const columnRadius = element.radius || 5;
              const columnHeight = element.height || 30;
              const columnStyle = element.style || 'simple';
              
              const columnGroup = new THREE.Group();
              
              // Create base column
              const columnGeometry = new THREE.CylinderGeometry(
                columnRadius,
                columnRadius,
                columnHeight,
                20
              );
              const columnMaterial = new THREE.MeshStandardMaterial({
                color: element.color || 0xE0E0E0,
                wireframe: element.wireframe || false
              });
              
              const column = new THREE.Mesh(columnGeometry, columnMaterial);
              columnGroup.add(column);
              
              // Add details based on style
              if (columnStyle === 'doric' || columnStyle === 'ionic' || columnStyle === 'corinthian') {
                // Add base
                const baseHeight = columnHeight * 0.05;
                const baseRadius = columnRadius * 1.2;
                
                const base = new THREE.Mesh(
                  new THREE.CylinderGeometry(baseRadius, baseRadius, baseHeight, 20),
                  columnMaterial
                );
                base.position.y = -columnHeight / 2 + baseHeight / 2;
                columnGroup.add(base);
                
                // Add capital
                const capitalHeight = columnHeight * 0.05;
                const capitalRadius = columnRadius * 1.2;
                
                const capital = new THREE.Mesh(
                  new THREE.CylinderGeometry(capitalRadius, capitalRadius, capitalHeight, 20),
                  columnMaterial
                );
                capital.position.y = columnHeight / 2 - capitalHeight / 2;
                columnGroup.add(capital);
                
                // For more elaborate styles, add fluting (vertical grooves)
                if (columnStyle === 'ionic' || columnStyle === 'corinthian') {
                  // Add simplified decoration to capital
                  const decorationRadius = capitalRadius * 1.1;
                  const decoration = new THREE.Mesh(
                    new THREE.CylinderGeometry(decorationRadius, capitalRadius, capitalHeight * 0.5, 20),
                    columnMaterial
                  );
                  decoration.position.y = columnHeight / 2 + capitalHeight * 0.25;
                  columnGroup.add(decoration);
                }
              }
              
              columnGroup.position.set(
                element.x + originOffset.x,
                element.y + originOffset.y,
                (element.z || 0) + originOffset.z
              );
              
              return columnGroup;
            
            // ======= SPECIAL ELEMENTS =======
            case 'text3d':
              // Three.js requires loading fonts for proper TextGeometry
              // For a placeholder, we'll create a plane with the text content
              const textWidth = element.text ? element.text.length * element.height * 0.6 : 10;
              const textHeight = element.height || 5;
              const textDepth = element.depth || 2;
              
              const textPlaceholder = new THREE.Mesh(
                new THREE.BoxGeometry(textWidth, textHeight, textDepth),
                new THREE.MeshStandardMaterial({
                  color: element.color || 0x4285F4,
                  wireframe: element.wireframe || false
                })
              );
              
              textPlaceholder.position.set(
                element.x + originOffset.x,
                element.y + originOffset.y,
                (element.z || 0) + originOffset.z
              );
              
              textPlaceholder.userData.text = element.text;
              textPlaceholder.userData.isTextPlaceholder = true;
              
              return textPlaceholder;
              
            case 'path3d':
              if (!element.points || element.points.length < 2) return null;
              
              // Create a path from the points
             
              const path = new THREE.CatmullRomCurve3(pathPoints);
              
              // Create geometry and material
              const pathGeometry = new THREE.TubeGeometry(
                path,
                element.segments || 64,
                element.radius || 0.5,
                element.radialSegments || 8,
                element.closed || false
              );
              
              const pathMaterial = new THREE.MeshStandardMaterial({
                color: element.color || 0x4285F4,
                wireframe: element.wireframe || false
              });
              
              const pathMesh = new THREE.Mesh(pathGeometry, pathMaterial);
              
              return pathMesh;
              
            case 'point-cloud':
              if (!element.points || !Array.isArray(element.points)) return null;
              
              // Create a point cloud from the points
              const pointPositions = new Float32Array(element.points.length * 3);
              
              element.points.forEach((point: any, i: number) => {
                pointPositions[i * 3] = point.x + originOffset.x;
                pointPositions[i * 3 + 1] = point.y + originOffset.y;
                pointPositions[i * 3 + 2] = (point.z || 0) + originOffset.z;
              });
              
              const pointGeometry = new THREE.BufferGeometry();
              pointGeometry.setAttribute('position', new THREE.BufferAttribute(pointPositions, 3));
              
              // If color data is provided, use it
              if (element.colors && Array.isArray(element.colors)) {
                const colors = new Float32Array(element.colors.length * 3);
                
                element.colors.forEach((color: any, i: number) => {
                  colors[i * 3] = color.r || 0.5;
                  colors[i * 3 + 1] = color.g || 0.5;
                  colors[i * 3 + 2] = color.b || 0.5;
                });
                
                pointGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
              }
              
              const pointMaterial = new THREE.PointsMaterial({
                color: element.color || 0x4285F4,
                size: element.pointSize || 0.5,
                sizeAttenuation: true,
                vertexColors: element.colors ? true : false
              });
              
              const pointCloud = new THREE.Points(pointGeometry, pointMaterial);
              
              return pointCloud;
              
            case 'mesh':
              // For a custom mesh, we need vertices and faces data
              if (!element.vertices || !element.faces) return null;
              
              const meshGeometry = new THREE.BufferGeometry();
              
              // Convert vertices to Float32Array
              const vertices2 = new Float32Array(element.vertices.length * 3);
              element.vertices.forEach((vertex: any, i: number) => {
                vertices[i * 3] = vertex.x + originOffset.x;
                vertices[i * 3 + 1] = vertex.y + originOffset.y;
                vertices[i * 3 + 2] = (vertex.z || 0) + originOffset.z;
              });
              
              // Convert faces to indices
              const indices2: number[] = [];
              element.faces.forEach((face: any) => {
                if (Array.isArray(face) && face.length >= 3) {
                  // Basic triangles
                  indices.push(face[0], face[1], face[2]);
                  
                  // If more than 3 vertices (quad or n-gon), triangulate
                  for (let i = 3; i < face.length; i++) {
                    indices.push(face[0], face[i - 1], face[i]);
                  }
                }
              });
              
              meshGeometry.setIndex(indices2);
              meshGeometry.setAttribute('position', new THREE.BufferAttribute(vertices2, 3));
              meshGeometry.computeVertexNormals();
              
              const meshMaterial = new THREE.MeshStandardMaterial({
                color: element.color || 0x4285F4,
                wireframe: element.wireframe || false
              });
              
              const mesh = new THREE.Mesh(meshGeometry, meshMaterial);
              ensureObjectMetadata(mesh, element.id);
              return mesh;
              
              
              
            case 'group':
              const group = new THREE.Group();
              group.position.set(
                (element.x || 0) + originOffset.x,
                (element.y || 0) + originOffset.y,
                (element.z || 0) + originOffset.z
              );
              
              // Add child elements if provided
              if (element.elements && Array.isArray(element.elements)) {
                element.elements.forEach((childElement: any) => {
                  // Set zero origin offset for children to avoid double-offset
                  const childThreeObject = createThreeObject({
                    ...childElement,
                    x: childElement.x || 0,
                    y: childElement.y || 0,
                    z: childElement.z || 0
                  });
                  
                  if (childThreeObject) {
                    childThreeObject.userData.isCADElement = true;
                    childThreeObject.userData.elementId = childElement.id;
                    group.add(childThreeObject);
                  }
                });
              }
              
              return group;
              
              
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
              
              return workpiece
            
      default:
        ensureObjectMetadata(threeObject as unknown as THREE.Object3D, element.id);
        // Default fallback for unknown types
        console.warn(`Unknown element type: ${element.type}`);
        return threeObject;
    
            }
    // Add metadata to the Three.js object
    
        }

  // Highlight and select visual indication
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
    
    // Highlight selected elements
    if (selectedElements.includes(element.id)) {
      if (threeObject instanceof THREE.Line) {
        (threeObject.material as THREE.LineBasicMaterial).color.set(0x00ff7f);
        (threeObject.material as THREE.LineBasicMaterial).linewidth = (element.linewidth || 1) + 2;
      } else if (threeObject instanceof THREE.Mesh) {
        if ((threeObject.material as THREE.MeshBasicMaterial).wireframe) {
          (threeObject.material as THREE.MeshBasicMaterial).color.set(0x00ff7f);
        } else {
          const material = threeObject.material as THREE.MeshStandardMaterial;
          material.emissive.set(0x00ff7f);
          material.emissiveIntensity = 0.5;
        }
      }
    }
  }, [hoveredElementId, selectedElement, selectedElements]);



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
    
    // Render each element
    elements.forEach(element => {
      const threeObject = createThreeObject(element);
      if (threeObject) {
        // Apply highlighting
        highlightElement(threeObject, element);
        
        // Add to scene
        sceneRef.current?.add(threeObject);
      }
    });
    
    // Apply LOD
    if (typeof applyLOD === 'function') {
      applyLOD();
    }
    
    // Optimize scene
    if (typeof optimizeScene === 'function') {
      optimizeScene();
    }
    
    // Update control points
    updateControlPoints();
  }, [elements, layers, hoveredElementId, selectedElement, selectedElements, applyLOD, optimizeScene, updateControlPoints, highlightElement]);

  // Function to add a command to the history
  const addCommandToHistory = useCallback((command: CommandHistory) => {
    // Remove commands that were overwritten (in case of undo followed by new action)
    const newHistory = commandHistory.slice(0, historyIndex + 1);
    setCommandHistory([...newHistory, command]);
    setHistoryIndex(newHistory.length);
  }, [commandHistory, historyIndex]);

  // Undo function
  const undo = useCallback(() => {
    if (historyIndex >= 0) {
      commandHistory[historyIndex].undo();
      setHistoryIndex(historyIndex - 1);
    }
  }, [commandHistory, historyIndex]);

  // Redo function
  const redo = useCallback(() => {
    if (historyIndex < commandHistory.length - 1) {
      commandHistory[historyIndex + 1].redo();
      setHistoryIndex(historyIndex + 1);
    }
  }, [commandHistory, historyIndex]);

  // Initialize TransformControls
  useEffect(() => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;
    
    // Create transform controls for direct manipulation
    const transformControls = new TransformControls(
      cameraRef.current,
      rendererRef.current.domElement
    );
    transformControls.size = 0.8; // Smaller size to not get in the way
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

  // Update transform controls when selected element changes
  useEffect(() => {
    if (!transformControlsRef.current) return;
    
    if (selectedElement) {
      // Find the Three.js object corresponding to the selected element
      const selectedObject = sceneRef.current?.children.find(
        child => child.userData?.isCADElement && child.userData?.elementId === selectedElement.id
      );
      
      if (selectedObject) {
        try {
          // Find an appropriate mesh child if the object is a group
          let targetObject = selectedObject;
          
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
          
          // Ensure controls are at the top of the scene hierarchy
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

  // Handle transform controls object changes
  useEffect(() => {
    if (!transformControlsRef.current) return;
    
    const handleObjectChange = () => {
      if (!selectedElement) return;
      
      const object = transformControlsRef.current?.object;
      if (!object) return;
      
      // Extract position, rotation, and scale
      const position = new THREE.Vector3();
      const rotation = new THREE.Euler();
      const scale = new THREE.Vector3();
      
      object.getWorldPosition(position);
      rotation.copy(object.rotation);
      scale.copy(object.scale);
      
      // Update the element in store
      const updates: any = {
        x: position.x - originOffset.x,
        y: position.y - originOffset.y,
        z: position.z - originOffset.z
      };
      
      // Add rotation in degrees
      if (transformMode === 'rotate') {
        updates.rotationX = THREE.MathUtils.radToDeg(rotation.x);
        updates.rotationY = THREE.MathUtils.radToDeg(rotation.y);
        updates.rotationZ = THREE.MathUtils.radToDeg(rotation.z);
      }
      
      // Add scale
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

  // World to screen coordinate conversion
  const worldToScreen = (worldPos: THREE.Vector3): { x: number, y: number } | null => {
    if (!cameraRef.current || !canvasRef.current) return null;
    
    const vector = worldPos.clone();
    const canvas = canvasRef.current;
    
    // Project from 3D to normalized 2D
    vector.project(cameraRef.current);
    
    // Convert normalized coordinates to canvas coordinates
    return { 
      x: ((vector.x + 1) / 2) * canvas.clientWidth,
      y: ((-vector.y + 1) / 2) * canvas.clientHeight
    };
  };

  // Handle component drag over
  const handleComponentDragOver = useCallback((event: React.DragEvent) => {
    if (!allowDragDrop) return;
    
    event.preventDefault();
    setIsDraggingComponent(true);
    
    if (!canvasRef.current || !cameraRef.current || !sceneRef.current) return;
    
    try {
      // Calculate normalized mouse coordinates
      const rect = canvasRef.current.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      // Calculate intersection with XY plane
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouseRef.current, cameraRef.current);
      
      // Check for intersection with existing objects or use a base plane
      const intersects = raycaster.intersectObjects(
        sceneRef.current.children.filter(child => 
          child.userData?.isCADElement && 
          child.visible
        ),
        true
      );
      
      let targetPosition: { x: number, y: number, z: number };
      
      if (intersects.length > 0) {
        // Use the closest intersection point
        const point = intersects[0].point;
        targetPosition = { x: point.x, y: point.y, z: point.z };
      } else {
        // Calculate intersection with XY plane
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
      
      // Apply snapping if enabled
      if (snapSettings.enabled) {
        const snappedPoint = snapToPoint(targetPosition);
        if (snappedPoint) {
          targetPosition = snappedPoint;
        }
      }
      
      // Calculate screen position for indicator
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

  // Handle component drop
  const handleComponentDrop = useCallback((event: React.DragEvent) => {
    if (!allowDragDrop) return;
    
    event.preventDefault();
    const componentId = event.dataTransfer.getData('component/id');
    
    if (!componentId) return;
    
    // Find the component from predefined components or elsewhere
    try {
      const newElement = {
        type: 'component',
        x: dropPosition.x,
        y: dropPosition.y,
        z: dropPosition.z,
        componentId,
        layerId: useLayerStore.getState().activeLayer
      };
      
      // Add the element
      const elementId = addElement(newElement);
      
      // Select the new element
      if (elementId) {
        selectElement(elementId);
      }
      
      toast.success('Component placed successfully');
    } catch (error) {
      console.error("Error dropping component:", error);
      toast.error('Failed to place component');
    }
    
    // Reset drag & drop state
    setIsDraggingComponent(false);
    setDraggedComponent(null);
  }, [allowDragDrop, dropPosition, addElement, selectElement]);

  // Handle component drag leave
  const handleComponentDragLeave = useCallback(() => {
    setIsDraggingComponent(false);
  }, []);

  // Handle saving selection as component
  const handleSaveSelection = useCallback(async (data: any) => {
    try {
      if (!selectionData || !selectionData.elements || selectionData.elements.length === 0) {
        toast.error('No elements selected');
        return;
      }
      
      // Create component data
      const componentData = {
        name: data.name,
        description: data.description,
        projectId: data.projectId,
        type: data.type,
        elements: selectionData.elements
      };
      
      // Save component using API
      await createComponentFromElements(componentData);
      
      toast.success('Component created successfully');
    } catch (error) {
      console.error('Error creating component:', error);
      toast.error('Failed to create component');
      throw error;
    }
  }, [selectionData]);

  // All keyboard shortcuts for the dialog
  const allShortcuts: ShortcutCategory[] = [
    {
      title: "Navigation",
      shortcuts: [
        { keys: ["Left Click + Drag"], description: "Rotate camera (3D mode)" },
        { keys: ["Middle Click + Drag"], description: "Pan view" },
        { keys: ["Right Click + Drag"], description: "Orbit around selection" },
        { keys: ["Scroll"], description: "Zoom in/out" },
        { keys: ["+", "="], description: "Zoom in" },
        { keys: ["-", "_"], description: "Zoom out" },
        { keys: ["F"], description: "Zoom to fit/focus on selection" },
        { keys: ["Ctrl + 1"], description: "Switch to 3D view" },
        { keys: ["Ctrl + 2"], description: "Switch to top view (2D)" },
      ]
    },
    {
      title: "Selection & Editing",
      shortcuts: [
        { keys: ["Click"], description: "Select object" },
        { keys: ["Shift + Click"], description: "Add to selection" },
        { keys: ["Ctrl + A"], description: "Select all visible elements" },
        { keys: ["Escape"], description: "Deselect all / Cancel current operation" },
        { keys: ["Delete", "Backspace"], description: "Delete selected objects" },
        { keys: ["G"], description: "Move (Translate) mode" },
        { keys: ["R"], description: "Rotate mode" },
        { keys: ["S"], description: "Scale mode" },
        { keys: ["X"], description: "Constrain to X axis" },
        { keys: ["Y"], description: "Constrain to Y axis" },
        { keys: ["Z"], description: "Constrain to Z axis" },
      ]
    },
    {
      title: "Clipboard Operations",
      shortcuts: [
        { keys: ["Ctrl + C"], description: "Copy selected elements" },
        { keys: ["Ctrl + V"], description: "Paste elements" },
        { keys: ["Ctrl + D"], description: "Duplicate selected elements" },
        { keys: ["Ctrl + X"], description: "Cut selected elements" },
      ]
    },
    {
      title: "Tools & Creation",
      shortcuts: [
        { keys: ["L"], description: "Line tool" },
        { keys: ["C"], description: "Circle tool" },
        { keys: ["R"], description: "Rectangle tool" },
        { keys: ["P"], description: "Polygon tool" },
        { keys: ["B"], description: "Box/Cube tool" },
        { keys: ["O"], description: "Sphere tool" },
        { keys: ["Y"], description: "Cylinder tool" },
        { keys: ["T"], description: "Text tool" },
        { keys: ["D"], description: "Dimension tool" },
        { keys: ["M"], description: "Measurement tool" },
      ]
    },
    {
      title: "View Controls",
      shortcuts: [
        { keys: ["Ctrl + G"], description: "Toggle grid visibility" },
        { keys: ["Ctrl + A"], description: "Toggle axes visibility" },
        { keys: ["F11", "Alt + F"], description: "Toggle fullscreen" },
        { keys: ["H"], description: "Hide selected objects" },
        { keys: ["Alt + H"], description: "Show all objects" },
        { keys: ["W"], description: "Toggle wireframe mode" },
        { keys: ["Alt + Z"], description: "Toggle X-ray mode" },
      ]
    },
    {
      title: "Snapping & Precision",
      shortcuts: [
        { keys: ["Ctrl + X"], description: "Toggle snap mode" },
        { keys: ["Alt + G"], description: "Toggle grid snap" },
        { keys: ["Alt + P"], description: "Toggle point snap" },
        { keys: ["Alt + M"], description: "Toggle midpoint snap" },
        { keys: ["Alt + I"], description: "Toggle intersection snap" },
        { keys: ["Alt + C"], description: "Toggle center snap" },
      ]
    },
    {
      title: "History & File Operations",
      shortcuts: [
        { keys: ["Ctrl + Z"], description: "Undo" },
        { keys: ["Ctrl + Y", "Ctrl + Shift + Z"], description: "Redo" },
        { keys: ["Ctrl + S"], description: "Save component from selection" },
        { keys: ["Ctrl + O"], description: "Open" },
        { keys: ["Ctrl + N"], description: "New" },
        { keys: ["Ctrl + E"], description: "Export" },
        { keys: ["Ctrl + I"], description: "Import" },
      ]
    },
    {
      title: "Layers & Organization",
      shortcuts: [
        { keys: ["Ctrl + L"], description: "Toggle layers panel" },
        { keys: ["Ctrl + Shift + N"], description: "New layer" },
        { keys: ["Ctrl + G"], description: "Group selected objects" },
        { keys: ["Ctrl + Shift + G"], description: "Ungroup" },
        { keys: ["Alt + L"], description: "Lock selected objects" },
        { keys: ["Alt + Shift + L"], description: "Unlock all objects" },
      ]
    },
    {
      title: "Help & UI",
      shortcuts: [
        { keys: ["?", "Shift + /"], description: "Show keyboard shortcuts (this dialog)" },
        { keys: ["F1"], description: "Help" },
        { keys: ["Ctrl + ,"], description: "Preferences" },
        { keys: ["Tab"], description: "Toggle sidebar" },
        { keys: ["Ctrl + B"], description: "Toggle properties panel" },
        { keys: ["Ctrl + Space"], description: "Command palette" },
        { keys: ["Ctrl + F"], description: "Search" },
      ]
    },
  ];

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
      {/* Snap indicator */}
      <SnapIndicator 
        x={snapIndicator.x} 
        y={snapIndicator.y} 
        type={snapIndicator.type} 
        visible={snapIndicator.visible} 
      />
      
      {/* Placement instructions */}
      {isPlacingComponent && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-md shadow-lg z-100">
          <p className="text-sm font-medium">Click to place component or press ESC to cancel</p>
        </div>
      )}
      
      {/* Drag & drop indicator */}
      {isDraggingComponent && (
        <DragDropIndicator 
          position={dropPosition} 
          screenPosition={dropScreenPosition}
        />
      )}
      
      {/* Selection tools */}
      <div className="absolute top-4 left-4 z-10">
        <SelectionControls
          isSelectionMode={selection.isSelectionMode}
          isMultiSelectMode={selection.isMultiSelectMode}
          onSelectionModeChange={selection.setSelectionModeActive}
          onMultiSelectModeToggle={selection.toggleMultiSelectMode}
          onDeleteSelected={selection.deleteSelectedElements}
          onDuplicateSelected={selection.duplicateSelectedElements}
          onMoveToLayer={selection.moveSelectionToLayer}
          onCreateComponent={() => setShowSelectionModal(true)}
          bounds={selectionBounds}
        />
      </div>
      
      {/* Transform tools */}
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
      
      {/* Utility buttons */}
      <div className="absolute bottom-4 right-4 flex space-x-2">
        {selectedElements.length > 0 && (
          <button
            onClick={() => setShowSelectionModal(true)}
            className="p-2 bg-blue-600 text-white bg-opacity-80 rounded-md shadow-md hover:bg-opacity-100 z-10 transition-all duration-200 flex items-center"
            title="Save selection as component"
          >
            <Save size={16} className="mr-1" />
            <span className="text-xs">Save As Component</span>
          </button>
        )}
        
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
      
      {/* Keyboard shortcuts button */}
      <div className="absolute bottom-4 left-4">
        <button 
          onClick={() => setShowKeyboardShortcuts(true)}
          className="p-2 bg-[#F8FBFF] dark:bg-gray-800 bg-opacity-80 rounded-full text-gray-700 dark:text-gray-200 hover:bg-opacity-100 shadow-md hover:shadow-lg transition-all duration-200"
          title="Show keyboard shortcuts (? or F2)"
        >
          <HelpCircle size={18} />
        </button>
      </div>
      
      {/* Keyboard shortcuts dialog */}
      <ShortcutsDialog 
        isOpen={showKeyboardShortcuts} 
        onClose={() => setShowKeyboardShortcuts(false)} 
        shortcuts={allShortcuts}
      />
      
      {/* Component save modal */}
      <SaveSelectionModal
        isOpen={showSelectionModal}
        onClose={() => setShowSelectionModal(false)}
        onSave={handleSaveSelection}
        selectionData={selectionData}
        selectionBounds={selectionBounds}
      />
    </div>
  );
};

export default CADCanvasEnhanced;