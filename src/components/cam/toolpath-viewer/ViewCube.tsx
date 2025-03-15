import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { ViewType } from '@/src/hooks/useToolpathVisualization';

interface ViewCubeProps {
  currentView: string;
  onViewChange: (view: ViewType) => void;
  size?: number;
}

/**
 * 3D view orientation cube similar to Fusion 360
 * Shows the current orientation and allows changing views by clicking
 */
export const ViewCube: React.FC<ViewCubeProps> = ({ 
  currentView,
  onViewChange,
  size = 70 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const cubeRef = useRef<THREE.Mesh | null>(null);
  const axesRef = useRef<THREE.Object3D | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [hoverFace, setHoverFace] = useState<string | null>(null);
  
  // Create and initialize the cube
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Create scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    // Create camera
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;
    
    // Create renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true
    });
    renderer.setSize(size, size);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Create cube
    const createCubeMaterials = () => {
      const materials = [
        // Right (+X) - Red
        new THREE.MeshBasicMaterial({ 
          color: 0x333333, 
          transparent: true,
          opacity: 0.8 
        }),
        // Left (-X) - Red darker
        new THREE.MeshBasicMaterial({ 
          color: 0x333333, 
          transparent: true,
          opacity: 0.8 
        }),
        // Top (+Y) - Green
        new THREE.MeshBasicMaterial({ 
          color: 0x333333, 
          transparent: true,
          opacity: 0.8 
        }),
        // Bottom (-Y) - Green darker
        new THREE.MeshBasicMaterial({ 
          color: 0x333333, 
          transparent: true,
          opacity: 0.8 
        }),
        // Front (+Z) - Blue
        new THREE.MeshBasicMaterial({ 
          color: 0x333333, 
          transparent: true,
          opacity: 0.8 
        }),
        // Back (-Z) - Blue darker
        new THREE.MeshBasicMaterial({ 
          color: 0x333333, 
          transparent: true,
          opacity: 0.8 
        })
      ];
      
      // Create labels for each face
      const createTextTexture = (text: string, backgroundColor = 'rgba(40, 40, 40, 0.8)') => {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        if (!context) return null;
        
        // Draw background
        context.fillStyle = backgroundColor;
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw text
        context.fillStyle = 'white';
        context.font = 'bold 32px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
      };
      
      // Apply textures to materials
      const labelMap = [
        createTextTexture('R'),  // Right face
        createTextTexture('L'),  // Left face
        createTextTexture('T'),  // Top face
        createTextTexture('B'),  // Bottom face
        createTextTexture('F'),  // Front face
        createTextTexture('B')   // Back face
      ];
      
      labelMap.forEach((texture, i) => {
        if (texture) {
          materials[i].map = texture;
        }
      });
      
      return materials;
    };
    
    const cubeGeometry = new THREE.BoxGeometry(1.8, 1.8, 1.8);
    const cubeMaterials = createCubeMaterials();
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterials);
    scene.add(cube);
    cubeRef.current = cube;
    
    // Add axes
    const axesHelper = new THREE.AxesHelper(1.5);
    scene.add(axesHelper);
    axesRef.current = axesHelper;
    
    // Add axes labels
    const addAxisLabel = (text: string, position: [number, number, number], color: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const context = canvas.getContext('2d');
      if (context) {
        context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
        context.font = 'Bold 24px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, 16, 16);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);
        sprite.position.set(...position);
        sprite.scale.set(0.5, 0.5, 1);
        scene.add(sprite);
      }
    };
    
    addAxisLabel('X', [1.8, 0, 0], 0xff0000);
    addAxisLabel('Y', [0, 1.8, 0], 0x00ff00);
    addAxisLabel('Z', [0, 0, 1.8], 0x0000ff);
    
    // Handle raycasting for interactivity
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    const handleMouseMove = (event: MouseEvent) => {
      if (!containerRef.current || !rendererRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / size) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / size) * 2 + 1;
      
      if (cameraRef.current && cubeRef.current) {
        raycaster.setFromCamera(mouse, cameraRef.current);
        const intersects = raycaster.intersectObject(cubeRef.current);
        
        if (intersects.length > 0) {
          const faceIndex = Math.floor(intersects[0].faceIndex! / 2);
          const faces = ['right', 'left', 'top', 'bottom', 'front', 'back'];
          setHoverFace(faces[faceIndex]);
          
          // Highlight the face
          if (cubeRef.current.material instanceof Array) {
            cubeRef.current.material.forEach((mat, i) => {
              if (i === faceIndex) {
                (mat as THREE.MeshBasicMaterial).color.set(0x4a90e2);
              } else {
                (mat as THREE.MeshBasicMaterial).color.set(0x333333);
              }
            });
          }
        } else {
          setHoverFace(null);
          
          // Reset all faces
          if (cubeRef.current.material instanceof Array) {
            cubeRef.current.material.forEach(mat => {
              (mat as THREE.MeshBasicMaterial).color.set(0x333333);
            });
          }
        }
      }
    };
    
    const handleMouseClick = () => {
      if (hoverFace) {
        let view: ViewType = 'perspective';
        
        switch (hoverFace) {
          case 'top':
            view = 'top';
            break;
          case 'front':
            view = 'front';
            break;
          case 'right':
            view = 'right';
            break;
          case 'left':
          case 'bottom':
          case 'back':
            // These are not standard views, we could add them if needed
            view = 'perspective';
            break;
        }
        
        onViewChange(view);
      }
    };
    
    const handleDoubleClick = () => {
      // Always return to iso view on double click
      onViewChange('isometric');
    };
    
    containerRef.current.addEventListener('mousemove', handleMouseMove);
    containerRef.current.addEventListener('click', handleMouseClick);
    containerRef.current.addEventListener('dblclick', handleDoubleClick);
    
    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      
      if (rendererRef.current && cameraRef.current && sceneRef.current) {
        // Update cube rotation based on current view
        if (cubeRef.current) {
          const targetRotation = new THREE.Euler();
          
          switch (currentView) {
            case 'top':
              targetRotation.set(Math.PI / 2, 0, 0);
              break;
            case 'front':
              targetRotation.set(0, 0, 0);
              break;
            case 'right':
              targetRotation.set(0, -Math.PI / 2, 0);
              break;
            case 'isometric':
              targetRotation.set(Math.PI / 6, Math.PI / 4, 0);
              break;
            default:
              // perspective
              targetRotation.set(Math.PI / 6, Math.PI / 4, 0);
          }
          
          // Smoothly interpolate to target rotation
          cubeRef.current.rotation.x += (targetRotation.x - cubeRef.current.rotation.x) * 0.1;
          cubeRef.current.rotation.y += (targetRotation.y - cubeRef.current.rotation.y) * 0.1;
          cubeRef.current.rotation.z += (targetRotation.z - cubeRef.current.rotation.z) * 0.1;
        }
        
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    
    animate();
    
    // Cleanup
    return () => {
      if (containerRef.current) {
        containerRef.current.removeEventListener('mousemove', handleMouseMove);
        containerRef.current.removeEventListener('click', handleMouseClick);
        containerRef.current.removeEventListener('dblclick', handleDoubleClick);
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, [currentView, onViewChange, size]);
  
  return (
    <div 
      ref={containerRef}
      className="cursor-pointer bg-black bg-opacity-20 rounded-md"
      style={{ width: size, height: size }}
      title="View Orientation Cube"
    />
  );
};
