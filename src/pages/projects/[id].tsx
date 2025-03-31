// src/pages/projects/[id].tsx

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Layout from 'src/components/layout/Layout';
import { 
  Grid, File, Plus, Clock, Users, 
  Edit, Trash2, Download, Share, Copy, ChevronRight,
  Tool
} from 'react-feather';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import Modal from 'src/components/ui/Modal';
import { Component, Drawing, Project, Toolpath } from '@prisma/client';
import Metatags from '@/src/components/layout/Metatags';
import { cn } from '@/src/lib/utils';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24
    }
  }
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6 } }
};

export default function ProjectDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;
  
  const [project, setProject] = useState<Project | null>(null);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [toolpaths, setToolpaths] = useState<Toolpath[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showNewDrawingModal, setShowNewDrawingModal] = useState(false);
  const [showNewComponentModal, setShowNewComponentModal] = useState(false);
  const [showNewToolpathModal, setShowNewToolpathModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'mill',
    operationType: 'contour'
  });
  const [activeTab, setActiveTab] = useState<'drawings' | 'components' | 'toolpaths'>('drawings');

  useEffect(() => {
    if (id && typeof id === 'string') {
      fetchProjectData(id);
    }
  }, [id]);
  
  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }
  
  const fetchProjectData = async (projectId: string) => {
    setIsLoading(true);
    try {
      // Fetch project details
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch project');
      }
      const data = await response.json();
      setProject(data);
      setFormData({
        name: data.name,
        description: data.description || '',
        type: 'mill',
        operationType: 'contour'
      });
      
      // Fetch project drawings
      const drawingsResponse = await fetch(`/api/projects/${projectId}/drawings`);
      if (drawingsResponse.ok) {
        const drawingsData = await drawingsResponse.json();
        setDrawings(drawingsData);
      }
      
      // Fetch project components
      const componentsResponse = await fetch(`/api/projects/${projectId}/components`);
      if (componentsResponse.ok) {
        const componentsData = await componentsResponse.json();
        setComponents(componentsData);
      }

      // Fetch project toolpaths
      const toolpathsResponse = await fetch(`/api/projects/${projectId}/toolpaths`);
      if (toolpathsResponse.ok) {
        const toolpathsData = await toolpathsResponse.json();
        setToolpaths(toolpathsData);
      }
    } catch (error) {
      console.error('Error fetching project data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!project) return;
    
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update project');
      }
      
      const updatedProject = await response.json();
      setProject(updatedProject);
      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating project:', error);
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete project');
      }
      
      router.push('/projects');
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  const handleCreateDrawing = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!project) return;
    
    try {
      const response = await fetch(`/api/projects/${project.id}/drawings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create drawing');
      }
      
      const newDrawing = await response.json();
      setDrawings(prev => [newDrawing, ...prev]);
      setShowNewDrawingModal(false);
      
      // Navigate to the CAD editor with the new drawing
      router.push(`/cad?drawingId=${newDrawing.id}`);
    } catch (error) {
      console.error('Error creating drawing:', error);
    }
  };

  const handleCreateComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!project) return;
    
    try {
      const response = await fetch(`/api/projects/${project.id}/components`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          type: 'custom'
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create component');
      }
      
      const newComponent = await response.json();
      setComponents(prev => [newComponent, ...prev]);
      setShowNewComponentModal(false);
      
      // Navigate to the component editor
      router.push(`/components/${newComponent.id}`);
    } catch (error) {
      console.error('Error creating component:', error);
    }
  };

  const handleCreateToolpath = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!project) return;
    
    try {
      const response = await fetch(`/api/projects/${project.id}/toolpaths`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          type: formData.type,
          operationType: formData.operationType,
          data: {},
          gcode: '',
          isPublic: false
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create toolpath');
      }
      
      const newToolpath = await response.json();
      setToolpaths(prev => [newToolpath, ...prev]);
      setShowNewToolpathModal(false);
      
      // Navigate to the CAM editor
      router.push(`/cam?toolpathId=${newToolpath.id}`);
    } catch (error) {
      console.error('Error creating toolpath:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const openModal = (modalType: 'drawing' | 'component') => {
    setFormData({ name: '', description: '', type: 'mill', operationType: 'contour' });
    if (modalType === 'drawing') {
      setShowNewDrawingModal(true);
    } else {
      setShowNewComponentModal(true);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-full min-h-[60vh]">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-16 h-16 border-4 border-blue-200 rounded-full border-t-blue-600 mb-4"
          />
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-lg text-gray-600"
          >
            Loading project...
          </motion.p>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <motion.div 
          className="flex flex-col items-center justify-center p-6 text-center h-full min-h-[60vh]"
          initial="hidden"
          animate="visible"
          variants={fadeIn}
        >
          <motion.div 
            className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4"
            whileHover={{ scale: 1.05 }}
          >
            <File size={32} className="text-gray-400" />
          </motion.div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Project Not Found</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md">The project you are looking for doesnt exist or you dont have access to it.</p>
          <motion.button
            onClick={() => router.push('/projects')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ChevronRight size={16} className="mr-1" />
            Back to Projects
          </motion.button>
        </motion.div>
      </Layout>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <Metatags title={project.name}
      description={project.description || ''}
      ogImage={`/api/og-image/project/${project.id}?title=${encodeURIComponent(project.name)}`} />
      <Layout>
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          {/* Project header */}
          <motion.div 
            className="bg-white dark:bg-gray-900 shadow-md rounded-xl p-4 md:p-6 mb-6 overflow-hidden"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{project.name}</h1>
                {project.description && (
                  <p className="text-gray-600 dark:text-gray-300 mt-2">{project.description}</p>
                )}
                <div className="mt-4 flex flex-wrap items-center text-sm text-gray-500 dark:text-gray-400 gap-4">
                  <div className="flex items-center">
                    <Clock size={16} className="mr-1.5" />
                    <span>Updated: {formatDate(project.updatedAt as unknown as string)}</span>
                  </div>
                  <div className="flex items-center">
                    <Users size={16} className="mr-1.5" />
                    <span>
                      {project.organizationId
                        ? `${project.organizationId} (Organization)`
                        : `${project.ownerId || project.ownerId} (Personal)`}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
                <motion.button
                  onClick={() => setShowEditModal(true)}
                  className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Edit size={16} className="mr-1.5" />
                  Edit
                </motion.button>
                <motion.button
                  onClick={() => setShowDeleteModal(true)}
                  className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-red-600 dark:text-red-400 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Trash2 size={16} className="mr-1.5" />
                  Delete
                </motion.button>
              </div>
            </div>
          </motion.div>
          
          {/* Project content */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
              <nav className="-mb-px flex">
                <motion.button
                  className={cn(
                    "px-4 py-2 font-medium text-sm focus:outline-none relative",
                    activeTab === 'drawings'
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  )}
                  onClick={() => setActiveTab('drawings')}
                  whileHover={{ y: -1 }}
                  whileTap={{ y: 1 }}
                >
                  Drawings
                  {activeTab === 'drawings' && (
                    <motion.div 
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" 
                      layoutId="activeTabIndicator"
                    />
                  )}
                </motion.button>
                <motion.button
                  className={cn(
                    "ml-8 px-4 py-2 font-medium text-sm focus:outline-none relative",
                    activeTab === 'components'
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  )}
                  onClick={() => setActiveTab('components')}
                  whileHover={{ y: -1 }}
                  whileTap={{ y: 1 }}
                >
                  Components
                  {activeTab === 'components' && (
                    <motion.div 
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" 
                      layoutId="activeTabIndicator"
                    />
                  )}
                </motion.button>
                <motion.button
                  className={cn(
                    "ml-8 px-4 py-2 font-medium text-sm focus:outline-none relative",
                    activeTab === 'toolpaths'
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  )}
                  onClick={() => setActiveTab('toolpaths')}
                  whileHover={{ y: -1 }}
                  whileTap={{ y: 1 }}
                >
                  Toolpaths
                  {activeTab === 'toolpaths' && (
                    <motion.div 
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" 
                      layoutId="activeTabIndicator"
                    />
                  )}
                </motion.button>
              </nav>
            </div>
            
            {/* Tab content */}
            <AnimatePresence mode="wait">
              {activeTab === 'drawings' && (
                <motion.div
                  key="drawings-tab"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-3">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">Project Drawings</h2>
                    <motion.button
                      onClick={() => openModal('drawing')}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center shadow-sm"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Plus size={16} className="mr-1.5" />
                      New Drawing
                    </motion.button>
                  </div>
                  
                  {drawings.length === 0 ? (
                    <motion.div 
                      className="bg-white dark:bg-gray-900 shadow-md rounded-xl p-6 text-center"
                      variants={fadeIn}
                      initial="hidden"
                      animate="visible"
                    >
                      <motion.div 
                        className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4"
                        whileHover={{ scale: 1.05, rotate: 5 }}
                      >
                        <File size={30} className="text-gray-400 dark:text-gray-500" />
                      </motion.div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No drawings yet</h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md mx-auto">
                        Create your first drawing to start designing in the CAD editor.
                      </p>
                      <motion.button
                        onClick={() => openModal('drawing')}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Create Drawing
                      </motion.button>
                    </motion.div>
                  ) : (
                    <motion.div 
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      {drawings.map((drawing, index) => (
                        <motion.div
                          key={drawing.id}
                          variants={itemVariants}
                          custom={index}
                          className="bg-white dark:bg-gray-900 shadow-md rounded-xl overflow-hidden cursor-pointer border border-gray-100 dark:border-gray-800 group"
                          whileHover={{ y: -4, boxShadow: "0 12px 24px -10px rgba(0, 0, 0, 0.15)" }}
                          onClick={() => router.push(`/cad?drawingId=${drawing.id}`)}
                        >
                          <div className="h-40 sm:h-48 bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                            {drawing.thumbnail ? (
                              <motion.img 
                                src={drawing.thumbnail} 
                                alt={drawing.name} 
                                className="h-full w-full object-contain"
                                initial={{ scale: 1 }}
                                whileHover={{ scale: 1.05 }}
                                transition={{ duration: 0.3 }}
                              />
                            ) : (
                              <motion.div
                                whileHover={{ rotate: 10, scale: 1.1 }}
                                className="p-6 bg-gray-200 dark:bg-gray-900 rounded-full"
                              >
                                <Grid size={36} className="text-gray-400 dark:text-gray-500" />
                              </motion.div>
                            )}
                          </div>
                          <div className="p-4">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{drawing.name}</h3>
                            {drawing.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{drawing.description}</p>
                            )}
                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                              Updated: {formatDate(drawing.updatedAt as unknown as string)}
                            </div>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex justify-end space-x-2">
                            <motion.button 
                              onClick={(e) => {
                                e.stopPropagation();
                                // Handle edit drawing
                              }}
                              className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
                              whileHover={{ scale: 1.15 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <Edit size={16} />
                            </motion.button>
                            <motion.button 
                              onClick={(e) => {
                                e.stopPropagation();
                                // Handle duplicate drawing
                              }}
                              className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
                              whileHover={{ scale: 1.15 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <Copy size={16} />
                            </motion.button>
                            <motion.button 
                              onClick={(e) => {
                                e.stopPropagation();
                                // Handle download drawing
                              }}
                              className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md"
                              whileHover={{ scale: 1.15 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <Download size={16} />
                            </motion.button>
                            <motion.button 
                              onClick={(e) => {
                                e.stopPropagation();
                                // Handle delete drawing
                              }}
                              className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                              whileHover={{ scale: 1.15 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <Trash2 size={16} />
                            </motion.button>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </motion.div>
              )}
              
              {activeTab === 'components' && (
                <motion.div
                  key="components-tab"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-3">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">Project Components</h2>
                    <motion.button
                      onClick={() => openModal('component')}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center shadow-sm"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Plus size={16} className="mr-1.5" />
                      New Component
                    </motion.button>
                  </div>
                  
                  {components.length === 0 ? (
                    <motion.div 
                      className="bg-white dark:bg-gray-900 shadow-md rounded-xl p-6 text-center"
                      variants={fadeIn}
                      initial="hidden"
                      animate="visible"
                    >
                      <motion.div 
                        className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4"
                        whileHover={{ scale: 1.05, rotate: 5 }}
                      >
                        <File size={30} className="text-gray-400 dark:text-gray-500" />
                      </motion.div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No components yet</h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md mx-auto">
                        Create reusable components to use across your CAD drawings.
                      </p>
                      <motion.button
                        onClick={() => openModal('component')}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Create Component
                      </motion.button>
                    </motion.div>
                  ) : (
                    <motion.div 
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      {components.map((component, index) => (
                        <motion.div
                          key={component.id}
                          variants={itemVariants}
                          custom={index}
                          className="bg-white dark:bg-gray-900 shadow-md rounded-xl overflow-hidden cursor-pointer border border-gray-100 dark:border-gray-800 group"
                          whileHover={{ y: -4, boxShadow: "0 12px 24px -10px rgba(0, 0, 0, 0.15)" }}
                          onClick={() => router.push(`/components/${component.id}`)}
                        >
                          <div className="h-32 sm:h-40 bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                            {component.thumbnail ? (
                              <motion.img 
                                src={component.thumbnail} 
                                alt={component.name} 
                                className="h-full w-full object-contain"
                                initial={{ scale: 1 }}
                                whileHover={{ scale: 1.05 }}
                                transition={{ duration: 0.3 }}
                              />
                            ) : (
                              <motion.div
                                whileHover={{ rotate: 10, scale: 1.1 }}
                                className="p-5 bg-gray-200 dark:bg-gray-900 rounded-full"
                              >
                                <File size={32} className="text-gray-400 dark:text-gray-500" />
                              </motion.div>
                            )}
                          </div>
                          <div className="p-4">
                            <h3 className="text-md font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{component.name}</h3>
                            {component.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">{component.description}</p>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </motion.div>
              )}

              {activeTab === 'toolpaths' && (
                <motion.div
                  key="toolpaths-tab"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-3">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">Project Toolpaths</h2>
                    <motion.button
                      onClick={() => setShowNewToolpathModal(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-center shadow-sm"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Plus size={16} className="mr-1.5" />
                      New Toolpath
                    </motion.button>
                  </div>
                  
                  {toolpaths.length === 0 ? (
                    <motion.div 
                      className="bg-white dark:bg-gray-900 shadow-md rounded-xl p-6 text-center"
                      variants={fadeIn}
                      initial="hidden"
                      animate="visible"
                    >
                      <motion.div 
                        className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4"
                        whileHover={{ scale: 1.05, rotate: 5 }}
                      >
                        <Tool size={30} className="text-gray-400 dark:text-gray-500" />
                      </motion.div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No toolpaths yet</h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md mx-auto">
                        Create your first toolpath to start machining your designs.
                      </p>
                      <motion.button
                        onClick={() => setShowNewToolpathModal(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Create Toolpath
                      </motion.button>
                    </motion.div>
                  ) : (
                    <motion.div 
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      {toolpaths.map((toolpath, index) => (
                        <motion.div
                          key={toolpath.id}
                          variants={itemVariants}
                          custom={index}
                          className="bg-white dark:bg-gray-900 shadow-md rounded-xl overflow-hidden cursor-pointer border border-gray-100 dark:border-gray-800 group"
                          whileHover={{ y: -4, boxShadow: "0 12px 24px -10px rgba(0, 0, 0, 0.15)" }}
                          onClick={() => router.push(`/cam?toolpathId=${toolpath.id}`)}
                        >
                          <div className="h-32 sm:h-40 bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                            <motion.div
                              whileHover={{ rotate: 10, scale: 1.1 }}
                              className="p-5 bg-gray-200 dark:bg-gray-900 rounded-full"
                            >
                              <Tool size={32} className="text-gray-400 dark:text-gray-500" />
                            </motion.div>
                          </div>
                          <div className="p-4">
                            <h3 className="text-md font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{toolpath.name}</h3>
                            {toolpath.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">{toolpath.description}</p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 rounded-full">
                                {toolpath.type || 'mill'}
                              </span>
                              <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 rounded-full">
                                {toolpath.operationType || 'contour'}
                              </span>
                            </div>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex justify-end space-x-2">
                            <motion.button 
                              onClick={(e) => {
                                e.stopPropagation();
                                // Handle edit toolpath
                              }}
                              className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
                              whileHover={{ scale: 1.15 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <Edit size={16} />
                            </motion.button>
                            <motion.button 
                              onClick={(e) => {
                                e.stopPropagation();
                                // Handle download gcode
                              }}
                              className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md"
                              whileHover={{ scale: 1.15 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <Download size={16} />
                            </motion.button>
                            <motion.button 
                              onClick={(e) => {
                                e.stopPropagation();
                                // Handle delete toolpath
                              }}
                              className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                              whileHover={{ scale: 1.15 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <Trash2 size={16} />
                            </motion.button>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
        
        {/* Edit Project Modal */}
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Edit Project"
          size="sm"
          preventBackdropClose={true}
        >
          <form onSubmit={handleUpdateProject}>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (optional)
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  value={formData.description}
                  onChange={handleChange}
                ></textarea>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <motion.button
                type="button"
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                onClick={() => setShowEditModal(false)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
              <motion.button
                type="submit"
                className="px-4 py-2 bg-blue-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Save Changes
              </motion.button>
            </div>
          </form>
        </Modal>
        
        {/* Delete Project Modal */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete Project"
          size="sm"
        >
          <div className="p-1">
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Are you sure you want to delete this project? This action cannot be undone and will delete all drawings and components associated with this project.
            </p>
            
            <div className="flex justify-end space-x-3">
              <motion.button
                type="button"
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                onClick={() => setShowDeleteModal(false)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
              <motion.button
                type="button"
                className="px-4 py-2 bg-red-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 shadow-sm"
                onClick={handleDeleteProject}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Delete Project
              </motion.button>
            </div>
          </div>
        </Modal>
        
        {/* New Drawing Modal */}
        <Modal
          isOpen={showNewDrawingModal}
          onClose={() => setShowNewDrawingModal(false)}
          title="Create New Drawing"
          size="sm"
          preventBackdropClose={true}
        >
          <form onSubmit={handleCreateDrawing}>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Drawing Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (optional)
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  value={formData.description}
                  onChange={handleChange}
                ></textarea>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <motion.button
                type="button"
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                onClick={() => setShowNewDrawingModal(false)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
              <motion.button
                type="submit"
                className="px-4 py-2 bg-blue-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Create & Open
              </motion.button>
            </div>
          </form>
        </Modal>
        
        {/* New Component Modal */}
        <Modal
          isOpen={showNewComponentModal}
          onClose={() => setShowNewComponentModal(false)}
          title="Create New Component"
          size="md"
          preventBackdropClose
        >
          <form onSubmit={handleCreateComponent}>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Component Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (optional)
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  value={formData.description}
                  onChange={handleChange}
                ></textarea>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <motion.button
                type="button"
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                onClick={() => setShowNewComponentModal(false)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
              <motion.button
                type="submit"
                className="px-4 py-2 bg-blue-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Create & Open
              </motion.button>
            </div>
          </form>
        </Modal>

        {/* New Toolpath Modal */}
        <Modal
          isOpen={showNewToolpathModal}
          onClose={() => setShowNewToolpathModal(false)}
          title="Create New Toolpath"
          size="md"
          preventBackdropClose
        >
          <form onSubmit={handleCreateToolpath}>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Toolpath Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (optional)
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  value={formData.description}
                  onChange={handleChange}
                ></textarea>
              </div>

              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Machine Type
                </label>
                <select
                  id="type"
                  name="type"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  value={formData.type}
                  onChange={handleChange}
                >
                  <option value="mill">Mill</option>
                  <option value="lathe">Lathe</option>
                  <option value="3dprinter">3D Printer</option>
                </select>
              </div>

              <div>
                <label htmlFor="operationType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Operation Type
                </label>
                <select
                  id="operationType"
                  name="operationType"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  value={formData.operationType}
                  onChange={handleChange}
                >
                  <option value="contour">Contour</option>
                  <option value="pocket">Pocket</option>
                  <option value="drill">Drill</option>
                  <option value="profile">3D Profile</option>
                </select>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <motion.button
                type="button"
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                onClick={() => setShowNewToolpathModal(false)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
              <motion.button
                type="submit"
                className="px-4 py-2 bg-blue-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Create & Open
              </motion.button>
            </div>
          </form>
        </Modal>
      </Layout>
    </MotionConfig>
  );
}

// Box component for icons
const Box = ({ className = "", ...props }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={`feather feather-box ${className}`}
    {...props}
  >
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
    <line x1="12" y1="22.08" x2="12" y2="12"></line>
  </svg>
);