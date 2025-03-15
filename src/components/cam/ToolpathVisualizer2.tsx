import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { useCADStore } from 'src/store/cadStore';
import { predefinedTools } from '@/src/lib/predefinedLibraries';
import { useLOD } from 'src/hooks/canvas/useLod';
import { useThreePerformance } from 'src/hooks/canvas/useThreePerformance';
import {
  Eye, EyeOff, Grid, Home, Download, Maximize2, Play, Pause, 
  SkipBack, ChevronLeft, ChevronRight, FastForward, 
  Tool, Box, Layers, Globe, Sun, Square, Menu, Info, Settings, X
} from 'react-feather';

interface ToolpathVisualizerProps {
  width: string;
  height: string;
  gcode: string;
  isSimulating: boolean;
  selectedTool?: string | null;
  showWorkpiece?: boolean;
  onSimulationComplete: () => void;
  onSimulationProgress: (progress: number) => void;
}

interface ToolpathPoint {
  x: number;
  y: number;
  z: number;
  feedrate?: number;
  type?: string;
  isRapid?: boolean;
}

interface Statistics {
  triangleCount: number;
  objectCount: number;
  fps: number;
  memory: number;
  timeRemaining: string;
}

interface ViewCubeProps {
  currentView: string;
  onViewChange: (view: string) => void;
  size?: number;
}

// Simple ViewCube component for 3D orientation
const ViewCube: React.FC<ViewCubeProps> = ({ currentView, onViewChange, size = 70 }) => {
  const cubeRef = useRef<HTMLDivElement>(null);
  
  const views = [
    { id: 'perspective', label: '3D' },
    { id: 'top', label: 'Top' },
    { id: 'front', label: 'Front' },
    { id: 'right', label: 'Right' },
    { id: 'isometric', label: 'ISO' }
  ];
  
  const [hoveredFace, setHoveredFace] = useState<string | null>(null);
  
  return (
    <div 
      ref={cubeRef}
      className="relative cursor-pointer bg-gray-800 bg-opacity-50 rounded-md overflow-hidden"
      style={{ width: size, height: size }}
    >
      <div className="absolute inset-0 flex flex-col">
        {/* Top face */}
        <div 
          className={`h-1/3 flex justify-center items-center border border-gray-700 ${
            currentView === 'top' ? 'bg-blue-500' : hoveredFace === 'top' ? 'bg-gray-600' : ''
          }`}
          onMouseEnter={() => setHoveredFace('top')}
          onMouseLeave={() => setHoveredFace(null)}
          onClick={() => onViewChange('top')}
        >
          <span className="text-xs text-white font-bold">Top</span>
        </div>
        
        {/* Middle section with Front/Right/Back/Left */}
        <div className="h-1/3 flex">
          <div 
            className={`w-1/4 flex justify-center items-center border border-gray-700 ${
              currentView === 'left' ? 'bg-blue-500' : hoveredFace === 'left' ? 'bg-gray-600' : ''
            }`}
            onMouseEnter={() => setHoveredFace('left')}
            onMouseLeave={() => setHoveredFace(null)}
            onClick={() => onViewChange('left')}
          >
            <span className="text-xs text-white font-bold">L</span>
          </div>
          
          <div 
            className={`w-1/4 flex justify-center items-center border border-gray-700 ${
              currentView === 'front' ? 'bg-blue-500' : hoveredFace === 'front' ? 'bg-gray-600' : ''
            }`}
            onMouseEnter={() => setHoveredFace('front')}
            onMouseLeave={() => setHoveredFace(null)}
            onClick={() => onViewChange('front')}
          >
            <span className="text-xs text-white font-bold">F</span>
          </div>
          
          <div 
            className={`w-1/4 flex justify-center items-center border border-gray-700 ${
              currentView === 'right' ? 'bg-blue-500' : hoveredFace === 'right' ? 'bg-gray-600' : ''
            }`}
            onMouseEnter={() => setHoveredFace('right')}
            onMouseLeave={() => setHoveredFace(null)}
            onClick={() => onViewChange('right')}
          >
            <span className="text-xs text-white font-bold">R</span>
          </div>
          
          <div 
            className={`w-1/4 flex justify-center items-center border border-gray-700 ${
              currentView === 'back' ? 'bg-blue-500' : hoveredFace === 'back' ? 'bg-gray-600' : ''
            }`}
            onMouseEnter={() => setHoveredFace('back')}
            onMouseLeave={() => setHoveredFace(null)}
            onClick={() => onViewChange('back')}
          >
            <span className="text-xs text-white font-bold">B</span>
          </div>
        </div>
        
        {/* Bottom face */}
        <div 
          className={`h-1/3 flex justify-center items-center border border-gray-700 ${
            currentView === 'bottom' ? 'bg-blue-500' : hoveredFace === 'bottom' ? 'bg-gray-600' : ''
          }`}
          onMouseEnter={() => setHoveredFace('bottom')}
          onMouseLeave={() => setHoveredFace(null)}
          onClick={() => onViewChange('bottom')}
        >
          <span className="text-xs text-white font-bold">Bottom</span>
        </div>
      </div>
      
      {/* Center 3D button */}
      <div 
        className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                    w-1/2 h-1/2 flex justify-center items-center rounded-full
                    ${currentView === 'perspective' || currentView === 'isometric' 
                      ? 'bg-blue-500' 
                      : 'bg-gray-700 bg-opacity-80'}`}
        onClick={() => onViewChange('isometric')}
      >
        <span className="text-xs text-white font-bold">ISO</span>
      </div>
    </div>
  );
};

const ToolpathVisualizer: React.FC<ToolpathVisualizerProps> = ({
  width,
  height,
  gcode,
  isSimulating,
  selectedTool = null,
  showWorkpiece = true,
  onSimulationComplete,
  onSimulationProgress
}) => {
  // Refs for Three.js elements
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const topCameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const frontCameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const rightCameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const toolRef = useRef<THREE.Object3D | null>(null);
  const toolpathRef = useRef<THREE.Line | null>(null);
  const workpieceRef = useRef<THREE.Mesh | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const toolpathPointsRef = useRef<ToolpathPoint[]>([]);
  
  // State for UI and visualization
  const [currentView, setCurrentView] = useState<string>('isometric');
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<'realistic' | 'shaded' | 'wireframe' | 'xray'>('shaded');
  const [showAxes, setShowAxes] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showTool, setShowTool] = useState(true);
  const [showToolpath, setShowToolpath] = useState(true);
  const [isWorkpieceVisible, setIsWorkpieceVisible] = useState(showWorkpiece);
  const [showStats, setShowStats] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<'info' | 'settings' | 'tools'>('info');
  const [highlightMode, setHighlightMode] = useState<'none' | 'rapid' | 'cut' | 'depth'>('none');
  const [statistics, setStatistics] = useState<Statistics>({
    triangleCount: 0,
    objectCount: 0,
    fps: 0,
    memory: 0,
    timeRemaining: '00:00'
  });
  
  // Get workpiece data from CAD store
  const { workpiece, viewMode: cadViewMode, gridVisible, axisVisible } = useCADStore();
  
  // Use optimization hooks
  const sceneRefForHooks = sceneRef as React.RefObject<THREE.Scene>;
  const cameraRefForHooks = cameraRef as React.RefObject<THREE.Camera>;
  
  const { optimizeScene } = useThreePerformance(sceneRefForHooks);
  const { applyLOD, temporarilyRestoreFullDetail } = useLOD(
    sceneRefForHooks,
    cameraRefForHooks,
    {
      enabled: true,
      highDetailThreshold: 50,
      
    }
  );

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;
    
    console.log("Initializing Three.js scene");
    
    // Create renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      logarithmicDepthBuffer: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setClearColor(0x2A2A2A);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    // Enable shadows if using realistic mode
    if (viewMode === 'realistic') {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    
    if (viewMode === 'realistic') {
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
    }
    
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2A2A2A);
    sceneRef.current = scene;
    
    // Create cameras
    const aspectRatio = containerRef.current.clientWidth / containerRef.current.clientHeight;
    
    // Main perspective camera
    const camera = new THREE.PerspectiveCamera(
      45, // FOV
      aspectRatio,
      0.1,
      2000
    );
    camera.position.set(200, 200, 200);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;
    
    // Orthographic cameras for standard views
    const viewSize = 200;
    
    // Top view (looking down Y axis)
    const topCamera = new THREE.OrthographicCamera(
      -viewSize * aspectRatio, viewSize * aspectRatio,
      viewSize, -viewSize,
      0.1, 2000
    );
    topCamera.position.set(0, 400, 0);
    topCamera.lookAt(0, 0, 0);
    topCamera.up.set(0, 0, 1);
    topCameraRef.current = topCamera;
    
    // Front view (looking along Z axis)
    const frontCamera = new THREE.OrthographicCamera(
      -viewSize * aspectRatio, viewSize * aspectRatio,
      viewSize, -viewSize,
      0.1, 2000
    );
    frontCamera.position.set(0, 0, 400);
    frontCamera.lookAt(0, 0, 0);
    frontCameraRef.current = frontCamera;
    
    // Right view (looking along X axis)
    const rightCamera = new THREE.OrthographicCamera(
      -viewSize * aspectRatio, viewSize * aspectRatio,
      viewSize, -viewSize,
      0.1, 2000
    );
    rightCamera.position.set(400, 0, 0);
    rightCamera.lookAt(0, 0, 0);
    rightCamera.up.set(0, 1, 0);
    rightCameraRef.current = rightCamera;
    
    // Create controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = true;
    controlsRef.current = controls;
    
    // Add grid
    const gridHelper = new THREE.GridHelper(500, 50);
    gridHelper.rotation.x = Math.PI / 2; // XY plane
    gridHelper.visible = gridVisible;
    scene.add(gridHelper);
    
    // Add axes
    const axesHelper = new THREE.AxesHelper(50);
    axesHelper.visible = axisVisible;
    scene.add(axesHelper);
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 200, 100);
    directionalLight.castShadow = viewMode === 'realistic';
    scene.add(directionalLight);
    
    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      
      // Update tool position during simulation
      if (isPlaying && toolpathPointsRef.current.length > 0 && toolRef.current) {
        updateToolPosition();
      }
      
      // Render with active camera
      let activeCamera: THREE.Camera | null = cameraRef.current;
      
      switch (currentView) {
        case 'top':
          activeCamera = topCameraRef.current;
          break;
        case 'front':
          activeCamera = frontCameraRef.current;
          break;
        case 'right':
          activeCamera = rightCameraRef.current;
          break;
        default:
          activeCamera = cameraRef.current;
      }
      
      if (rendererRef.current && activeCamera && sceneRef.current) {
        rendererRef.current.render(sceneRef.current, activeCamera);
      }
      
      // Update statistics
      updateStatistics();
    };
    
    animate();
    
    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      const aspect = width / height;
      
      // Update perspective camera
      cameraRef.current.aspect = aspect;
      cameraRef.current.updateProjectionMatrix();
      
      // Update orthographic cameras
      if (topCameraRef.current) {
        topCameraRef.current.left = -viewSize * aspect;
        topCameraRef.current.right = viewSize * aspect;
        topCameraRef.current.updateProjectionMatrix();
      }
      
      if (frontCameraRef.current) {
        frontCameraRef.current.left = -viewSize * aspect;
        frontCameraRef.current.right = viewSize * aspect;
        frontCameraRef.current.updateProjectionMatrix();
      }
      
      if (rightCameraRef.current) {
        rightCameraRef.current.left = -viewSize * aspect;
        rightCameraRef.current.right = viewSize * aspect;
        rightCameraRef.current.updateProjectionMatrix();
      }
      
      rendererRef.current.setSize(width, height);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Apply optimizations
    optimizeScene();
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, [optimizeScene, gridVisible, axisVisible, viewMode]);
  
  // Update tool position during animation
  const updateToolPosition = useCallback(() => {
    if (!toolRef.current || toolpathPointsRef.current.length === 0) return;
    
    // Get current point
    const currentPoint = toolpathPointsRef.current[currentPointIndex];
    
    // Update tool position
    if (currentPoint) {
      console.log(`Updating tool position to: (${currentPoint.x}, ${currentPoint.y}, ${currentPoint.z})`);
      toolRef.current.position.set(currentPoint.x, currentPoint.y, currentPoint.z);
      
      // Make sure tool is visible
      if (!toolRef.current.visible && showTool) {
        toolRef.current.visible = true;
      }
    }
    
    // Move to next point based on playback speed
    const newIndex = currentPointIndex + playbackSpeed;
    
    // Check if we've reached the end of the toolpath
    if (newIndex >= toolpathPointsRef.current.length) {
      setIsPlaying(false);
    } else {
      setCurrentPointIndex(Math.min(newIndex, toolpathPointsRef.current.length - 1));
    }
  }, [currentPointIndex, playbackSpeed, showTool]);

  // Update statistics
  const updateStatistics = useCallback(() => {
    if (!sceneRef.current || !rendererRef.current) return;
    
    let triangleCount = 0;
    let objectCount = 0;
    
    // Count triangles and objects
    sceneRef.current.traverse((object) => {
      objectCount++;
      
      if (object instanceof THREE.Mesh) {
        const geometry = object.geometry;
        if (geometry.index) {
          triangleCount += geometry.index.count / 3;
        } else if (geometry.attributes.position) {
          triangleCount += geometry.attributes.position.count / 3;
        }
      }
    });
    
    // Calculate time remaining
    let timeRemaining = '00:00';
    if (isPlaying && toolpathPointsRef.current.length > 0) {
      const remainingPoints = toolpathPointsRef.current.length - currentPointIndex;
      const secondsRemaining = Math.floor(remainingPoints / playbackSpeed / 60);
      const minutes = Math.floor(secondsRemaining / 60);
      const seconds = secondsRemaining % 60;
      timeRemaining = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // Get renderer info
    const memory = Math.round(
      window.performance && window.performance.memory
        ? window.performance.memory.usedJSHeapSize / 1048576
        : 0
    );
    
    setStatistics({
      triangleCount: Math.floor(triangleCount),
      objectCount,
      fps: Math.round(rendererRef.current.info.render.frame || 0),
      memory,
      timeRemaining
    });
  }, [isPlaying, currentPointIndex, playbackSpeed]);

  // Create tool mesh based on selected tool
  const createToolMesh = useCallback((toolName: string): THREE.Object3D | null => {
    // Find tool in predefined tools
    const toolData = predefinedTools.find(tool => tool.name === toolName);
    if (!toolData) {
      console.warn("Tool not found in predefined tools:", toolName);
      return null;
    }
    
    console.log("Creating tool mesh for:", toolData);
    
    // Create tool based on type
    const toolGroup = new THREE.Group();
    toolGroup.name = `Tool-${toolName}`;
    
    const { diameter = 6, type = 'endmill' } = toolData;
    
    switch (type) {
      case 'endmill': {
        // Create shank - make it more visible by scaling up a bit
        const shankHeight = diameter * 6; // Increased length for visibility
        const shankGeometry = new THREE.CylinderGeometry(
          diameter * 0.6,
          diameter * 0.6,
          shankHeight,
          16
        );
        const shankMaterial = new THREE.MeshStandardMaterial({
          color: 0x999999,
          metalness: 0.7,
          roughness: 0.2,
          // Make sure it's not transparent
          transparent: false
        });
        const shank = new THREE.Mesh(shankGeometry, shankMaterial);
        shank.position.y = shankHeight / 2;
        
        // Create cutting part - with bright color for visibility
        const cuttingHeight = diameter * 3;
        const cuttingGeometry = new THREE.CylinderGeometry(
          diameter / 2,
          diameter / 2,
          cuttingHeight,
          24
        );
        const cuttingMaterial = new THREE.MeshStandardMaterial({
          color: 0x3399FF, // Bright blue for better visibility
          metalness: 0.8,
          roughness: 0.1,
          emissive: 0x0066cc, // Add some glow
          emissiveIntensity: 0.5,
          // Make sure it's not transparent
          transparent: false
        });
        const cutting = new THREE.Mesh(cuttingGeometry, cuttingMaterial);
        cutting.position.y = -cuttingHeight / 2;
        
        // Add flutes
        const flutes = toolData.numberOfFlutes || 2;
        for (let i = 0; i < flutes; i++) {
          const angle = (i / flutes) * Math.PI * 2;
          const fluteGeometry = new THREE.BoxGeometry(
            diameter * 0.05,
            cuttingHeight,
            diameter * 0.4
          );
          const fluteMaterial = new THREE.MeshStandardMaterial({
            color: 0x222222,
            metalness: 0.7,
            roughness: 0.3
          });
          const flute = new THREE.Mesh(fluteGeometry, fluteMaterial);
          flute.position.y = -cuttingHeight / 2;
          flute.rotation.y = angle;
          cutting.add(flute);
        }
        
        toolGroup.add(shank);
        toolGroup.add(cutting);
        break;
      }
      
      case 'ballendmill': {
        // Create shank
        const shankHeight = diameter * 4;
        const shankGeometry = new THREE.CylinderGeometry(
          diameter * 0.6,
          diameter * 0.6,
          shankHeight,
          16
        );
        const shankMaterial = new THREE.MeshStandardMaterial({
          color: 0x999999,
          metalness: 0.7,
          roughness: 0.2
        });
        const shank = new THREE.Mesh(shankGeometry, shankMaterial);
        shank.position.y = shankHeight / 2;
        
        // Create stem
        const stemHeight = diameter * 2;
        const stemGeometry = new THREE.CylinderGeometry(
          diameter / 2,
          diameter / 2,
          stemHeight,
          24
        );
        const stemMaterial = new THREE.MeshStandardMaterial({
          color: 0xCCCCCC,
          metalness: 0.8,
          roughness: 0.1
        });
        const stem = new THREE.Mesh(stemGeometry, stemMaterial);
        stem.position.y = -stemHeight / 2;
        
        // Create ball end
        const ballGeometry = new THREE.SphereGeometry(
          diameter / 2,
          24,
          24,
          0,
          Math.PI * 2,
          0,
          Math.PI / 2
        );
        const ballMaterial = new THREE.MeshStandardMaterial({
          color: 0xCCCCCC,
          metalness: 0.8,
          roughness: 0.1
        });
        const ball = new THREE.Mesh(ballGeometry, ballMaterial);
        ball.position.y = -stemHeight - (diameter / 4);
        ball.rotation.x = Math.PI;
        
        toolGroup.add(shank);
        toolGroup.add(stem);
        toolGroup.add(ball);
        break;
      }
      
      default: {
        // Generic tool for unsupported types
        const toolHeight = diameter * 7;
        const toolGeometry = new THREE.CylinderGeometry(
          diameter / 2,
          diameter / 2,
          toolHeight,
          16
        );
        const toolMaterial = new THREE.MeshStandardMaterial({
          color: 0xCCCCCC,
          metalness: 0.5,
          roughness: 0.5
        });
        const toolMesh = new THREE.Mesh(toolGeometry, toolMaterial);
        toolMesh.position.y = -toolHeight / 2;
        
        toolGroup.add(toolMesh);
      }
    }
    
    // Orient tool to point downward (Z axis) and scale up for visibility
    toolGroup.rotation.x = Math.PI / 2;
    
    // Add a helper arrow to make the tool more visible
    const arrowHelper = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, -1),  // Direction pointing down
      new THREE.Vector3(0, 0, 0),   // Origin at tool center
      diameter * 2,                 // Length
      0xFF0000,                     // Color
      diameter * 0.5,               // Head length
      diameter * 0.3                // Head width
    );
    toolGroup.add(arrowHelper);
    
    // Make tool more visible by scaling up slightly
    toolGroup.scale.set(1.5, 1.5, 1.5);
    
    // Set additional properties for debugging
    toolGroup.userData.isToolMesh = true;
    toolGroup.userData.toolName = toolName;
    
    console.log("Tool created successfully:", toolGroup);
    
    return toolGroup;
  }, []);

  // Parse G-code into toolpath points
  const parseGCode = useCallback((gcode: string): ToolpathPoint[] => {
    const points: ToolpathPoint[] = [];
    const lines = gcode.split('\n');
    
    let currentX = 0;
    let currentY = 0;
    let currentZ = 0;
    let currentF = 0;
    
    lines.forEach(line => {
      // Skip comments and empty lines
      if (!line.trim() || line.trim().startsWith(';')) return;
      
      // Extract command type
      const isG0 = line.includes('G0') || line.includes('G00');
      const isG1 = line.includes('G1') || line.includes('G01');
      
      // Extract coordinates
      if (isG0 || isG1) {
        // Extract X, Y, Z coordinates
        const xMatch = line.match(/X([+-]?\d*\.?\d+)/);
        const yMatch = line.match(/Y([+-]?\d*\.?\d+)/);
        const zMatch = line.match(/Z([+-]?\d*\.?\d+)/);
        const fMatch = line.match(/F([+-]?\d*\.?\d+)/);
        
        // Update current position
        if (xMatch) currentX = parseFloat(xMatch[1]);
        if (yMatch) currentY = parseFloat(yMatch[1]);
        if (zMatch) currentZ = parseFloat(zMatch[1]);
        if (fMatch) currentF = parseFloat(fMatch[1]);
        
        // Add point to toolpath
        points.push({
          x: currentX,
          y: currentY,
          z: currentZ,
          feedrate: currentF,
          type: isG0 ? 'G0' : 'G1',
          isRapid: isG0
        });
      }
    });
    
    return points;
  }, []);

  // Update toolpath when gcode changes
  useEffect(() => {
    if (!gcode || !sceneRef.current) return;
    
    // Parse G-code
    const points = parseGCode(gcode);
    toolpathPointsRef.current = points;
    
    // Remove existing toolpath
    if (toolpathRef.current) {
      sceneRef.current.remove(toolpathRef.current);
      toolpathRef.current = null;
    }
    
    // Create toolpath visualization
    if (points.length > 1) {
      const positions: number[] = [];
      const colors: number[] = [];
      
      points.forEach(point => {
        positions.push(point.x, point.y, point.z);
        
        // Color based on move type
        if (point.isRapid) {
          colors.push(1, 0, 0); // Red for rapid moves
        } else {
          colors.push(0, 1, 0); // Green for cutting moves
        }
      });
      
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      
      const material = new THREE.LineBasicMaterial({
        vertexColors: true,
        linewidth: 2
      });
      
      const line = new THREE.Line(geometry, material);
      sceneRef.current.add(line);
      toolpathRef.current = line;
    }
    
    // Reset current position
    setCurrentPointIndex(0);
    
    // Set tool at initial position
    if (toolRef.current && points.length > 0) {
      const firstPoint = points[0];
      toolRef.current.position.set(firstPoint.x, firstPoint.y, firstPoint.z);
    }
  }, [gcode, parseGCode]);

  // Create/update tool when selected tool changes
  useEffect(() => {
    if (!sceneRef.current) return;
    
    // Remove existing tool
    if (toolRef.current) {
      sceneRef.current.remove(toolRef.current);
      toolRef.current = null;
    }
    
    // Create new tool if tool is selected
    if (selectedTool) {
      console.log("Creating tool for:", selectedTool);
      const newTool = createToolMesh(selectedTool);
      if (newTool) {
        // Make sure the tool is visible
        newTool.visible = showTool;
        
        // Set initial tool position
        if (toolpathPointsRef.current.length > 0) {
          const firstPoint = toolpathPointsRef.current[0];
          newTool.position.set(firstPoint.x, firstPoint.y, firstPoint.z);
        } else {
          // Default position at origin
          newTool.position.set(0, 0, 0);
        }
        
        // Add tool to scene
        sceneRef.current.add(newTool);
        toolRef.current = newTool;
        
        console.log("Tool created and added to scene:", newTool);
      } else {
        console.warn("Failed to create tool mesh for:", selectedTool);
      }
    } else {
      // Create a default tool if none is selected
      const defaultTool = new THREE.Mesh(
        new THREE.CylinderGeometry(3, 3, 20, 16),
        new THREE.MeshStandardMaterial({ color: 0xCCCCCC })
      );
      defaultTool.rotation.x = Math.PI / 2;
      
      if (toolpathPointsRef.current.length > 0) {
        const firstPoint = toolpathPointsRef.current[0];
        defaultTool.position.set(firstPoint.x, firstPoint.y, firstPoint.z);
      } else {
        defaultTool.position.set(0, 0, 0);
      }
      
      defaultTool.visible = showTool;
      sceneRef.current.add(defaultTool);
      toolRef.current = defaultTool;
    }
  }, [selectedTool, createToolMesh, showTool]);
  
  // Create/update workpiece when workpiece visibility changes
  useEffect(() => {
    if (!sceneRef.current || !workpiece) return;
    
    // Remove existing workpiece
    if (workpieceRef.current) {
      sceneRef.current.remove(workpieceRef.current);
      workpieceRef.current = null;
    }
    
    // Create workpiece if visible
    if (isWorkpieceVisible) {
      // Determine material color based on workpiece material type
      let materialColor = 0xAAAAAA; // Default color
      
      switch (workpiece.material) {
        case 'aluminum':
          materialColor = 0xD4D4D4;
          break;
        case 'steel':
          materialColor = 0x888888;
          break;
        case 'wood':
          materialColor = 0xA0522D;
          break;
        case 'plastic':
          materialColor = 0x1E90FF;
          break;
        case 'brass':
          materialColor = 0xDAA520;
          break;
      }
      
      // Create workpiece geometry
      const geometry = new THREE.BoxGeometry(
        workpiece.width || 100,
        workpiece.height || 100,
        workpiece.depth || 20
      );
      
      // Create material
      const material = new THREE.MeshStandardMaterial({
        color: materialColor,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
      });
      
      // Create mesh
      const mesh = new THREE.Mesh(geometry, material);
      
      // Add wireframe outline
      const edges = new THREE.EdgesGeometry(geometry);
      const lineMaterial = new THREE.LineBasicMaterial({ 
        color: 0x000000,
        transparent: true,
        opacity: 0.4
      });
      const wireframe = new THREE.LineSegments(edges, lineMaterial);
      mesh.add(wireframe);
      
      // Position the workpiece
      const { originOffset } = useCADStore.getState();
      mesh.position.set(
        originOffset.x,
        originOffset.y,
        originOffset.z
      );
      
      // Add to scene
      sceneRef.current.add(mesh);
      workpieceRef.current = mesh;
    }
  }, [isWorkpieceVisible, workpiece]);
  
  // Effect to start/stop simulation based on isSimulating prop
  useEffect(() => {
    if (isSimulating && !isPlaying) {
      setIsPlaying(true);
    } else if (!isSimulating && isPlaying) {
      setIsPlaying(false);
    }
  }, [isSimulating, isPlaying]);
  
  // Play/pause simulation
  const playToolpath = useCallback(() => {
    setIsPlaying(true);
  }, []);
  
  const pauseToolpath = useCallback(() => {
    setIsPlaying(false);
  }, []);
  
  const stopToolpath = useCallback(() => {
    setIsPlaying(false);
    setCurrentPointIndex(0);
    
    // Reset tool position
    if (toolRef.current && toolpathPointsRef.current.length > 0) {
      const firstPoint = toolpathPointsRef.current[0];
      toolRef.current.position.set(firstPoint.x, firstPoint.y, firstPoint.z);
    }
  }, []);
  
  const stepForward = useCallback(() => {
    if (toolpathPointsRef.current.length === 0) return;
    
    const newIndex = Math.min(currentPointIndex + 1, toolpathPointsRef.current.length - 1);
    setCurrentPointIndex(newIndex);
    
    // Update tool position
    if (toolRef.current) {
      const point = toolpathPointsRef.current[newIndex];
      toolRef.current.position.set(point.x, point.y, point.z);
    }
  }, [currentPointIndex]);
  
  const stepBackward = useCallback(() => {
    if (toolpathPointsRef.current.length === 0) return;
    
    const newIndex = Math.max(currentPointIndex - 1, 0);
    setCurrentPointIndex(newIndex);
    
    // Update tool position
    if (toolRef.current) {
      const point = toolpathPointsRef.current[newIndex];
      toolRef.current.position.set(point.x, point.y, point.z);
    }
  }, [currentPointIndex]);
  
  // Calculate progress percentage
  const getProgress = useCallback(() => {
    if (toolpathPointsRef.current.length === 0) return 0;
    
    return (currentPointIndex / (toolpathPointsRef.current.length - 1)) * 100;
  }, [currentPointIndex]);
  
  // Jump to specific progress percentage
  const jumpToProgress = useCallback((percent: number) => {
    if (toolpathPointsRef.current.length === 0) return;
    
    const newIndex = Math.floor((percent / 100) * (toolpathPointsRef.current.length - 1));
    setCurrentPointIndex(newIndex);
    
    // Update tool position
    if (toolRef.current) {
      const point = toolpathPointsRef.current[newIndex];
      toolRef.current.position.set(point.x, point.y, point.z);
    }
  }, []);
  
  // Get current point info
  const getCurrentPointInfo = useCallback(() => {
    if (toolpathPointsRef.current.length === 0 || currentPointIndex >= toolpathPointsRef.current.length) {
      return { x: 0, y: 0, z: 0, feedrate: 0, type: '' };
    }
    
    return toolpathPointsRef.current[currentPointIndex];
  }, [currentPointIndex]);
  
  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if ((containerRef.current as any)?.webkitRequestFullscreen) {
        (containerRef.current as any).webkitRequestFullscreen();
      } else if ((containerRef.current as any)?.msRequestFullscreen) {
        (containerRef.current as any).msRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
      setIsFullscreen(false);
    }
  }, [isFullscreen]);
  
  // Reset view
  const resetView = useCallback(() => {
    if (!cameraRef.current || !controlsRef.current) return;
    
    // Position camera
    cameraRef.current.position.set(200, 200, 200);
    cameraRef.current.lookAt(0, 0, 0);
    
    // Reset controls
    controlsRef.current.reset();
  }, []);
  
  // Take screenshot
  const takeScreenshot = useCallback(() => {
    if (!rendererRef.current) return;
    
    // Temporarily restore full detail for better quality
    const restore = temporarilyRestoreFullDetail && temporarilyRestoreFullDetail();
    
    // Render the scene at high quality
    if (rendererRef.current && cameraRef.current && sceneRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
    
    // Get image data
    const dataUrl = rendererRef.current.domElement.toDataURL('image/png');
    
    // Create download link
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `toolpath-screenshot-${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Restore normal detail
    if (restore) restore();
  }, [temporarilyRestoreFullDetail]);
  
  // Toggle panel
  const togglePanel = (panel: 'info' | 'settings' | 'tools') => {
    if (activePanel === panel && isPanelOpen) {
      setIsPanelOpen(false);
    } else {
      setActivePanel(panel);
      setIsPanelOpen(true);
    }
  };
  
  // Get current point
  const currentPoint = getCurrentPointInfo();
  
  return (
    <div 
      className="relative w-full h-full bg-gray-900 overflow-hidden"
      style={{ width, height }}
    >
      {/* Main container */}
      <div 
        ref={containerRef}
        className="absolute top-0 left-0 w-full h-full"
        tabIndex={0} // Make div focusable for keyboard events
      />
      
      {/* View Cube */}
      <div className="absolute bottom-4 right-4 z-10">
        <ViewCube 
          currentView={currentView}
          onViewChange={setCurrentView}
        />
      </div>
      
      {/* Top Toolbar */}
      {showControls && (
        <div className="absolute top-0 left-0 right-0 bg-gray-800 bg-opacity-75 text-white p-2 flex justify-between items-center z-10">
          <div className="flex items-center space-x-2">
            {/* Menu button to toggle controls */}
            <button 
              className="p-1.5 rounded-md hover:bg-gray-700 focus:outline-none"
              onClick={() => setShowControls(false)}
              title="Hide Controls"
            >
              <Menu size={18} />
            </button>
            
            <div className="h-5 border-l border-gray-600 mx-1" />
            
            {/* View buttons */}
            <button 
              className={`p-1.5 rounded-md focus:outline-none ${
                currentView === 'perspective' ? 'bg-blue-600' : 'hover:bg-gray-700'
              }`}
              onClick={() => setCurrentView('perspective')}
              title="Perspective View"
            >
              <Globe size={18} />
            </button>
            
            <button 
              className={`p-1.5 rounded-md focus:outline-none ${
                currentView === 'top' ? 'bg-blue-600' : 'hover:bg-gray-700'
              }`}
              onClick={() => setCurrentView('top')}
              title="Top View"
            >
              T
            </button>
            
            <button 
              className={`p-1.5 rounded-md focus:outline-none ${
                currentView === 'front' ? 'bg-blue-600' : 'hover:bg-gray-700'
              }`}
              onClick={() => setCurrentView('front')}
              title="Front View"
            >
              F
            </button>
            
            <button 
              className={`p-1.5 rounded-md focus:outline-none ${
                currentView === 'right' ? 'bg-blue-600' : 'hover:bg-gray-700'
              }`}
              onClick={() => setCurrentView('right')}
              title="Right View"
            >
              R
            </button>
            
            <button 
              className={`p-1.5 rounded-md focus:outline-none ${
                currentView === 'isometric' ? 'bg-blue-600' : 'hover:bg-gray-700'
              }`}
              onClick={() => setCurrentView('isometric')}
              title="Isometric View"
            >
              ISO
            </button>
            
            <div className="h-5 border-l border-gray-600 mx-1" />
            
            {/* Display options */}
            <button 
              className={`p-1.5 rounded-md focus:outline-none ${
                showGrid ? 'text-blue-400' : 'text-gray-400'
              } hover:bg-gray-700`}
              onClick={() => setShowGrid(!showGrid)}
              title={showGrid ? "Hide Grid" : "Show Grid"}
            >
              <Grid size={18} />
            </button>
            
            <button 
              className={`p-1.5 rounded-md focus:outline-none ${
                showAxes ? 'text-blue-400' : 'text-gray-400'
              } hover:bg-gray-700`}
              onClick={() => setShowAxes(!showAxes)}
              title={showAxes ? "Hide Axes" : "Show Axes"}
            >
              <span className="font-mono text-sm">XYZ</span>
            </button>
          </div>
          
          {/* View mode selection */}
          <div className="flex items-center space-x-2">
            <div className="relative group">
              <button 
                className={`p-1.5 rounded-md focus:outline-none hover:bg-gray-700`}
                title="View Mode"
              >
                {viewMode === 'realistic' && <Sun size={18} />}
                {viewMode === 'shaded' && <Globe size={18} />}
                {viewMode === 'wireframe' && <Square size={18} />}
                {viewMode === 'xray' && <Eye size={18} />}
              </button>
              
              <div className="absolute hidden group-hover:block right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-10 py-1">
                <button 
                  className={`block w-full text-left px-4 py-1 text-sm ${
                    viewMode === 'realistic' ? 'bg-blue-600' : 'hover:bg-gray-700'
                  }`}
                  onClick={() => setViewMode('realistic')}
                >
                  Realistic
                </button>
                <button 
                  className={`block w-full text-left px-4 py-1 text-sm ${
                    viewMode === 'shaded' ? 'bg-blue-600' : 'hover:bg-gray-700'
                  }`}
                  onClick={() => setViewMode('shaded')}
                >
                  Shaded
                </button>
                <button 
                  className={`block w-full text-left px-4 py-1 text-sm ${
                    viewMode === 'wireframe' ? 'bg-blue-600' : 'hover:bg-gray-700'
                  }`}
                  onClick={() => setViewMode('wireframe')}
                >
                  Wireframe
                </button>
                <button 
                  className={`block w-full text-left px-4 py-1 text-sm ${
                    viewMode === 'xray' ? 'bg-blue-600' : 'hover:bg-gray-700'
                  }`}
                  onClick={() => setViewMode('xray')}
                >
                  X-Ray
                </button>
              </div>
            </div>
            
            <div className="h-5 border-l border-gray-600 mx-1" />
            
            {/* Element toggle buttons */}
            <button 
              className={`p-1.5 rounded-md focus:outline-none ${
                showTool ? 'text-blue-400' : 'text-gray-400'
              } hover:bg-gray-700`}
              onClick={() => {
                setShowTool(!showTool);
                // Update tool visibility immediately
                if (toolRef.current) {
                  toolRef.current.visible = !showTool;
                  console.log("Tool visibility toggled to:", !showTool);
                }
              }}
              title={showTool ? "Hide Tool" : "Show Tool"}
            >
              <Tool size={18} />
            </button>
            
            <button 
              className={`p-1.5 rounded-md focus:outline-none ${
                isWorkpieceVisible ? 'text-blue-400' : 'text-gray-400'
              } hover:bg-gray-700`}
              onClick={() => setIsWorkpieceVisible(!isWorkpieceVisible)}
              title={isWorkpieceVisible ? "Hide Workpiece" : "Show Workpiece"}
            >
              <Box size={18} />
            </button>
            
            <button 
              className={`p-1.5 rounded-md focus:outline-none ${
                showToolpath ? 'text-blue-400' : 'text-gray-400'
              } hover:bg-gray-700`}
              onClick={() => setShowToolpath(!showToolpath)}
              title={showToolpath ? "Hide Toolpath" : "Show Toolpath"}
            >
              <Layers size={18} />
            </button>
            
            <div className="h-5 border-l border-gray-600 mx-1" />
            
            {/* Utility buttons */}
            <button 
              className="p-1.5 rounded-md hover:bg-gray-700 focus:outline-none"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              <Maximize2 size={18} />
            </button>
            
            <button 
              className="p-1.5 rounded-md hover:bg-gray-700 focus:outline-none"
              onClick={takeScreenshot}
              title="Take Screenshot"
            >
              <Download size={18} />
            </button>
            
            <button 
              className={`p-1.5 rounded-md focus:outline-none ${
                showInfo ? 'text-blue-400' : 'text-gray-400'
              } hover:bg-gray-700`}
              onClick={() => setShowInfo(!showInfo)}
              title={showInfo ? "Hide Info" : "Show Info"}
            >
              <Info size={18} />
            </button>
          </div>
        </div>
      )}
      
      {/* Bottom playback controls */}
      {showControls && (
        <div className="absolute bottom-0 left-0 right-0 bg-gray-800 bg-opacity-75 text-white p-2 z-10">
          <div className="w-full space-y-2">
            {/* Progress bar */}
            <div 
              className="h-2 bg-gray-700 rounded-full cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const offsetX = e.clientX - rect.left;
                const percent = (offsetX / rect.width) * 100;
                jumpToProgress(percent);
              }}
            >
              <div 
                className="h-full bg-blue-500 rounded-full relative"
                style={{ width: `${getProgress()}%` }}
              >
                <div 
                  className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full cursor-pointer"
                ></div>
              </div>
            </div>
            
            {/* Controls and info */}
            <div className="flex items-center justify-between">
              {/* Time / progress display */}
              <div className="text-xs font-mono">
                {currentPointIndex + 1} / {toolpathPointsRef.current.length || 0}
              </div>
              
              {/* Control buttons */}
              <div className="flex items-center space-x-2">
                <button
                  className="p-1.5 rounded-md hover:bg-gray-700 focus:outline-none"
                  onClick={stopToolpath}
                  title="Go to Start"
                >
                  <SkipBack size={16} />
                </button>
                
                <button
                  className="p-1.5 rounded-md hover:bg-gray-700 focus:outline-none"
                  onClick={stepBackward}
                  title="Step Backward"
                >
                  <ChevronLeft size={16} />
                </button>
                
                <button
                  className="p-2 bg-blue-600 rounded-full hover:bg-blue-700 focus:outline-none"
                  onClick={isPlaying ? pauseToolpath : playToolpath}
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                </button>
                
                <button
                  className="p-1.5 rounded-md hover:bg-gray-700 focus:outline-none"
                  onClick={stepForward}
                  title="Step Forward"
                >
                  <ChevronRight size={16} />
                </button>
                
                {/* Playback speed */}
                <div className="relative group">
                  <button
                    className="p-1.5 rounded-md hover:bg-gray-700 focus:outline-none flex items-center"
                    title="Playback Speed"
                  >
                    <FastForward size={16} />
                    <span className="ml-1 text-xs">{playbackSpeed}×</span>
                  </button>
                  
                  <div className="absolute hidden group-hover:block right-0 bottom-full mb-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-10 py-1">
                    {[0.25, 0.5, 1, 2, 4, 8].map((speed) => (
                      <button
                        key={speed}
                        className={`block w-full text-left px-4 py-1 text-xs ${
                          playbackSpeed === speed ? 'bg-blue-600' : 'hover:bg-gray-700'
                        }`}
                        onClick={() => setPlaybackSpeed(speed)}
                      >
                        {speed}×
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Remaining time */}
              <div className="text-xs font-mono">
                {statistics.timeRemaining}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Information overlay */}
      {showInfo && (
        <div className="absolute top-16 left-4 bg-gray-800 bg-opacity-75 text-white p-3 rounded-md z-10 max-w-xs text-sm">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div className="text-gray-400">Position:</div>
            <div className="font-mono">
              X:{currentPoint.x.toFixed(3)} Y:{currentPoint.y.toFixed(3)} Z:{currentPoint.z.toFixed(3)}
            </div>
            
            <div className="text-gray-400">Current Line:</div>
            <div className="font-mono">{currentPointIndex + 1} / {toolpathPointsRef.current.length || 0}</div>
            
            <div className="text-gray-400">Feedrate:</div>
            <div className="font-mono">{currentPoint.feedrate || 0} mm/min</div>
            
            <div className="text-gray-400">Move Type:</div>
            <div className="font-mono">{currentPoint.type || 'N/A'}</div>
            
            {selectedTool && (
              <>
                <div className="text-gray-400">Tool:</div>
                <div className="font-mono">{selectedTool}</div>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Right side panel */}
      {isPanelOpen && (
        <div className="absolute top-16 right-4 w-72 bg-gray-800 bg-opacity-90 text-white p-3 rounded-md z-10 max-h-[calc(100%-200px)] overflow-y-auto">
          {/* Info panel */}
          {activePanel === 'info' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Toolpath Information</h3>
                <button 
                  className="p-1 rounded-md hover:bg-gray-700"
                  onClick={() => setIsPanelOpen(false)}
                >
                  <X size={16} />
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Toolpath stats */}
                <div>
                  <h4 className="text-sm font-medium text-blue-400 mb-2">Toolpath Overview</h4>
                  <div className="bg-gray-700 p-3 rounded space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Total Points:</span>
                      <span className="font-medium">{toolpathPointsRef.current.length}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-300">Rapid Moves:</span>
                      <span className="font-medium">
                        {toolpathPointsRef.current.filter(p => p.isRapid).length}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-300">Cutting Moves:</span>
                      <span className="font-medium">
                        {toolpathPointsRef.current.filter(p => !p.isRapid).length}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Tool info */}
                {selectedTool && (
                  <div>
                    <h4 className="text-sm font-medium text-blue-400 mb-2">Tool</h4>
                    <div className="bg-gray-700 p-3 rounded text-sm">
                      <div className="text-sm font-medium mb-2">{selectedTool}</div>
                      {predefinedTools.find(t => t.name === selectedTool) && (
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                          <div className="text-gray-300">Type:</div>
                          <div>
                            {predefinedTools.find(t => t.name === selectedTool)?.type}
                          </div>
                          
                          <div className="text-gray-300">Diameter:</div>
                          <div>
                            {predefinedTools.find(t => t.name === selectedTool)?.diameter} mm
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Workpiece info */}
                {workpiece && (
                  <div>
                    <h4 className="text-sm font-medium text-blue-400 mb-2">Workpiece</h4>
                    <div className="bg-gray-700 p-3 rounded space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Material:</span>
                        <span className="font-medium capitalize">{workpiece.material || 'Unknown'}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-300">Dimensions:</span>
                        <span className="font-medium">
                          {workpiece.width} × {workpiece.height} × {workpiece.depth} {workpiece.units}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Settings panel */}
          {activePanel === 'settings' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Visualization Settings</h3>
                <button 
                  className="p-1 rounded-md hover:bg-gray-700"
                  onClick={() => setIsPanelOpen(false)}
                >
                  <X size={16} />
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm">Show Statistics</label>
                  <div className="relative inline-block w-10 align-middle select-none">
                    <input
                      type="checkbox"
                      checked={showStats}
                      onChange={() => setShowStats(!showStats)}
                      className="sr-only"
                      id="stats-toggle"
                    />
                    <label
                      htmlFor="stats-toggle"
                      className={`block overflow-hidden h-6 rounded-full bg-gray-600 cursor-pointer ${
                        showStats ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
                          showStats ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </label>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <label className="text-sm block">Highlight Mode</label>
                  <select 
                    value={highlightMode}
                    onChange={(e) => setHighlightMode(e.target.value as any)}
                    className="bg-gray-700 rounded w-full p-1.5 text-sm"
                  >
                    <option value="none">None</option>
                    <option value="rapid">Rapid Moves</option>
                    <option value="cut">Cutting Moves</option>
                    <option value="depth">By Depth</option>
                  </select>
                </div>
                
                {workpiece && (
                  <div className="space-y-1 border-t border-gray-700 pt-3">
                    <h4 className="text-sm font-medium mb-2">Workpiece</h4>
                    
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm">Show Workpiece</label>
                      <div className="relative inline-block w-10 align-middle select-none">
                        <input
                          type="checkbox"
                          checked={isWorkpieceVisible}
                          onChange={() => setIsWorkpieceVisible(!isWorkpieceVisible)}
                          className="sr-only"
                          id="workpiece-toggle"
                        />
                        <label
                          htmlFor="workpiece-toggle"
                          className={`block overflow-hidden h-6 rounded-full bg-gray-600 cursor-pointer ${
                            isWorkpieceVisible ? 'bg-blue-600' : 'bg-gray-600'
                          }`}
                        >
                          <span
                            className={`block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
                              isWorkpieceVisible ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </label>
                      </div>
                    </div>
                    
                    {isWorkpieceVisible && (
                      <div className="space-y-1 mt-3">
                        <label className="text-sm flex items-center justify-between">
                          <span>Opacity</span>
                          <span className="text-xs">70%</span>
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value="0.7"
                          className="w-full h-1.5 bg-gray-600 rounded-full appearance-none cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Tools panel */}
          {activePanel === 'tools' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Tool Library</h3>
                <button 
                  className="p-1 rounded-md hover:bg-gray-700"
                  onClick={() => setIsPanelOpen(false)}
                >
                  <X size={16} />
                </button>
              </div>
              
              <div className="space-y-2">
                {predefinedTools.slice(0, 10).map(tool => (
                  <div
                    key={tool.name}
                    className={`p-2 rounded cursor-pointer ${
                      selectedTool === tool.name ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    <div className="text-sm font-medium">{tool.name}</div>
                    <div className="flex text-xs text-gray-300 mt-1">
                      <span className="mr-3">{tool.type}</span>
                      <span>Ø {tool.diameter}mm</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Side control buttons */}
      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex flex-col space-y-2 z-10">
        <button 
          className={`p-2 rounded-md bg-gray-800 bg-opacity-75 hover:bg-opacity-100 focus:outline-none ${
            activePanel === 'info' && isPanelOpen ? 'text-blue-400' : 'text-white'
          }`}
          onClick={() => togglePanel('info')}
          title="Information"
        >
          <Info size={20} />
        </button>
        
        <button 
          className={`p-2 rounded-md bg-gray-800 bg-opacity-75 hover:bg-opacity-100 focus:outline-none ${
            activePanel === 'settings' && isPanelOpen ? 'text-blue-400' : 'text-white'
          }`}
          onClick={() => togglePanel('settings')}
          title="Settings"
        >
          <Settings size={20} />
        </button>
        
        <button 
          className={`p-2 rounded-md bg-gray-800 bg-opacity-75 hover:bg-opacity-100 focus:outline-none ${
            activePanel === 'tools' && isPanelOpen ? 'text-blue-400' : 'text-white'
          }`}
          onClick={() => togglePanel('tools')}
          title="Tool Library"
        >
          <Tool size={20} />
        </button>
        
        <div className="border-t border-gray-600 pt-2"></div>
        
        <button 
          className="p-2 rounded-md bg-gray-800 bg-opacity-75 hover:bg-opacity-100 focus:outline-none text-white"
          onClick={resetView}
          title="Reset View"
        >
          <Home size={20} />
        </button>
      </div>
      
      {/* Show controls button when controls are hidden */}
      {!showControls && (
        <button 
          className="absolute top-2 left-2 p-2 rounded-md bg-gray-800 bg-opacity-75 text-white hover:bg-opacity-100 focus:outline-none z-10"
          onClick={() => setShowControls(true)}
          title="Show Controls"
        >
          <Menu size={20} />
        </button>
      )}
      
      {/* Performance stats */}
      {showStats && (
        <div className="absolute bottom-16 left-4 bg-gray-800 bg-opacity-75 text-white p-2 rounded-md text-xs font-mono z-10">
          <div>FPS: {statistics.fps}</div>
          <div>Triangles: {statistics.triangleCount.toLocaleString()}</div>
          <div>Objects: {statistics.objectCount}</div>
          <div>Memory: {statistics.memory}MB</div>
        </div>
      )}
    </div>
  );
};

export default ToolpathVisualizer;