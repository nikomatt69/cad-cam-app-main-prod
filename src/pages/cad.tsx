// src/pages/cad.tsx
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import PropertyPanel from '../components/cad/PropertyPanel';
import StatusBar from '../components/cad/StatusBar';
import TransformToolbar from '../components/cad/TrasformToolbar';
import FloatingToolbar from '../components/cad/FloatingToolbar';

import { Book, X, ChevronLeft, ChevronRight, Sliders, PenTool } from 'react-feather';
import LocalCadLibraryView from 'src/components/library/LocalCadLibraryView';
import ImportExportDialog from 'src/components/cad/ImportExportDialog';
import { useCADStore } from 'src/store/cadStore';
import { useElementsStore } from 'src/store/elementsStore';
import { useLayerStore } from 'src/store/layerStore';
import EnhancedSidebar from '../components/cad/EnanchedSidebar';
import AIDesignAssistant from '../components/ai/AIDesignAssistant';
import Loading from '../components/ui/Loading';
import EnhancedSidebar2 from '../components/cam/EnanchedSidebar2';
import MetaTags from '../components/layout/Metatags';
import { useLocalLibrary } from '../hooks/useLocalLibrary';
import UnifiedLibraryModal from '../components/library/UnifiedLibraryModal';
import { ComponentLibraryItem, ToolLibraryItem } from '@/src/hooks/useUnifiedLibrary';
import toast from 'react-hot-toast';
import EnhancedToolbar from '../components/cad/EnhancedToolbar';

import { useAI } from '../components/ai/ai-new/AIContextProvider';
import CADCanvas from '../components/cad/CADCanvas';
import DrawingEnabledCADCanvas from '../components/cam/DrawingEnabledCADCanvas';
import { AIHub, AIProcessingIndicator, TextToCADPanel } from '../components/ai/ai-new';

export default function CADPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'tools' | 'layers' | 'settings' >('tools');
  const { viewMode, gridVisible, axisVisible } = useCADStore();
  const { elements, selectedElement, selectElement, undo, redo } = useElementsStore();
  const { layers } = useLayerStore();
  const [showImportExportDialog, setShowImportExportDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'import' | 'export'>('export');
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(true);
  const [selectedLibraryComponent, setSelectedLibraryComponent] = useState<string | null>(null);
  const [showLibraryView, setShowLibraryView] = useState(false);
  // Add state for the unified library modal
  const [showUnifiedLibrary, setShowUnifiedLibrary] = useState(false);
  const [isPlacingComponent, setIsPlacingComponent] = useState(false);
  const [description, setDescription] = useState('');
  
  const { addElements , addElement} = useElementsStore();
  
  
 
  const [prompt, setPrompt] = useState('');
  const { textToCAD, state } = useAI();
  const [statuss, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  
  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setStatus('processing');
    
    try {
      const result = await textToCAD(prompt);
      
      if (result.success) {
        setStatus('success');
        // Usa result.data...
      } else {
        setStatus('error');
      }
    } catch (error) {
      setStatus('error');
    }
  };
  
  const { loadCadDrawing } = useLocalLibrary();  // Move the hook call to the top level
  useEffect(() => {
    const loadComponentFromStorage = async () => {
      // Only proceed if we have the loadComponent query parameter
      if (!router.query.loadComponent) return;
      
      const componentId = router.query.loadComponent as string;
      console.log('Loading component with ID:', componentId);
      
      try {
        // Get the stored component data
        const storedComponent = localStorage.getItem('componentToLoadInCAD');
        if (!storedComponent) {
          console.error('No component data found in localStorage');
          toast.error('Component data not found');
          return;
        }
        
        console.log('Retrieved component data from localStorage');
        const componentData = JSON.parse(storedComponent);
        console.log('Parsed component data:', componentData);
        
        // Validate the component data
        if (!componentData || !componentData.id || componentData.id !== componentId) {
          console.error('Invalid component data or ID mismatch');
          toast.error('Invalid component data');
          return;
        }
        
        // Create a new CAD element from the component
        const newElement = {
          id: `component-${Date.now()}`,
          type: 'component',
          x: 0,
          y: 0,
          z: 0,
          name: componentData.name || 'Unnamed Component',
          componentId: componentData.id,
          data: componentData.data,
          layerId: layers.length > 0 ? layers[0].id : 'default'
        };
        
        console.log('Adding component as CAD element:', newElement);
        
        // Add the element to the canvas
        addElement(newElement);
        toast.success(`Component '${componentData.name}' loaded successfully`);
        
        // Clear the localStorage data
        localStorage.removeItem('componentToLoadInCAD');
        localStorage.removeItem('componentToLoadInCAD_timestamp');
        
        // Remove the query parameter
        const { loadComponent, loadTimestamp, ...otherParams } = router.query;
        router.replace({
          pathname: router.pathname,
          query: otherParams
        }, undefined, { shallow: true });
        
      } catch (error) {
        console.error('Error loading component from localStorage:', error);
        toast.error('Failed to load component data. See console for details.');
      }
    };
    
    loadComponentFromStorage();
  }, [router.query.loadComponent, router.query.loadTimestamp, addElement, layers, router]);
  // Initialize with a default layer if none exists
  useEffect(() => {
    // This is just to ensure layers are displayed in the UI
    // The actual initialization happens in layerStore.ts
    console.log("Layers initialized:", layers);
  }, [layers]);

  // Function to handle file saving
  const handleSaveProject = () => {
    try {
      setDialogMode('export');
      setShowImportExportDialog(true);
    } catch (error) {
      console.error('Error preparing to save project:', error);
      toast.error('Failed to prepare project for saving.');
    }
  };
  
  // Handle loading a drawing from the library
  const handleSelectDrawing = (drawingId: string) => {
    if (loadCadDrawing) {
      loadCadDrawing(drawingId);
    }
    setShowLibraryView(false);
  };

  // Handle component selection from unified library or sidebar
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
  const handleGenerateElements = async () => {
    const result = await textToCAD(description);
    if (result.success && result.data) {
      addElements(result.data);
    }
  };
  useEffect(() => {
    // Controlla se c'è un parametro loadComponent nella query string
    if (router.query.loadComponent) {
      const componentId = String(router.query.loadComponent);
      const storedComponentJSON = localStorage.getItem('componentToLoadInCAD');
      
      console.log('Tentativo di caricamento componente ID:', componentId);
      console.log('Dati in localStorage:', storedComponentJSON?.substring(0, 100) + '...');
      
      if (storedComponentJSON) {
        try {
          const componentData = JSON.parse(storedComponentJSON);
          
          // Verifica che l'ID corrisponda esattamente
          if (componentData && componentData.id && componentData.id === componentId) {
            console.log('Componente trovato, preparazione al caricamento');
            
            // Crea un nuovo elemento CAD dal componente
            const newElement = {
              id: `component-${Date.now()}`, // ID univoco per il nuovo elemento CAD
              type: 'component',
              x: 0,
              y: 0,
              z: 0,
              name: componentData.name || 'Componente',
              componentId: componentData.id,
              data: componentData.data,
              layerId: layers.length > 0 ? layers[0].id : 'default'
            };
            
            // Aggiungi l'elemento al canvas
            addElement(newElement);
            toast.success(`Componente ${componentData.name} caricato con successo`);
            
            // Pulisci localStorage dopo il caricamento
            localStorage.removeItem('componentToLoadInCAD');
            localStorage.removeItem('componentToLoadInCAD_timestamp');
            
            // Rimuovi i parametri query dall'URL
            const { loadComponent, ts, ...otherParams } = router.query;
            router.replace({
              pathname: router.pathname,
              query: otherParams
            }, undefined, { shallow: true });
          } else {
            console.error('ID componente non corrisponde:', {
              idFromURL: componentId, 
              idFromStorage: componentData?.id
            });
            toast.error('ID componente non corrisponde');
          }
        } catch (error) {
          console.error('Errore parsing dati componente:', error);
          toast.error('Errore formato dati componente');
        }
      } else {
        console.error('Nessun dato componente trovato in localStorage');
        toast.error('Dati componente non trovati');
      }
    }
  }, [router.query.loadComponent, layers, addElement, router]);

  // Reset component selection when closing library
  useEffect(() => {
    if (!showUnifiedLibrary && !sidebarOpen) {
      setSelectedLibraryComponent(null);
    }
  }, [showUnifiedLibrary, sidebarOpen]);

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loading/>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  
 
  
  return (
    <div className="h-screen w-screen flex bg-gradient-to-b from-[#2A2A2A] to-[#303030] flex-col rounded-xl overflow-hidden">
      <MetaTags 
        title="CAD Editor" 
        description="Design and create 2D/3D components in our advanced CAD editor"
      />
      <div className="flex rounded-xl flex-col h-full w-full">
        {/* Enhanced Top Toolbar */}
        <EnhancedToolbar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          handleSaveProject={handleSaveProject}
          setDialogMode={setDialogMode}
          setShowImportExportDialog={setShowImportExportDialog}
          setShowLibraryView={setShowLibraryView}
          setShowUnifiedLibrary={setShowUnifiedLibrary}
          setShowFloatingToolbar={setShowFloatingToolbar}
          showFloatingToolbar={showFloatingToolbar}
          selectedLibraryComponent={selectedLibraryComponent}
          setSelectedLibraryComponent={setSelectedLibraryComponent}
          setIsPlacingComponent={setIsPlacingComponent}
        />

        <div className="flex flex-1 p-0.5 bg-gradient-to-b from-[#2A2A2A] to-[#303030] overflow-hidden w-full">
          {/* Enhanced left sidebar */}
          <EnhancedSidebar2 
            isOpen={sidebarOpen} 
            setIsOpen={setSidebarOpen}
            activeSidebarTab={activeSidebarTab}
            setActiveSidebarTab={setActiveSidebarTab}
          />
          
          {/* Main content */}
          <div className="flex-1 flex rounded-xl bg-gradient-to-b from-[#2A2A2A] to-[#303030] relative">
          <DrawingEnabledCADCanvas 
            width="100%" 
            height="100%" 
            previewComponent={selectedLibraryComponent}
            onComponentPlaced={(component, position) => {
            handleComponentPlacement(component, position);
            setIsPlacingComponent(false);
           }}
          />
            
            {/* Floating toolbar */}
            {showFloatingToolbar && (
              <FloatingToolbar 
                initialPosition={{ x: 100, y: 100 }} 
                onClose={() => setShowFloatingToolbar(false)}
              />
            )}
          </div>
          
          {/* Right sidebar for properties */}
          <div 
            className={`${
              rightSidebarOpen ? 'w-80' : 'w-0'
            } flex-shrink-0 bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white p-0.5 border-l border-gray-300 rounded-xl transition-all duration-300 ease-in-out overflow-y-auto`}
          >
            <div className="p-4 space-y-6">
              <PropertyPanel />
              <div className="border-t border-gray-200 pt-4 mt-4"></div>
              <TransformToolbar />
              
              {/* Opzionalmente, qui puoi aggiungere AIDesignAssistant */}
              <div className="border-t border-gray-200 pt-4 mt-4"></div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-md font-medium text-gray-900">AI Design Assistant</h3>
                <Sliders size={16} className="text-blue-600" />
              </div>
             
               <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Strumenti AI</h1>
      <AIDesignAssistant />
    </div>
               </div>
              
            </div>
          
          
          {/* Toggle right sidebar button */}
          <button
            className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white p-2 rounded-l-md shadow-md"
            onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
          >
            {rightSidebarOpen ? <ChevronRight size={20} className="text-gray-600" /> : <ChevronLeft size={20} className="text-gray-600" />}
          </button>
        </div>
        
        {/* Status bar */}
        <StatusBar />
      </div>

      {/* Import/Export Dialog */}
      {showImportExportDialog && (
        <ImportExportDialog
          mode={dialogMode}
          onClose={() => setShowImportExportDialog(false)}
          isOpen={true}
        />
      )}
      {/* Library View Modal */}
      {showLibraryView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-auto">
            <LocalCadLibraryView 
              onClose={() => setShowLibraryView(false)}
              onSelectDrawing={handleSelectDrawing}
            />
          </div>
        </div>
      )}

      {/* Unified Library Modal */}
      <UnifiedLibraryModal
        isOpen={showUnifiedLibrary}
        onClose={() => setShowUnifiedLibrary(false)}
        onSelectComponent={handleComponentSelection}
        onSelectTool={handleToolSelection}
        defaultTab="components"
      />
    </div>
  );
}
 