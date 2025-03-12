// src/components/cad/FloatingToolbar.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Edit3, Square, Circle, Box, Minus, 
  Plus, X, ChevronUp, ChevronDown, 
  Menu, Grid, Tool, Layers, Settings, Sliders,
  Copy, Trash2, RotateCcw, Maximize2, Move,
  Package, Search, Cpu, Book, Filter,
  Type, Triangle, UploadCloud,
  PenTool
} from 'react-feather';
import { useCADStore } from 'src/store/cadStore';
import { useElementsStore } from 'src/store/elementsStore';
import { useLayerStore } from 'src/store/layerStore';
import toast from 'react-hot-toast';

import { predefinedComponents, predefinedTools } from 'src/lib/predefinedLibraries';
import { ToolLibraryItem } from '@/src/hooks/useUnifiedLibrary';
import TextToCADGenerator from '../ai/TextToCADGenerator';
import LocalComponentsLibraryView from '../library/LocalComponentsLibraryView';
import UnifiedLibraryBrowser from './UnifiedLibraryBrowser';
import { ComponentLibraryItem } from '@/src/hooks/useUnifiedLibrary';
import ComponentsLibraryView from '../library/ComponentsLibraryView';
import DrawingToolbar from '../cam/DrawingToolbar';
import { useDrawingTools } from '@/src/hooks/useDrawingTools';
import LibraryMenu from './LibraryMenu';

interface Position {
  x: number;
  y: number;
}

interface FloatingToolbarProps {
  initialPosition?: Position;
  onClose?: () => void;
}

const TOOLBAR_MODES = ['create', 'transform', 'library', 'ai','drawing'] as const;
type ToolbarMode = typeof TOOLBAR_MODES[number];

const LIBRARY_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'mechanical', label: 'Mechanical' },
  { id: 'electronic', label: 'Electronic' },
  { id: 'structural', label: 'Structural' },
  { id: 'fixture', label: 'Fixtures' },
  { id: 'enclosure', label: 'Enclosures' }
];

const FloatingToolbar: React.FC<FloatingToolbarProps> = ({ 
  initialPosition = { x: 100, y: 100 },
  onClose
}) => {
  const [position, setPosition] = useState<Position>(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedMode, setSelectedMode] = useState<ToolbarMode>('create');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredItem, setHoveredItem] = useState<number | null>(null);
  const [selectedLibraryComponent, setSelectedLibraryComponent] = useState<string | null>(null);
  const [showLibraryView, setShowLibraryView] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'tools' | 'layers' | 'settings' >('tools');
  const [showUnifiedLibrary, setShowUnifiedLibrary] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const { addElement, selectedElement, duplicateElement, deleteElement, addElements } = useElementsStore();
  const { toggleGrid, toggleAxis, viewMode, setViewMode } = useCADStore();
  const { activeLayer, layers } = useLayerStore();
  const { toolState, setActiveTool, setPenSize, setEraserSize, setHighlighterSize, 
    setColor, setTextSize, setDimensionStyle, startDrawing, addDrawingPoint, 
    finishDrawing, resetDrawing } = useDrawingTools();
  // Check if the active layer is locked
  const isLayerLocked = React.useMemo(() => {
    if (!activeLayer) return true;
    const layer = layers.find(l => l.id === activeLayer);
    return layer?.locked || false;
  }, [activeLayer, layers]);

  // Handle drag start
  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!toolbarRef.current) return;
    
    setIsDragging(true);
    const rect = toolbarRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  // Handle dragging
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleDrag = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  };

  // Handle drag end
  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Add drag event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('mouseup', handleDragEnd);
    } else {
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('mouseup', handleDragEnd);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('mouseup', handleDragEnd);
    };
  }, [handleDrag, isDragging]);

  // Filter components for library mode
  const filteredComponents = predefinedComponents.filter(component => {
    // Filter by search query
    const matchesSearch = !searchQuery || 
      component.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (component.description && component.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Filter by category
    const matchesCategory = selectedCategory === 'all' || 
      (component.data && component.type === selectedCategory);
    
    return matchesSearch && matchesCategory;
  });

  // Handle adding a new element
  const handleAddElement = (type: string) => {
    if (isLayerLocked) {
      alert('Cannot add elements to a locked layer');
      return;
    }
    
    let newElement;
    
    switch(type) {
      case 'rectangle':
        newElement = {
          type: 'rectangle',
          x: 0,
          y: 0,
          z: 0,
          width: 100,
          height: 100,
          color: '#1e88e5',
          linewidth: 1
        };
        break;
      case 'circle':
        newElement = {
          type: 'circle',
          x: 0,
          y: 0,
          z: 0,
          radius: 50,
          color: '#1e88e5',
          linewidth: 1
        };
        break;
      case 'cube':
        newElement = {
          type: 'cube',
          x: 0,
          y: 0,
          z: 0,
          width: 100,
          height: 100,
          depth: 100,
          color: '#1e88e5',
          wireframe: false
        };
        break;
      case 'line':
        newElement = {
          type: 'line',
          x1: -50,
          y1: 0,
          z1: 0,
          x2: 50,
          y2: 0,
          z2: 0,
          color: '#1e88e5',
          linewidth: 2
        };
        break;
      case 'sphere':
        newElement = {
          type: 'sphere',
          x: 0,
          y: 0,
          z: 0,
          radius: 50,
          color: '#1e88e5',
          wireframe: false
        };
        break;
      case 'cylinder':
        newElement = {
          type: 'cylinder',
          x: 0,
          y: 0,
          z: 0,
          radius: 30,
          height: 100,
          color: '#1e88e5',
          wireframe: false
        };
        break;
      case 'cone':
        newElement = {
          type: 'cone',
          x: 0,
          y: 0,
          z: 0,
          radius: 50,
          height: 100,
          color: '#1e88e5',
          wireframe: false
        };
        break;
      case 'torus':
        newElement = {
          type: 'torus',
          x: 0,
          y: 0,
          z: 0,
          radius: 50,
          tubeRadius: 10,
          color: '#1e88e5',
          wireframe: false
        };
        break;
      case 'text':
        newElement = {
          type: 'text',
          x: 0,
          y: 0,
          z: 0,
          text: 'Text',
          size: 20,
          color: '#1e88e5'
        };
        break;
      case 'polygon':
        newElement = {
          type: 'polygon',
          x: 0,
          y: 0,
          z: 0,
          sides: 6,
          radius: 50,
          color: '#1e88e5',
          linewidth: 1
        };
        break;
      case 'extrude':
        newElement = {
          type: 'extrude',
          x: 0,
          y: 0,
          z: 0,
          shape: [
            { x: -25, y: -25 },
            { x: 25, y: -25 },
            { x: 25, y: 25 },
            { x: -25, y: 25 }
          ],
          depth: 50,
          color: '#1e88e5'
        };
        break;
      default:
        return;
    }
    
    addElement(newElement);
  };

  // Add component from library to the workspace
  const addComponentToWorkspace = (component: any) => {
    if (isLayerLocked) {
      alert('Cannot add components to a locked layer. Please unlock the layer first.');
      return;
    }

    // For components, we need to handle their specific structure
    // This assumes components have a 'data.geometry.elements' structure
    if (component.data && component.data.geometry && component.data.geometry.elements) {
      addElements(component.data.geometry.elements);
    } else {
      console.error('Invalid component structure:', component);
    }
  };
  const handleComponentSelection = useCallback((component: ComponentLibraryItem) => {
    console.log("Selected component:", component);
    setSelectedLibraryComponent(component.id);
    // Show selection notification
    toast.success(`Component '${component.name}' selected. Place it on the canvas.`);
    setShowUnifiedLibrary(false);
    // Optionally, switch to 'tools' tab if not already active
    setActiveSidebarTab('tools');
  }, []);

  // Handle component placement in canvas
  const handleComponentPlacement = useCallback((component: string, position: {x: number, y: number, z: number}) => {
    // Logic to place the component on the canvas would go here
    console.log(`Component ${component} placed at:`, position);
    toast.success('Component placed successfully!');
    // Reset selection after placement
    setSelectedLibraryComponent(null);
  }, []);

  // Add handler for tool selection from unified library
  const handleToolSelection = (tool: ToolLibraryItem) => {
    // Handle tool selection if needed
    console.log("Selected tool:", tool);
    setShowUnifiedLibrary(false);
  };

  // Reset component selection when closing library
  useEffect(() => {
    if (!showUnifiedLibrary && !showLibraryView) {
      setSelectedLibraryComponent(null);
    }
  }, [showUnifiedLibrary, showLibraryView]);

  // Custom Icon for Cylinder
  const CylinderIcon = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <line x1="4" y1="6" x2="4" y2="18" />
      <line x1="20" y1="6" x2="20" y2="18" />
      <ellipse cx="12" cy="18" rx="8" ry="3" />
    </svg>
  );

  // Custom Icon for Torus
  const TorusIcon = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

  // Custom Icon for Extrude
  const ExtrudeIcon = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12,5 19,12 12,19 5,12" />
      <line x1="12" y1="5" x2="12" y2="2" />
    </svg>
  );

  // Custom Icon for Polygon
  const PolygonIcon = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12,4 20,10 17,19 7,19 4,10" />
    </svg>
  );

  // Render the appropriate tool panel based on selected mode
  const renderToolPanel = () => {
    switch (selectedMode) {
      case 'create':
        return (
          <div className="p-2 grid grid-cols-3 gap-2">
            <button 
              onClick={() => handleAddElement('line')}
              className="p-2 bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white hover:bg-gray-100 rounded-md shadow-sm flex flex-col items-center justify-center text-xs"
              disabled={isLayerLocked}
              title={isLayerLocked ? "Layer is locked" : "Add Line"}
            >
              <div className="mb-1"><Minus size={16} /></div>
              <span>Line</span>
            </button>
            <button 
              onClick={() => handleAddElement('rectangle')}
              className="p-2 bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white hover:bg-gray-100 rounded-md shadow-sm flex flex-col items-center justify-center text-xs"
              disabled={isLayerLocked}
              title={isLayerLocked ? "Layer is locked" : "Add Rectangle"}
            >
              <Square size={16} className="mb-1" />
              <span>Rectangle</span>
            </button>
            <button 
              onClick={() => handleAddElement('circle')}
              className="p-2 bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white hover:bg-gray-100 rounded-md shadow-sm flex flex-col items-center justify-center text-xs"
              disabled={isLayerLocked}
              title={isLayerLocked ? "Layer is locked" : "Add Circle"}
            >
              <Circle size={16} className="mb-1" />
              <span>Circle</span>
            </button>
            <button 
              onClick={() => handleAddElement('cube')}
              className="p-2 bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white hover:bg-gray-100 rounded-md shadow-sm flex flex-col items-center justify-center text-xs"
              disabled={isLayerLocked}
              title={isLayerLocked ? "Layer is locked" : "Add Cube"}
            >
              <Box size={16} className="mb-1" />
              <span>Cube</span>
            </button>
            <button 
              onClick={() => handleAddElement('sphere')}
              className="p-2 bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white hover:bg-gray-100 rounded-md shadow-sm flex flex-col items-center justify-center text-xs"
              disabled={isLayerLocked}
              title={isLayerLocked ? "Layer is locked" : "Add Sphere"}
            >
              <Circle size={16} className="mb-1" />
              <span>Sphere</span>
            </button>
            <button 
              onClick={() => handleAddElement('cylinder')}
              className="p-2 bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white hover:bg-gray-100 rounded-md shadow-sm flex flex-col items-center justify-center text-xs"
              disabled={isLayerLocked}
              title={isLayerLocked ? "Layer is locked" : "Add Cylinder"}
            >
              <div className="mb-1"><CylinderIcon /></div>
              <span>Cylinder</span>
            </button>
            <button 
              onClick={() => handleAddElement('cone')}
              className="p-2 bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white hover:bg-gray-100 rounded-md shadow-sm flex flex-col items-center justify-center text-xs"
              disabled={isLayerLocked}
              title={isLayerLocked ? "Layer is locked" : "Add Cone"}
            >
              <Triangle size={16} className="mb-1" />
              <span>Cone</span>
            </button>
            <button 
              onClick={() => handleAddElement('torus')}
              className="p-2 bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white hover:bg-gray-100 rounded-md shadow-sm flex flex-col items-center justify-center text-xs"
              disabled={isLayerLocked}
              title={isLayerLocked ? "Layer is locked" : "Add Torus"}
            >
              <div className="mb-1"><TorusIcon /></div>
              <span>Torus</span>
            </button>
            <button 
              onClick={() => handleAddElement('extrude')}
              className="p-2 bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white hover:bg-gray-100 rounded-md shadow-sm flex flex-col items-center justify-center text-xs"
              disabled={isLayerLocked}
              title={isLayerLocked ? "Layer is locked" : "Extrude Shape"}
            >
              <div className="mb-1"><ExtrudeIcon /></div>
              <span>Extrude</span>
            </button>
            <button 
              onClick={() => handleAddElement('text')}
              className="p-2 bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white hover:bg-gray-100 rounded-md shadow-sm flex flex-col items-center justify-center text-xs"
              disabled={isLayerLocked}
              title={isLayerLocked ? "Layer is locked" : "Add Text"}
            >
              <Type size={16} className="mb-1" />
              <span>Text</span>
            </button>
            <button 
              onClick={() => handleAddElement('polygon')}
              className="p-2 bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white hover:bg-gray-100 rounded-md shadow-sm flex flex-col items-center justify-center text-xs"
              disabled={isLayerLocked}
              title={isLayerLocked ? "Layer is locked" : "Add Polygon"}
            >
              <div className="mb-1"><PolygonIcon /></div>
              <span>Polygon</span>
            </button>
            
          </div>
        );
      case 'transform':
        return (
          <div className="p-2 flex flex-col gap-2">
            <button 
              className="p-2 bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white hover:bg-gray-100 rounded-md shadow-sm flex flex-col items-center justify-center text-xs"
              disabled={!selectedElement || isLayerLocked}
              title={!selectedElement ? "No element selected" : isLayerLocked ? "Layer is locked" : "Move Element"}
            >
              <Move size={16} className="mb-1" />
              <span>Move</span>
            </button>
            <button 
              className="p-2 bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white hover:bg-gray-100 rounded-md shadow-sm flex flex-col items-center justify-center text-xs"
              disabled={!selectedElement || isLayerLocked}
              title={!selectedElement ? "No element selected" : isLayerLocked ? "Layer is locked" : "Rotate Element"}
            >
              <RotateCcw size={16} className="mb-1" />
              <span>Rotate</span>
            </button>
            <button 
              className="p-2 bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white hover:bg-gray-100 rounded-md shadow-sm flex flex-col items-center justify-center text-xs"
              disabled={!selectedElement || isLayerLocked}
              title={!selectedElement ? "No element selected" : isLayerLocked ? "Layer is locked" : "Scale Element"}
            >
              <Maximize2 size={16} className="mb-1" />
              <span>Scale</span>
            </button>
            <button 
              onClick={() => selectedElement && duplicateElement(selectedElement.id)}
              className="p-2 bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white hover:bg-gray-100 rounded-md shadow-sm flex flex-col items-center justify-center text-xs"
              disabled={!selectedElement || isLayerLocked}
              title={!selectedElement ? "No element selected" : isLayerLocked ? "Layer is locked" : "Duplicate Element"}
            >
              <Copy size={16} className="mb-1" />
              <span>Copy</span>
            </button>
            <button 
              onClick={() => selectedElement && deleteElement(selectedElement.id)}
              className="p-2 bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white hover:bg-gray-100 rounded-md shadow-sm flex flex-col items-center justify-center text-xs"
              disabled={!selectedElement || isLayerLocked}
              title={!selectedElement ? "No element selected" : isLayerLocked ? "Layer is locked" : "Delete Element"}
            >
              <Trash2 size={16} className="mb-1" />
              <span>Delete</span>
            </button>
            <button 
              onClick={() => setViewMode(viewMode === '2d' ? '3d' : '2d')}
              className="p-2 bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white hover:bg-gray-100 rounded-md shadow-sm flex flex-col items-center justify-center text-xs"
              title={`Switch to ${viewMode === '2d' ? '3D' : '2D'} View`}
            >
              <Sliders size={16} className="mb-1" />
              <span>{viewMode === '2d' ? '3D' : '2D'}</span>
            </button>
          </div>
        );
      case 'library':
        return (
          <div className="p-2 flex flex-col">
            <LibraryMenu onSelectComponent={(component) => {
            setSelectedLibraryComponent(component);
            // Se la prop onSelectComponent esiste, chiamala
            if (selectedElement) {
              (component);
            }
          }} />
          </div>
        );
        case 'drawing':
        return (
          <div className="p-2 flex  h-full">
            <DrawingToolbar
             
             onSelectTool={setActiveTool}
             activeTool={toolState.activeTool}
             color={toolState.color}
             onColorChange={setColor}
             penSize={toolState.penSize}
             onPenSizeChange={setPenSize}
             eraserSize={toolState.eraserSize}
             onEraserSizeChange={setEraserSize}
             highlighterSize={toolState.highlighterSize}
             onHighlighterSizeChange={setHighlighterSize}
             textSize={toolState.textSize}
             onTextSizeChange={setTextSize}
             dimensionStyle={toolState.dimensionStyle}
             onDimensionStyleChange={setDimensionStyle}
           /> 
          </div>
        );
      case 'ai':
        return (
          <div className="p-2">
            <TextToCADGenerator />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      ref={toolbarRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ 
        position: 'absolute', 
        left: position.x, 
        top: position.y, 
        zIndex: 1000 
      }}
      className="bg-gray-50 rounded-lg shadow-lg overflow-hidden w-80"
    >
      {/* Toolbar header - draggable area */}
      <div 
        className="bg-gray-800 text-white h-8 flex items-center justify-between px-3 cursor-move"
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center text-xs">
          <Menu size={12} className="mr-1" />
          <span>CAD Toolbar</span>
        </div>
        <div className="flex items-center">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-300 hover:text-white p-1"
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button 
            className="text-gray-300 hover:text-white p-1"
            onClick={onClose}
          >
            <X size={14} />
          </button>
        </div>
      </div>
      
      {/* Toolbar content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Mode selector tabs */}
            <div className="flex border-b border-gray-200">
              <button
                className={`flex-1 py-2 text-xs font-medium ${
                  selectedMode === 'create' 
                    ? 'text-blue-600 border-b-2 border-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setSelectedMode('create')}
              >
                <div className="flex items-center justify-center">
                  <Plus size={12} className="mr-1" />
                  Create
                </div>
              </button>
              <button
                className={`flex-1 py-2 text-xs font-medium ${
                  selectedMode === 'transform' 
                    ? 'text-blue-600 border-b-2 border-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setSelectedMode('transform')}
              >
                <div className="flex items-center justify-center">
                  <Edit3 size={12} className="mr-1" />
                  Transform
                </div>
              </button>
              <button
                className={`flex-1 py-2 text-xs font-medium ${
                  selectedMode === 'library' 
                    ? 'text-blue-600 border-b-2 border-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setSelectedMode('library')}
              >
                <div className="flex items-center justify-center">
                  <Package size={12} className="mr-1" />
                  Library
                </div>
              </button>
              <button
                className={`flex-1 py-2 text-xs font-medium ${
                  selectedMode === 'ai' 
                    ? 'text-blue-600 border-b-2 border-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setSelectedMode('ai')}
              >
                <div className="flex items-center justify-center">
                  <Cpu size={12} className="mr-1" />
                  AI
                </div>
              </button>
              <button
                className={`flex-1 py-2 text-xs font-medium ${
                  selectedMode === 'drawing' 
                    ? 'text-blue-600 border-b-2 border-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setSelectedMode('drawing')}
              >
                <div className="flex items-center justify-center">
                  <PenTool size={12} className="mr-1" />
                  Drawing
                </div>
              </button>
            </div>
            
            {/* Dynamic tool panel based on selected mode */}
            {renderToolPanel()}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default FloatingToolbar;