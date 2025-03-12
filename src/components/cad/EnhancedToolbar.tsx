// src/components/cad/EnhancedToolbar.tsx
import React from 'react';
import { 
  Save, 
  Upload, 
  Book, 
  Menu, 
  ArrowLeft, 
  ArrowRight, 
  Tool, 
  X,
  PlusSquare,
  MousePointer,
} from 'react-feather';
import { useRouter } from 'next/router';
import { useElementsStore } from 'src/store/elementsStore';
import toast from 'react-hot-toast';
import Link from 'next/link';
import Image from 'next/image';
import AIAssistantButton from '../ai/AIAssistantButton';

interface EnhancedToolbarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  handleSaveProject: () => void;
  setDialogMode: (mode: 'import' | 'export') => void;
  setShowImportExportDialog: (show: boolean) => void;
  setShowLibraryView: (show: boolean) => void;
  setShowUnifiedLibrary: (show: boolean) => void;
  setShowFloatingToolbar: (show: boolean) => void;
  showFloatingToolbar: boolean;
  selectedLibraryComponent: string | null;
  setSelectedLibraryComponent: (componentId: string | null) => void;
  setIsPlacingComponent?: (isPlacing: boolean) => void;
}

const EnhancedToolbar: React.FC<EnhancedToolbarProps> = ({
  sidebarOpen,
  setSidebarOpen,
  handleSaveProject,
  setDialogMode,
  setShowImportExportDialog,
  setShowLibraryView,
  setShowUnifiedLibrary,
  setShowFloatingToolbar,
  showFloatingToolbar,
  selectedLibraryComponent,
  setSelectedLibraryComponent,
  setIsPlacingComponent
}) => {
  const router = useRouter();
  const { elements, selectedElement, undo, redo } = useElementsStore();
  
  // Handle creating a component from selected element
  const handleCreateComponentFromSelected = () => {
    if (!selectedElement) return;
    
    // Save the selected element ID to localStorage so the component page can access it
    localStorage.setItem('cadSelectedElementForComponent', JSON.stringify(selectedElement));
    
    // Redirect to the component creation page with the selectedElement data
    router.push({
      pathname: '/components',
      query: { createFromCad: 'true' }
    });
    
    toast.success('Element prepared for component creation');
  };

  const handleStartPlacement = () => {
    if (setIsPlacingComponent && selectedLibraryComponent) {
      setIsPlacingComponent(true);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 border-b w-full px-4 py-2 rounded-xl flex items-center justify-between">
      <div className="flex w-max rounded-xl items-center">
        <button
          className="mr-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu size={20} className="text-gray-600 dark:text-gray-400" />
        </button>
        <Link href="/" className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <img
                  className=" h-14 w-auto"
                  src="/logo.png"
                  alt="CAD/CAM FUN"
                />
                
              </div>
            </Link>
        <div className="ml-6 flex items-center space-x-2">
          <button
            onClick={handleSaveProject}
            className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md shadow-sm flex items-center"
            title="Save Project"
          >
            <Save size={16} className="mr-1.5 text-gray-600 dark:text-gray-400" />
            <span className="text-sm">Save</span>
          </button>
          <button
            onClick={() => { setDialogMode('import'); setShowImportExportDialog(true); }}
            className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md shadow-sm flex items-center"
            title="Import Project"
          >
            <Upload size={16} className="mr-1.5 text-gray-600 dark:text-gray-400" />
            <span className="text-sm">Import</span>
          </button>
          <button
            onClick={() => setShowUnifiedLibrary(true)}
            className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md shadow-sm flex items-center"
            title="Unified Library"
          >
            <Book size={16} className="mr-1.5 text-gray-600 dark:text-gray-400" />
            <span className="text-sm">Unified Library</span>
          </button>
          
          {/* Create Component from Selected Element button - only shows when element is selected */}
          {selectedElement && (
            <button
              onClick={handleCreateComponentFromSelected}
              className="px-3 py-1.5 bg-green-50 dark:bg-green-900 border border-green-300 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-800 text-green-700 dark:text-green-300 rounded-md shadow-sm flex items-center animate-pulse"
              title="Create Component from Selected Element"
            >
              <PlusSquare size={16} className="mr-1.5" />
              <span className="text-sm">Create Component</span>
            </button>
          )}
          
          <div className="h-5 border-l border-gray-300 dark:border-gray-700 mx-1"></div>
          <button
            onClick={undo}
            className="p-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md shadow-sm"
            title="Undo"
          >
            <ArrowLeft size={16} className="text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={redo}
            className="p-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md shadow-sm"
            title="Redo"
          >
            <ArrowRight size={16} className="text-gray-600 dark:text-gray-400" />
          </button>
          <div className="h-5 border-l border-gray-300 dark:border-gray-700 mx-1"></div>
          <button
            onClick={() => setShowFloatingToolbar(!showFloatingToolbar)}
            className={`px-3 py-1.5 border shadow-sm rounded-md flex items-center ${
              showFloatingToolbar 
                ? 'bg-blue-50 dark:bg-blue-900 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300' 
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
            title={showFloatingToolbar ? "Hide Floating Toolbar" : "Show Floating Toolbar"}
          >
            <Tool size={16} className="mr-1.5" />
            <span className="text-sm">Toolbar</span>
          </button>
        
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {/* Indicator for selected component */}
        {selectedLibraryComponent && (
          <div className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-800 rounded-md flex items-center">
            <span className="text-xs text-blue-700 dark:text-blue-300 mr-2">Component selected:</span>
            <span className="text-sm font-medium">Ready for placement</span>
            <button 
              onClick={handleStartPlacement}
              className="ml-2 px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-md flex items-center"
              title="Place component"
            >
              <MousePointer size={14} className="mr-1" />
              <span className="text-xs">Place</span>
            </button>
            <button 
              onClick={() => setSelectedLibraryComponent(null)}
              className="ml-2 p-0.5 rounded-full hover:bg-blue-200 dark:hover:bg-blue-700 text-blue-700 dark:text-blue-300"
            >
              <X size={14} />
            </button>
          </div>
        )}
        <div className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-md flex items-center bg-gray-50 dark:bg-gray-800">
          <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">Elements:</span>
          <span className="text-sm font-medium">{elements.length}</span>
        </div>
        {selectedElement && (
          <div className="px-3 py-1.5 border border-green-200 dark:border-green-800 rounded-md flex items-center bg-green-50 dark:bg-green-900">
            <span className="text-xs text-green-600 dark:text-green-300 mr-2">Selected:</span>
            <span className="text-sm font-medium">{selectedElement.id.substring(0, 8)}...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedToolbar;
