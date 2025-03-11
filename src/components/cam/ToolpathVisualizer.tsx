// src/components/cam/ToolpathVisualizer.tsx
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { ChevronUp, Eye, EyeOff } from 'react-feather';
import { predefinedTools } from '@/src/lib/predefinedLibraries';
import { useCADStore } from 'src/store/cadStore';

interface ToolpathVisualizerProps {
  width: string;
  height: string;
  gcode: string;
  isSimulating: boolean;
  selectedTool?: string | null; // Nome dell'utensile selezionato dalla libreria
  showWorkpiece?: boolean; // Opzione per mostrare o nascondere il workpiece
}

interface Point {
  x: number;
  y: number;
  z: number;
}

const ToolpathVisualizer: React.FC<ToolpathVisualizerProps> = ({ 
  width, 
  height, 
  gcode, 
  isSimulating,
  selectedTool = null,
  showWorkpiece = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const toolPathRef = useRef<THREE.Line | null>(null);
  const toolRef = useRef<THREE.Mesh | null>(null);
  const workpieceRef = useRef<THREE.Mesh | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [currentLine, setCurrentLine] = useState(0);
  const toolPathPointsRef = useRef<Point[]>([]);
  const simulationSpeedRef = useRef(1);
  const lastTimeRef = useRef(0);
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);
  const [isWorkpieceVisible, setIsWorkpieceVisible] = useState<boolean>(showWorkpiece);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { viewMode, gridVisible, axisVisible } = useCADStore();
  // Ottieni il workpiece dallo store
  const { workpiece } = useCADStore();

  // Inizializza la scena Three.js
  useEffect(() => {
    if (!containerRef.current) return;

    // Crea renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setClearColor('#2A2A2A');
    containerRef.current.appendChild(renderer.domElement);

    // Crea scena
    const scene = new THREE.Scene();

    // Crea camera
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 10);

    // Aggiungi controlli
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;

    // Crea griglie di riferimento
    const gridHelper = new THREE.GridHelper(500, 500);  // Griglia molto più ampia (era 100x100)
    gridHelper.rotation.x = Math.PI / 2; // Rotate to XY plane
    gridHelper.visible = gridVisible;
    scene.add(gridHelper);

    // Funzione per creare assi personalizzati
    const createCustomAxes = (size: number) => {
      // Crea materiali per ogni asse con colori distinti
      const xAxisMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff }); // Blu per asse X
      const yAxisMaterial = new THREE.LineBasicMaterial({ color: 0xff00ff }); // Magenta per asse Y
      const zAxisMaterial = new THREE.LineBasicMaterial({ color: 0x00BFFF }); // Verde per asse Z

      // Crea geometrie per ogni asse
      // Asse X
      const xAxisGeometry = new THREE.BufferGeometry();
      xAxisGeometry.setAttribute('position', new THREE.Float32BufferAttribute([-size, 0, 0, size, 0, 0], 3));
      const xAxis = new THREE.Line(xAxisGeometry, xAxisMaterial);
      
      // Asse Y
      const yAxisGeometry = new THREE.BufferGeometry();
      yAxisGeometry.setAttribute('position', new THREE.Float32BufferAttribute([0, -size, 0, 0, size, 0], 3));
      const yAxis = new THREE.Line(yAxisGeometry, yAxisMaterial);
      
      // Asse Z
      const zAxisGeometry = new THREE.BufferGeometry();
      zAxisGeometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -size, 0, 0, size], 3));
      const zAxis = new THREE.Line(zAxisGeometry, zAxisMaterial);

      // Aggiungi etichette per gli assi
      const addAxisLabel = (text: string, position: [number, number, number], color: THREE.Color) => {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        if (context) {
          context.fillStyle = `rgb(${color.r * 255}, ${color.g * 255}, ${color.b * 255})`;
          context.font = 'Bold 35px Arial';
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

      // Crea un gruppo per contenere tutti gli elementi degli assi
      const axesGroup = new THREE.Group();
      axesGroup.add(xAxis);
      axesGroup.add(yAxis);
      axesGroup.add(zAxis);
      
      // Aggiungi etichette
      const xLabel = addAxisLabel('X', [size + 1, 0, 0], new THREE.Color(0, 0, 1));
      const yLabel = addAxisLabel('Y', [0, size + 1, 0], new THREE.Color(1, 0, 1));
      const zLabel = addAxisLabel('Z', [0, 0, size + 1], new THREE.Color(255, 255, 255));
      
      if (xLabel) axesGroup.add(xLabel);
      if (yLabel) axesGroup.add(yLabel);
      if (zLabel) axesGroup.add(zLabel);
      
      return axesGroup;
    };

    // Crea e aggiungi gli assi personalizzati alla scena
    const customAxes = createCustomAxes(10);
    scene.add(customAxes);

    // Aggiungi luci
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(5, 10, 5);
    scene.add(pointLight);

    // Crea il tool
    const toolGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 16);
    const toolMaterial = new THREE.MeshStandardMaterial({ color: 0x3366ff });
    const tool = new THREE.Mesh(toolGeometry, toolMaterial);
    tool.rotation.x = Math.PI / 2; // Orienta verticalmente
    scene.add(tool);
    toolRef.current = tool;

    // Aggiungi workpiece se richiesto e disponibile
    if (isWorkpieceVisible && workpiece) {
      const workpieceMesh = createWorkpiece(workpiece);
      scene.add(workpieceMesh);
      
      workpieceRef.current = workpieceMesh;
    }

    // Salva riferimenti
    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;
    controlsRef.current = controls;

    // Funzione di animazione
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      
      renderer.render(scene, camera);
    };
    
    animate();

    // Gestisci il resize della finestra
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      
      cameraRef.current.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (rendererRef.current && containerRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, [isWorkpieceVisible, workpiece]);

  // Funzione per creare un workpiece in base ai dati
  const createWorkpiece = (workpiece: any) => {
    // Determina il colore del materiale
    const getMaterialColor = (material: string) => {
      switch(material.toLowerCase()) {
        case 'aluminum': return 0xCCCCCC;
        case 'steel': return 0x888888;
        case 'wood': return 0xA0522D;
        case 'plastic': return 0x1E90FF;
        case 'brass': return 0xDAA520;
        case 'titanium': return 0x808080;
        default: return 0xAAAAAA;
      }
    };

    // Crea il materiale con trasparenza
    const material = new THREE.MeshStandardMaterial({
      color: getMaterialColor(workpiece.material || 'aluminum'),
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    const { originOffset } = useCADStore.getState();
    // Crea la geometria del workpiece
    const geometry = new THREE.BoxGeometry(
      workpiece.width || 100,
      workpiece.height || 200,
      workpiece.depth || 20
    );
    
    const mesh = new THREE.Mesh(geometry, material);
    
    // Posiziona il workpiece considerando la rotazione della griglia
    mesh.position.set(originOffset.x, originOffset.y,originOffset.z );
    mesh.rotation.x ;// Ruota per allinearlo alla griglia
    
    return mesh;
  };

  useEffect(() => {
   

    // Add orbit controls
    

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
    if (sceneRef.current) {
      sceneRef.current.add(customAxes);
    }

    // Store canvas dimensions

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
    
  }, [axisVisible, gridVisible]);

  // Gestione dello scroll per mostrare/nascondere il pulsante "torna su"
  useEffect(() => {
    const handleScroll = () => {
      if (wrapperRef.current) {
        setShowScrollTop(wrapperRef.current.scrollTop > 300);
      }
    };

    const wrapper = wrapperRef.current;
    if (wrapper) {
      wrapper.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (wrapper) {
        wrapper.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);


 
    
    // Update grid visibility
  useEffect(() => {
    if (!sceneRef.current) return;
    
    // Update grid visibility
    const gridHelper = sceneRef.current.children.find(
      child => child instanceof THREE.GridHelper
    ) as THREE.GridHelper | undefined;
    
    if (gridHelper) {
      gridHelper.material.opacity = 0.2;
      gridHelper.material.transparent = true;
      // Align grid with XZ plane
      gridHelper.rotation.x = Math.PI / 2; ;
    }
    
    
    // Update custom axes visibility
    const customAxes = sceneRef.current.children.find(
      child => child.userData.isCustomAxes
    );
    
    if (customAxes) {
      customAxes.visible = axisVisible;
    }
  }, [gridVisible, axisVisible]);


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

  // Gestione della visibilità del workpiece
  useEffect(() => {
    if (!sceneRef.current || !workpiece) return;
    
    // Rimuovi il workpiece attuale se esiste
    if (workpieceRef.current) {
      sceneRef.current.remove(workpieceRef.current);
      workpieceRef.current = null;
    }
    
    // Aggiungi il workpiece se deve essere visibile
    if (isWorkpieceVisible) {
      const workpieceMesh = createWorkpiece(workpiece);
      sceneRef.current.add(workpieceMesh);
      workpieceRef.current = workpieceMesh;
    }
  }, [isWorkpieceVisible, workpiece]);

  // Gestione dell'utensile selezionato
  useEffect(() => {
    if (!sceneRef.current || !selectedTool || !toolRef.current) return;
    
    // Trova l'utensile predefinito corrispondente
    const tool = predefinedTools.find(t => t.name === selectedTool);
    if (!tool) return;
    
    // Rimuovi l'utensile attuale
    if (toolRef.current) {
      sceneRef.current.remove(toolRef.current);
    }
    // Crea un nuovo utensile basato sulla definizione
    const nuovoUtensile = createToolVisualization(tool);
    if (nuovoUtensile instanceof THREE.Mesh) {
      toolRef.current = nuovoUtensile;
      sceneRef.current.add(toolRef.current);
      
      // Imposta la posizione iniziale
      if (toolPathPointsRef.current.length > 0) {
        const startPoint = toolPathPointsRef.current[0];
        toolRef.current.position.set(startPoint.x, startPoint.y, startPoint.z);
      } else {
        // Posiziona l'utensile al centro se non ci sono percorsi
        toolRef.current.position.set(0, 0, 0);
      }
    }
  }, [selectedTool]);

  const createToolVisualization = (tool: any): THREE.Object3D => {
    const group = new THREE.Group();
    
    // Determina il colore in base al tipo di materiale
    let toolColor = 0x3366ff; // Default blu
    if (tool.material === 'Carbide') {
      toolColor = 0x666666; // Grigio scuro per carbide
    } else if (tool.material === 'HSS') {
      toolColor = 0xcccccc; // Grigio chiaro per HSS
    }
    
    // Crea la geometria appropriata in base al tipo di utensile
    switch (tool.type) {
      case 'endmill':
        // Fresa cilindrica
        const shankHeight = tool.totalLength ? tool.totalLength - (tool.cuttingLength || 20) : 50;
        
        // Parte tagliente
        const cuttingGeometry = new THREE.CylinderGeometry(
          tool.diameter / 2,
          tool.diameter / 2,
          tool.cuttingLength || 20,
          32
        );
        const cuttingMaterial = new THREE.MeshStandardMaterial({ 
          color: toolColor,
          metalness: 0.8,
          roughness: 0.2
        });
        const cuttingPart = new THREE.Mesh(cuttingGeometry, cuttingMaterial);
        cuttingPart.position.set(0, 0, -((tool.cuttingLength || 20) / 2));
        
        // Gambo
        const shankGeometry = new THREE.CylinderGeometry(
          tool.shankDiameter ? tool.shankDiameter / 2 : tool.diameter / 2,
          tool.shankDiameter ? tool.shankDiameter / 2 : tool.diameter / 2,
          shankHeight,
          32
        );
        const shankMaterial = new THREE.MeshStandardMaterial({ 
          color: 0x999999,
          metalness: 0.5,
          roughness: 0.5
        });
        const shank = new THREE.Mesh(shankGeometry, shankMaterial);
        shank.position.set(0, 0, -(tool.cuttingLength || 20) - (shankHeight / 2));
        
        group.add(cuttingPart);
        group.add(shank);
        
        // Aggiungi scanalature per le flute se disponibili
        if (tool.numberOfFlutes && tool.numberOfFlutes > 0) {
          for (let i = 0; i < tool.numberOfFlutes; i++) {
            const angle = (i / tool.numberOfFlutes) * Math.PI * 2;
            const fluteGeometry = new THREE.BoxGeometry(
              0.5, 
              tool.diameter * 0.9, 
              tool.cuttingLength || 18
            );
            const fluteMaterial = new THREE.MeshStandardMaterial({ 
              color: 0x333333,
              metalness: 0.8,
              roughness: 0.2
            });
            const flute = new THREE.Mesh(fluteGeometry, fluteMaterial);
            flute.position.set(
              Math.sin(angle) * (tool.diameter / 2) * 0.7,
              Math.cos(angle) * (tool.diameter / 2) * 0.7,
              -(tool.cuttingLength || 18) / 2
            );
            group.add(flute);
          }
        }
        break;
        
      case 'ballendmill':
        // Fresa sferica
        const ballShankHeight = tool.totalLength ? tool.totalLength - (tool.cuttingLength || 20) : 50;
        
        // Parte sferica
        const ballGeometry = new THREE.SphereGeometry(
          tool.diameter / 2,
          32,
          32
        );
        const ballMaterial = new THREE.MeshStandardMaterial({ 
          color: toolColor,
          metalness: 0.8,
          roughness: 0.2
        });
        const ballPart = new THREE.Mesh(ballGeometry, ballMaterial);
        ballPart.position.set(0, 0, 0);
        
        // Parte cilindrica
        const cylinderGeometry = new THREE.CylinderGeometry(
          tool.diameter / 2,
          tool.diameter / 2,
          tool.cuttingLength || 20,
          32
        );
        const cylinderMaterial = new THREE.MeshStandardMaterial({ 
          color: toolColor,
          metalness: 0.8,
          roughness: 0.2
        });
        const cylinderPart = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
        cylinderPart.position.set(0, 0, -((tool.cuttingLength || 20) / 2));
        
        // Gambo
        const ballShankGeometry = new THREE.CylinderGeometry(
          tool.shankDiameter ? tool.shankDiameter / 2 : tool.diameter / 2,
          tool.shankDiameter ? tool.shankDiameter / 2 : tool.diameter / 2,
          ballShankHeight,
          32
        );
        const ballShankMaterial = new THREE.MeshStandardMaterial({ 
          color: 0x999999,
          metalness: 0.5,
          roughness: 0.5
        });
        const ballShank = new THREE.Mesh(ballShankGeometry, ballShankMaterial);
        ballShank.position.set(0, 0, -(tool.cuttingLength || 20) - (ballShankHeight / 2));
        
        group.add(ballPart);
        group.add(cylinderPart);
        group.add(ballShank);
        break;
        
      case 'drillbit':
        // Punta da trapano
        const drillShankHeight = tool.totalLength ? tool.totalLength - (tool.cuttingLength || 30) : 40;
        
        // Parte tagliente (conica)
        const drillTipGeometry = new THREE.ConeGeometry(
          tool.diameter / 2,
          tool.diameter,
          32
        );
        const drillTipMaterial = new THREE.MeshStandardMaterial({ 
          color: toolColor,
          metalness: 0.8,
          roughness: 0.2
        });
        const drillTip = new THREE.Mesh(drillTipGeometry, drillTipMaterial);
        drillTip.rotation.x = Math.PI; // Ruota per avere la punta verso il basso
        drillTip.position.set(0, 0, tool.diameter / 2);
        
        // Parte principale
        const drillBodyGeometry = new THREE.CylinderGeometry(
          tool.diameter / 2,
          tool.diameter / 2,
          tool.cuttingLength || 30,
          32
        );
        const drillBodyMaterial = new THREE.MeshStandardMaterial({ 
          color: toolColor,
          metalness: 0.8,
          roughness: 0.2
        });
        const drillBody = new THREE.Mesh(drillBodyGeometry, drillBodyMaterial);
        drillBody.position.set(0, 0, -((tool.cuttingLength || 30) / 2) + (tool.diameter / 2));
        
        // Gambo
        const drillShankGeometry = new THREE.CylinderGeometry(
          tool.shankDiameter ? tool.shankDiameter / 2 : tool.diameter / 2,
          tool.shankDiameter ? tool.shankDiameter / 2 : tool.diameter / 2,
          drillShankHeight,
          32
        );
        const drillShankMaterial = new THREE.MeshStandardMaterial({ 
          color: 0x999999,
          metalness: 0.5,
          roughness: 0.5
        });
        const drillShank = new THREE.Mesh(drillShankGeometry, drillShankMaterial);
        drillShank.position.set(0, 0, -(tool.cuttingLength || 30) - (drillShankHeight / 2) + (tool.diameter / 2));
        
        group.add(drillTip);
        group.add(drillBody);
        group.add(drillShank);
        break;
        
      // Aggiungi altri tipi di utensili qui se necessario
        
      default:
        // Utensile generico per tipi sconosciuti
        const genericGeometry = new THREE.CylinderGeometry(
          tool.diameter / 2,
          tool.diameter / 2,
          tool.totalLength || 50,
          32
        );
        const genericMaterial = new THREE.MeshStandardMaterial({ 
          color: toolColor,
          metalness: 0.7,
          roughness: 0.3
        });
        const genericTool = new THREE.Mesh(genericGeometry, genericMaterial);
        genericTool.position.set(0, 0, -(tool.totalLength || 50) / 2);
        group.add(genericTool);
    }
    
    // Orienta l'utensile correttamente (verso il basso per l'asse Z)
    group.rotation.x = Math.PI / 2;
    
    return group;
  };

  // Effetto per analizzare e visualizzare il G-code
  useEffect(() => {
    if (!gcode || !sceneRef.current) return;

    // Analizza il G-code per estrarre i punti del percorso
    const toolPathPoints: Point[] = [];
    const lines = gcode.split('\n');
    
    let currentX = 0;
    let currentY = 0;
    let currentZ = 0;
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith(';')) return; // Salta commenti e linee vuote
      
      const isG0 = trimmedLine.includes('G0') || trimmedLine.includes('G00');
      const isG1 = trimmedLine.includes('G1') || trimmedLine.includes('G01');
      
      if (isG0 || isG1) {
        // Estrai le coordinate
        const xMatch = trimmedLine.match(/X([+-]?\d*\.?\d+)/);
        const yMatch = trimmedLine.match(/Y([+-]?\d*\.?\d+)/);
        const zMatch = trimmedLine.match(/Z([+-]?\d*\.?\d+)/);
        
        if (xMatch) currentX = parseFloat(xMatch[1]);
        if (yMatch) currentY = parseFloat(yMatch[1]);
        if (zMatch) currentZ = parseFloat(zMatch[1]);
        
        toolPathPoints.push({ x: currentX, y: currentY, z: currentZ });
      }
    });
    
    // Salva i punti per l'animazione
    toolPathPointsRef.current = toolPathPoints;
    
    // Rimuovi il percorso utensile esistente, se presente
    if (toolPathRef.current) {
      sceneRef.current.remove(toolPathRef.current);
      toolPathRef.current = null;
    }
    
    // Crea un nuovo percorso utensile
    if (toolPathPoints.length > 1) {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(toolPathPoints.length * 3);
      
      toolPathPoints.forEach((point, i) => {
        positions[i * 3] = point.x;
        positions[i * 3 + 1] = point.y;
        positions[i * 3 + 2] = point.z;
      });
      
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      
      const material = new THREE.LineBasicMaterial({ 
        color: 0x00ff00,
        linewidth: 2
      });
      
      const line = new THREE.Line(geometry, material);
      sceneRef.current.add(line);
      toolPathRef.current = line;
      
      // Resetta la posizione del tool all'inizio del percorso
      if (toolRef.current && toolPathPoints.length > 0) {
        const startPoint = toolPathPoints[0];
        toolRef.current.position.set(startPoint.x, startPoint.y, startPoint.z);
      }
    }
    
    setCurrentLine(0);
  }, [gcode]);

  // Effetto per gestire l'animazione del percorso utensile
  useEffect(() => {
    if (!isSimulating || !toolRef.current || toolPathPointsRef.current.length <= 1) return;
    
    let lastTimestamp = 0;
    const animateToolPath = (timestamp: number) => {
      if (!lastTimestamp) lastTimestamp = timestamp;
      
      const deltaTime = timestamp - lastTimestamp;
      if (deltaTime > (1000 / (1.5 * simulationSpeedRef.current))) {
        if (currentLine < toolPathPointsRef.current.length - 1) {
          const currentPoint = toolPathPointsRef.current[currentLine];
          const nextPoint = toolPathPointsRef.current[currentLine + 1];
          
          if (toolRef.current) {
            toolRef.current.position.set(currentPoint.x, currentPoint.y, currentPoint.z);
          }
          
          setCurrentLine(prev => prev + 1);
          lastTimestamp = timestamp;
        }
      }
      
      if (currentLine < toolPathPointsRef.current.length - 1 && isSimulating) {
        requestAnimationFrame(animateToolPath);
      }
    };
    
    const animationId = requestAnimationFrame(animateToolPath);
    
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isSimulating, currentLine]);

  // Funzione per tornare all'inizio della pagina
  const scrollToTop = () => {
    if (wrapperRef.current) {
      wrapperRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  // Toggle per la visibilità del workpiece
  const toggleWorkpieceVisibility = () => {
    setIsWorkpieceVisible(!isWorkpieceVisible);
  };

  return (
    <div 
      ref={wrapperRef}
      className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
      style={{ maxHeight: height || '100%' }}
    >
      <div 
        ref={containerRef} 
        style={{ width, height: height || '500px' }}
        className="relative"
      >
        {!gcode && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-80">
            <div className="text-center p-6 bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white rounded-lg shadow-md">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nessun G-Code caricato</h3>
              <p className="text-gray-600">
                Importa un file G-Code o generane uno con il generatore di percorsi per visualizzare qui.
              </p>
            </div>
          </div>
        )}
        
        <div className="absolute top-4 left-4 p-2 bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white bg-opacity-80 rounded-md shadow-sm">
          <p className="text-sm font-medium">Linea: {currentLine + 1} / {toolPathPointsRef.current.length}</p>
          {toolPathPointsRef.current.length > 0 && currentLine < toolPathPointsRef.current.length && (
            <p className="text-xs text-gray-600">
              X: {toolPathPointsRef.current[currentLine].x.toFixed(2)}, 
              Y: {toolPathPointsRef.current[currentLine].y.toFixed(2)}, 
              Z: {toolPathPointsRef.current[currentLine].z.toFixed(2)}
            </p>
          )}
        </div>
        
        <div className="absolute top-4 right-4 space-y-2">
          {/* Pulsante per mostrare/nascondere il workpiece */}
          {workpiece && (
            <button 
              className="p-2 bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white rounded-md shadow-sm hover:bg-gray-100 block"
              onClick={toggleWorkpieceVisibility}
              title={isWorkpieceVisible ? "Nascondi pezzo" : "Mostra pezzo"}
            >
              {isWorkpieceVisible ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}

          {/* Pulsante per ripristinare la camera */}
          <button 
            className="p-2 bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white rounded-md shadow-sm hover:bg-gray-100 block"
            onClick={() => {
              if (cameraRef.current) {
                cameraRef.current.position.set(0, 5, 10);
                cameraRef.current.lookAt(0, 0, 0);
              }
            }}
            title="Reset Camera"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </button>
          
          {/* Pulsanti per aumentare/diminuire la velocità di simulazione */}
          <button 
            className="p-2 bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white rounded-md shadow-sm hover:bg-gray-100 block"
            onClick={() => {
              simulationSpeedRef.current = Math.min(10, simulationSpeedRef.current + 0.5);
            }}
            title="Aumenta Velocità"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
          
          <button 
            className="p-2 bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white rounded-md shadow-sm hover:bg-gray-100 block"
            onClick={() => {
              simulationSpeedRef.current = Math.max(0.5, simulationSpeedRef.current - 0.5);
            }}
            title="Diminuisci Velocità"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>

      {/* Pannello di informazioni contestuali che appare sotto il visualizzatore */}
      {toolPathPointsRef.current.length > 0 && (
        <div className="bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white shadow-md rounded-md p-4 mt-4 mx-2 mb-2">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Informazioni sul Percorso</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded-md">
              <p className="text-sm font-medium text-gray-700">Totale Punti</p>
              <p className="text-xl font-bold text-blue-600">{toolPathPointsRef.current.length}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-md">
              <p className="text-sm font-medium text-gray-700">Punto Corrente</p>
              <p className="text-xl font-bold text-blue-600">{currentLine + 1}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-md col-span-2">
              <p className="text-sm font-medium text-gray-700">Posizione Attuale</p>
              {currentLine < toolPathPointsRef.current.length && (
                <p className="text-md font-medium text-green-600">
                  X: {toolPathPointsRef.current[currentLine].x.toFixed(3)}, 
                  Y: {toolPathPointsRef.current[currentLine].y.toFixed(3)}, 
                  Z: {toolPathPointsRef.current[currentLine].z.toFixed(3)}
                </p>
              )}
            </div>
          </div>
          
          {/* Informazioni sul workpiece se visibile */}
          {isWorkpieceVisible && workpiece && (
            <div className="mt-4 p-3 bg-blue-50 rounded-md">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Informazioni Pezzo</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-xs text-blue-700">
                  <p>Materiale: {workpiece.material || 'Non specificato'}</p>
                  <p>Dimensioni: {workpiece.width}mm x {workpiece.height}mm x {workpiece.depth}mm</p>
                </div>
                <div className="text-xs text-blue-700">
                  <p>Unità: {workpiece.units || 'mm'}</p>
                  
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Aiuti per la Navigazione</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Ruota la vista cliccando e trascinando</li>
              <li>• Zoom con la rotella del mouse</li>
              <li>• Pan tenendo premuto Shift e trascinando</li>
              <li>• Ripristina la vista con il pulsante Home</li>
              {workpiece && (
                <li>• Usa il pulsante {isWorkpieceVisible ? "👁️" : "👁️‍🗨️"} per mostrare/nascondere il pezzo</li>
              )}
            </ul>
          </div>
        </div>
      )}
      
      {/* Pulsante Torna Su */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 p-3 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 focus:outline-none transition-all duration-300 z-10"
          aria-label="Torna all'inizio"
        >
          <ChevronUp size={20} />
        </button>
      )}
    </div>
  );
};

export default ToolpathVisualizer;