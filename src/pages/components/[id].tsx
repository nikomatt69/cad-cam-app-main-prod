// src/pages/components/[id].tsx
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Layout from '@/src/components/layout/Layout';
import { 
  Save, 
  ArrowLeft, 
  Code, 
  Image, 
  Info, 
  Trash2, 
  AlertCircle, 
  Check, 
  Cpu, 
  ExternalLink,
  Copy,
  Layers
} from 'react-feather';
import { fetchComponentById, updateComponent, deleteComponent } from '@/src/lib/api/components';
import Loading from '@/src/components/ui/Loading';
import { Component } from '@prisma/client';
import Metatags from '@/src/components/layout/Metatags';
import { useLocalComponentsLibraryStore } from '@/src/store/localComponentsLibraryStore';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { cn } from '@/src/lib/utils';
import toast from 'react-hot-toast';

// Animation variants
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4 } }
};

const slideUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      type: "spring", 
      stiffness: 300, 
      damping: 30 
    } 
  }
};

export default function ComponentDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;
  
  // State for component data and UI
  const [component, setComponent] = useState<Component | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('editor');
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  
  // Local library store
  const { addComponent } = useLocalComponentsLibraryStore();
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    data: '',
    type: '',
    isPublic: false,
    thumbnail: ''
  });

  // Initialize activeTab from query param if available
  useEffect(() => {
    if (router.query.tab) {
      setActiveTab(router.query.tab as string);
    } else if (router.query.preview === 'true') {
      setActiveTab('preview');
    }
  }, [router.query]);

  // Fetch component data when component mounts or id changes
  useEffect(() => {
    if (id && typeof id === 'string') {
      fetchComponent(id);
    }
  }, [status, id]);

  const fetchComponent = async (componentId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await fetchComponentById(componentId);
      setComponent(data);
      setFormData({
        name: data.name,
        description: data.description || '',
        data: JSON.stringify(data.data, null, 2),
        type: data.type || 'mechanical',
        isPublic: data.isPublic || false,
        thumbnail: data.thumbnail || ''
      });
    } catch (err) {
      console.error('Error fetching component:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      
      // If component not found, redirect to components list
      if (err instanceof Error && err.message.includes('not found')) {
        router.push('/components');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!component) return;
    
    setIsSaving(true);
    
    try {
      // Validate JSON
      let parsedData;
      try {
        parsedData = JSON.parse(formData.data);
      } catch (err) {
        toast.error('Invalid JSON data. Please check your input.');
        setIsSaving(false);
        return;
      }
      
      // Update component
      const updatedComponent = await updateComponent({
        id: component.id,
        name: formData.name,
        description: formData.description,
        type: formData.type,
        isPublic: formData.isPublic,
        
        data: parsedData
      });
      
      setComponent(updatedComponent);
      toast.success('Component saved successfully');
    } catch (err) {
      console.error('Error updating component:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update component');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!component || !confirm('Are you sure you want to delete this component?')) return;
    
    setIsLoading(true);
    
    try {
      await deleteComponent(component.id);
      toast.success('Component deleted successfully');
      
      // Redirect to components list after a short delay
      setTimeout(() => {
        router.push('/components');
      }, 1000);
    } catch (err) {
      console.error('Error deleting component:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete component');
      setIsLoading(false);
    }
  };
  
  const handleSaveToLocalLibrary = () => {
    if (!component) return;
    
    try {
      // Convert the component to local library format
      const localComponent = {
        name: component.name,
        description: component.description || '',
        type: component.type || 'mechanical',
        data: typeof component.data === 'object' ? component.data : { type: component.type || 'mechanical', version: "1.0" },
        tags: []
      };
      
      // Save to local library
      addComponent(localComponent);
      
      // Show success message
      toast.success('Component saved to local library successfully');
    } catch (err) {
      console.error('Failed to save to local library:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save to local library');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleBack = () => {
    router.push('/components');
  };
  
  const handleSendToCAD = useCallback(() => {
    if (!component) return;
    
    try {
      // Save component data for CAD to pick up
      localStorage.setItem('componentToLoadInCAD', JSON.stringify({
        id: component.id,
        name: component.name,
        data: component.data
      }));
      
      // Navigate to CAD editor
      router.push({
        pathname: '/cad',
        query: { loadComponent: component.id }
      });
      
      toast.success(`Opening ${component.name} in CAD editor`);
    } catch (err) {
      console.error('Error sending to CAD:', err);
      toast.error('Failed to send component to CAD');
    }
  }, [component, router]);
  
  const handleDuplicateComponent = async () => {
    if (!component) return;
    
    try {
      setIsLoading(true);
      
      // Create a duplicate with the same data but a new name
      const duplicateData = {
        name: `${component.name} (Copy)`,
        description: component.description,
        type: component.type,
        isPublic: false, // Default to private for the copy
        thumbnail: component.thumbnail,
        projectId: component.projectId,
        data: component.data
      };
      
      // Create the component
      const response = await fetch('/api/components', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(duplicateData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to duplicate component');
      }
      
      const duplicatedComponent = await response.json();
      
      // Show success message
      toast.success('Component duplicated successfully');
      
      // Navigate to the new component
      router.push(`/components/${duplicatedComponent.id}`);
    } catch (err) {
      console.error('Error duplicating component:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to duplicate component');
      setIsLoading(false);
    }
  };
  
  const generatePreview = () => {
    if (!component || !component.data) return;
    
    setIsGeneratingPreview(true);
    
    // Simulate preview generation (in a real app, this would call a service)
    setTimeout(() => {
      // Generate a placeholder preview (this would be a real rendering in production)
      const previewUrl = `data:image/svg+xml;base64,${btoa(
        `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
          <rect width="400" height="300" fill="#f0f0f0" />
          <text x="200" y="150" font-family="Arial" font-size="20" text-anchor="middle">
            ${component.name} Preview
          </text>
          <text x="200" y="180" font-family="Arial" font-size="12" text-anchor="middle">
            Type: ${component.type || 'Custom'}
          </text>
        </svg>`
      )}`;
      
      // Update form data with the new thumbnail
      setFormData(prev => ({
        ...prev,
        thumbnail: previewUrl
      }));
      
      setIsGeneratingPreview(false);
      toast.success('Preview generated successfully');
    }, 1500);
  };

  if (status === 'loading' || (isLoading && !error)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loading />
      </div>
    );
  }
  
  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }
  
  return (
    <MotionConfig reducedMotion="user">
      <Metatags title={component ? `${component.name} | Component Editor` : 'Component Editor'} 
      description={component?.description || ''}
      ogImage={`/api/og-image/component/${component?.id}?title=${encodeURIComponent(component?.name || '')}`}/>
      <Layout>
        <div className="flex flex-col h-full">
          {/* Header */}
          <motion.div 
            className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-4 md:px-6"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div className="flex items-center">
                <motion.button
                  onClick={handleBack}
                  className="mr-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                  whileHover={{ scale: 1.1, backgroundColor: "rgba(0,0,0,0.05)" }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ArrowLeft size={20} />
                </motion.button>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                    {component ? component.name : 'Component not found'}
                    {component?.isPublic && (
                      <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300">
                        Public
                      </span>
                    )}
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                    <span className="flex items-center">
                      <span className="mr-1">ID:</span>
                      <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs font-mono">
                        {component?.id}
                      </code>
                    </span>
                    <span className="mx-2">•</span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {component?.type || 'Custom'} Component
                    </span>
                  </p>
                </div>
              </div>
              
              {component && (
                <div className="flex flex-wrap gap-2">
                  <motion.button
                    onClick={handleSendToCAD}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 flex items-center shadow-sm"
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Cpu size={18} className="mr-2" />
                    Open in CAD
                  </motion.button>
                  <motion.button
                    onClick={handleDuplicateComponent}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center shadow-sm"
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Copy size={18} className="mr-2" />
                    Duplicate
                  </motion.button>
                  <motion.button
                    onClick={handleSaveToLocalLibrary}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center shadow-sm"
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Save size={18} className="mr-2" />
                    Save to Library
                  </motion.button>
                  <motion.button
                    onClick={handleDelete}
                    className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center"
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isSaving || isLoading}
                  >
                    <Trash2 size={18} className="mr-2" />
                    Delete
                  </motion.button>
                  <motion.button
                    onClick={handleSave}
                    disabled={isSaving || isLoading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center shadow-sm"
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Save size={18} className="mr-2" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
          
          {/* Display error */}
          {error && !component && (
            <motion.div 
              className="flex-1 flex items-center justify-center p-6"
              variants={fadeIn}
              initial="hidden"
              animate="visible"
            >
              <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle size={28} className="text-red-500 dark:text-red-400" />
                </div>
                <div className="text-red-600 dark:text-red-400 text-lg mb-4">{error}</div>
                <motion.button
                  onClick={handleBack}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-sm"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Return to Component List
                </motion.button>
              </div>
            </motion.div>
          )}
          
          {component && (
            <>
              {/* Tabs */}
              <motion.div 
                className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                <div className="flex px-4 md:px-6 overflow-x-auto">
                  <motion.button
                    className={cn(
                      "px-4 py-3 font-medium text-sm focus:outline-none relative whitespace-nowrap",
                      activeTab === 'editor'
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    )}
                    onClick={() => setActiveTab('editor')}
                    whileHover={{ y: -1 }}
                    whileTap={{ y: 1 }}
                  >
                    <div className="flex items-center">
                      <Code size={16} className="mr-2" />
                      Component Data
                    </div>
                    {activeTab === 'editor' && (
                      <motion.div 
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" 
                        layoutId="activeTabIndicator"
                      />
                    )}
                  </motion.button>
                  <motion.button
                    className={cn(
                      "px-4 py-3 font-medium text-sm focus:outline-none relative whitespace-nowrap",
                      activeTab === 'preview'
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    )}
                    onClick={() => setActiveTab('preview')}
                    whileHover={{ y: -1 }}
                    whileTap={{ y: 1 }}
                  >
                    <div className="flex items-center">
                      <img  className="mr-2 h-16 w-16" />
                      Preview
                    </div>
                    {activeTab === 'preview' && (
                      <motion.div 
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" 
                        layoutId="activeTabIndicator"
                      />
                    )}
                  </motion.button>
                  <motion.button
                    className={cn(
                      "px-4 py-3 font-medium text-sm focus:outline-none relative whitespace-nowrap",
                      activeTab === 'structure'
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    )}
                    onClick={() => setActiveTab('structure')}
                    whileHover={{ y: -1 }}
                    whileTap={{ y: 1 }}
                  >
                    <div className="flex items-center">
                      <Layers size={16} className="mr-2" />
                      Structure
                    </div>
                    {activeTab === 'structure' && (
                      <motion.div 
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" 
                        layoutId="activeTabIndicator"
                      />
                    )}
                  </motion.button>
                  <motion.button
                    className={cn(
                      "px-4 py-3 font-medium text-sm focus:outline-none relative whitespace-nowrap",
                      activeTab === 'properties'
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    )}
                    onClick={() => setActiveTab('properties')}
                    whileHover={{ y: -1 }}
                    whileTap={{ y: 1 }}
                  >
                    <div className="flex items-center">
                      <Info size={16} className="mr-2" />
                      Properties
                    </div>
                    {activeTab === 'properties' && (
                      <motion.div 
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" 
                        layoutId="activeTabIndicator"
                      />
                    )}
                  </motion.button>
                </div>
              </motion.div>
              
              {/* Main content */}
              <div className="flex-1 overflow-auto p-4 md:p-6">
                <AnimatePresence mode="wait">
                  {activeTab === 'editor' && (
                    <motion.div 
                      key="editor"
                      className="h-full"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.3 }}
                    >
                      <textarea
                        name="data"
                        className="w-full h-full min-h-[400px] border border-gray-300 dark:border-gray-700 rounded-lg p-4 font-mono text-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none shadow-sm"
                        value={formData.data}
                        onChange={handleChange}
                        spellCheck={false}
                      ></textarea>
                    </motion.div>
                  )}
                  
                  {activeTab === 'preview' && (
                    <motion.div 
                      key="preview"
                      className="h-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <h3 className="font-medium text-gray-900 dark:text-white">Component Preview</h3>
                        <motion.button
                          onClick={generatePreview}
                          disabled={isGeneratingPreview}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {isGeneratingPreview ? (
                            <>
                              <motion.div 
                                className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                              />
                              Generating...
                            </>
                          ) : (
                            <>
                              <img  className="mr-2 h-14 w-14" />
                              Generate Preview
                            </>
                          )}
                        </motion.button>
                      </div>
                      
                      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] bg-gray-50 dark:bg-gray-900">
                        {formData.thumbnail ? (
                          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 max-w-md">
                            <img 
                              src={formData.thumbnail} 
                              alt={formData.name} 
                              className="max-w-full h-auto max-h-[300px] object-contain mx-auto"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJmZWF0aGVyIGZlYXRoZXItaW1hZ2UiPjxyZWN0IHg9IjMiIHk9IjMiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgcng9IjIiIHJ5PSIyIj48L3JlY3Q+PGNpcmNsZSBjeD0iOC41IiBjeT0iOC41IiByPSIxLjUiPjwvY2lyY2xlPjxwb2x5bGluZSBwb2ludHM9IjIxIDE1IDE2IDEwIDUgMjEiPjwvcG9seWxpbmU+PC9zdmc+';
                              }}
                            />
                            <div className="mt-4 flex justify-between items-center">
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Thumbnail URL:
                              </p>
                              <div className="flex items-center">
                                <input
                                  type="text"
                                  name="thumbnail"
                                  value={formData.thumbnail}
                                  onChange={handleChange}
                                  className="text-xs border border-gray-300 dark:border-gray-700 rounded px-2 py-1 w-64 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center p-8">
                            <motion.div 
                              className="mx-auto w-32 h-32 bg-gray-200 dark:bg-gray-900 rounded-full flex items-center justify-center mb-4"
                              animate={{ 
                                rotate: [0, 5, 0, -5, 0],
                                scale: [1, 1.02, 1, 1.02, 1]
                              }}
                              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                            >
                              <img  className="text-gray-400 dark:text-gray-500 h-46 w-46" />
                            </motion.div>
                            <p className="text-gray-500 dark:text-gray-400 mb-4">No preview available</p>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                              Generate a preview of this component or add a thumbnail URL below
                            </p>
                            <div className="flex items-center justify-center">
                              <input
                                type="text"
                                name="thumbnail"
                                value={formData.thumbnail}
                                onChange={handleChange}
                                placeholder="Enter thumbnail URL..."
                                className="border border-gray-300 dark:border-gray-700 rounded-l-md px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              />
                              <button
                                onClick={() => setFormData(prev => ({ ...prev, thumbnail: prev.thumbnail }))}
                                className="bg-blue-600 text-white px-3 py-2 rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                Set
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                  
                  {activeTab === 'structure' && (
                    <motion.div 
                      key="structure"
                      className="h-full"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                          <h3 className="font-medium text-gray-900 dark:text-white">Component Structure</h3>
                        </div>
                        
                        <div className="p-6">
                          {component.data && typeof component.data === 'object' ? (
                            <div className="grid md:grid-cols-2 gap-6">
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Component Metadata</h4>
                                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md border border-gray-200 dark:border-gray-700">
                                  <div className="space-y-2">
                                    <div className="flex justify-between">
                                      <span className="text-sm text-gray-500 dark:text-gray-400">Type:</span>
                                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        {(component.data as any).type || 'Unknown'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-sm text-gray-500 dark:text-gray-400">Version:</span>
                                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        {(component.data as any).version || 'Unknown'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-sm text-gray-500 dark:text-gray-400">Element Count:</span>
                                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        {(component.data as any).elements?.length || 
                                         (component.data as any).geometry?.elements?.length || 
                                         'N/A'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Properties</h4>
                                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md border border-gray-200 dark:border-gray-700">
                                  {(component.data as any).properties && 
                                   Object.keys((component.data as any).properties).length > 0 ? (
                                    <div className="space-y-2">
                                      {Object.entries((component.data as any).properties).map(([key, value]) => (
                                        <div key={key} className="flex justify-between">
                                          <span className="text-sm text-gray-500 dark:text-gray-400">{key}:</span>
                                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                                            {String(value)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                      No properties defined
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <p className="text-gray-500 dark:text-gray-400">
                              Unable to display component structure. The data may be in an invalid format.
                            </p>
                          )}
                          
                          {/* Usage section */}
                          <div className="mt-6">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Using This Component</h4>
                            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md border border-gray-200 dark:border-gray-700">
                              <div className="flex items-center mb-3">
                                <Cpu size={16} className="text-purple-600 dark:text-purple-400 mr-2" />
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  Integration Options
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button
                                  onClick={handleSendToCAD}
                                  className="flex items-center justify-between px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
                                >
                                  <span className="text-sm text-gray-700 dark:text-gray-300">Open in CAD Editor</span>
                                  <ExternalLink size={14} className="text-gray-500 dark:text-gray-400" />
                                </button>
                                
                                <button
                                  onClick={handleSaveToLocalLibrary}
                                  className="flex items-center justify-between px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
                                >
                                  <span className="text-sm text-gray-700 dark:text-gray-300">Add to Local Library</span>
                                  <Save size={14} className="text-gray-500 dark:text-gray-400" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  {activeTab === 'properties' && (
                    <motion.div 
                      key="properties"
                      className="max-w-3xl mx-auto"
                      variants={slideUp}
                      initial="hidden"
                      animate="visible"
                    >
                      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                        <div className="p-6">
                          <div className="mb-4">
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Component Name
                            </label>
                            <input
                              type="text"
                              id="name"
                              name="name"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                              value={formData.name}
                              onChange={handleChange}
                              required
                            />
                          </div>
                          
                          <div className="mb-4">
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Description
                            </label>
                            <textarea
                              id="description"
                              name="description"
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                              value={formData.description}
                              onChange={handleChange}
                            ></textarea>
                          </div>
                          
                          <div className="mb-4">
                            <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Component Type
                            </label>
                            <select
                              id="type"
                              name="type"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                              value={formData.type}
                              onChange={handleChange}
                            >
                              <option value="mechanical">Mechanical</option>
                              <option value="electronic">Electronic</option>
                              <option value="fixture">Fixture</option>
                              <option value="tool">Tool</option>
                              <option value="structural">Structural</option>
                              <option value="enclosure">Enclosure</option>
                              <option value="custom">Custom</option>
                            </select>
                          </div>
                          
                          <div className="flex items-center mb-6">
                            <input
                              type="checkbox"
                              id="isPublic"
                              name="isPublic"
                              checked={formData.isPublic}
                              onChange={(e) => setFormData(prev => ({...prev, isPublic: e.target.checked}))}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-700 rounded"
                            />
                            <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                              Make component public (visible to all users)
                            </label>
                          </div>
                          
                          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Component Info</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                                <span className="block text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider mb-1">Component ID</span>
                                <span className="font-mono text-gray-900 dark:text-gray-200 break-all">{component.id}</span>
                              </div>
                              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                                <span className="block text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider mb-1">Project ID</span>
                                <span className="text-gray-900 dark:text-gray-200 break-all">{component.projectId}</span>
                              </div>
                              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                                <span className="block text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider mb-1">Created</span>
                                <span className="text-gray-900 dark:text-gray-200">{new Date(component.createdAt).toLocaleString()}</span>
                              </div>
                              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                                <span className="block text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider mb-1">Updated</span>
                                <span className="text-gray-900 dark:text-gray-200">{new Date(component.updatedAt).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </Layout>
    </MotionConfig>
  );
}
