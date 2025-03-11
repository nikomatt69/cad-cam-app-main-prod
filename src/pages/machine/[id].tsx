import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Layout from '@/src/components/layout/Layout';
import { Save, ArrowLeft, Trash2, ArrowRight, Settings, AlertCircle } from 'react-feather';
import { getMachineConfigById, updateMachineConfig, deleteMachineConfig } from '@/src/lib/api/machineConfigApi';
import Loading from '@/src/components/ui/Loading';
import Metatags from '@/src/components/layout/Metatags';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export default function MachineConfigDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;
  
  // State for machine config data and UI
  const [machineConfig, setMachineConfig] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'mill',
    maxSpindleSpeed: 10000,
    maxFeedRate: 5000,
    workVolumeX: 300,
    workVolumeY: 300,
    workVolumeZ: 100,
    controller: ''
  });

  // Fetch machine config data when component mounts or id changes
  useEffect(() => {
    if (id && typeof id === 'string') {
      fetchMachineConfig(id);
    }
  }, [status, id]);

  const fetchMachineConfig = async (configId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await getMachineConfigById(configId);
      setMachineConfig(data);
      
      // Extract config values
      const configData = data.config || {};
      
      setFormData({
        name: data.name,
        description: data.description || '',
        type: data.type || 'mill',
        maxSpindleSpeed: configData.maxSpindleSpeed || 10000,
        maxFeedRate: configData.maxFeedRate || 5000,
        workVolumeX: configData.workVolume?.x || 300,
        workVolumeY: configData.workVolume?.y || 300,
        workVolumeZ: configData.workVolume?.z || 100,
        controller: configData.controller || ''
      });
    } catch (err) {
      console.error('Error fetching machine configuration:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      
      // If machine config not found, redirect to list
      if (err instanceof Error && err.message.includes('not found')) {
        router.push('/machine');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!machineConfig) return;
    
    setIsSaving(true);
    
    try {
      // Update machine config
      const updatedConfig = await updateMachineConfig(machineConfig.id, {
        name: formData.name,
        description: formData.description,
        type: formData.type as 'mill' | 'lathe' | 'printer' | 'laser',
        config: {
          type: formData.type,
          maxSpindleSpeed: parseInt(formData.maxSpindleSpeed.toString()),
          maxFeedRate: parseInt(formData.maxFeedRate.toString()),
          workVolume: {
            x: parseInt(formData.workVolumeX.toString()),
            y: parseInt(formData.workVolumeY.toString()),
            z: parseInt(formData.workVolumeZ.toString())
          },
          controller: formData.controller
        }
      });
      
      setMachineConfig(updatedConfig);
      toast.success('Machine configuration saved successfully');
    } catch (err) {
      console.error('Error updating machine configuration:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update machine configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!machineConfig || !confirm('Are you sure you want to delete this machine configuration?')) return;
    
    setIsLoading(true);
    
    try {
      await deleteMachineConfig(machineConfig.id);
      toast.success('Machine configuration deleted successfully');
      
      // Redirect to machine-configs list after a short delay
      setTimeout(() => {
        router.push('/machine');
      }, 1500);
    } catch (err) {
      console.error('Error deleting machine configuration:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete machine configuration');
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBack = () => {
    router.push('/machine');
  };

  if (status === 'loading' || (isLoading && !error)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="w-16 h-16 border-4 border-blue-200 dark:border-blue-800 rounded-full border-t-blue-600"
        />
      </div>
    );
  }
  
  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }
  
  return (
    <>
      <Metatags title={machineConfig ? `${machineConfig.name} | Machine Configuration` : 'Machine Configuration'} />
      
      <Layout>
        <div className="flex flex-col h-full">
          {/* Header */}
          <motion.div 
            className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-4 md:px-6"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center">
                <motion.button
                  onClick={handleBack}
                  className="mr-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                  whileHover={{ scale: 1.1, backgroundColor: "rgba(0,0,0,0.05)" }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ArrowLeft size={20} />
                </motion.button>
                <div className="flex items-center">
                  {machineConfig && (
                    <motion.div 
                      className="w-8 h-8 rounded-full mr-3 bg-blue-100 dark:bg-blue-900 flex items-center justify-center"
                      whileHover={{ scale: 1.1 }}
                    >
                      <span className="text-xl">
                        {machineConfig.type === 'mill' ? '🔄' : 
                        machineConfig.type === 'lathe' ? '⚙️' :
                        machineConfig.type === 'printer' ? '🖨️' : 
                        machineConfig.type === 'laser' ? '✂️' : '🔧'}
                      </span>
                    </motion.div>
                  )}
                  <div>
                    <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {machineConfig ? machineConfig.name : 'Machine Configuration not found'}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {machineConfig ? 'Edit machine configuration' : 'Configuration may have been deleted or does not exist'}
                    </p>
                  </div>
                </div>
              </div>
              {machineConfig && (
                <div className="flex flex-wrap gap-3">
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
          {error && !machineConfig && (
            <motion.div 
              className="flex-1 flex items-center justify-center p-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
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
                  Return to Machine Configurations
                </motion.button>
              </div>
            </motion.div>
          )}
          
          {/* Machine Configuration form */}
          {machineConfig && (
            <motion.div 
              className="flex-1 overflow-auto p-6" 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <motion.div 
                className="max-w-3xl mx-auto"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <div className="bg-white dark:bg-gray-900 shadow rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800">
                  <div className="p-6">
                    <div className="mb-4">
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Configuration Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        value={formData.description}
                        onChange={handleChange}
                      ></textarea>
                    </div>
                    
                    <div className="mb-4">
                      <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Machine Type
                      </label>
                      <select
                        id="type"
                        name="type"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        value={formData.type}
                        onChange={handleChange}
                        required
                      >
                        <option value="mill">Mill</option>
                        <option value="lathe">Lathe</option>
                        <option value="printer">3D Printer</option>
                        <option value="laser">Laser Cutter</option>
                      </select>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="mb-4">
                        <label htmlFor="maxSpindleSpeed" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Max Spindle Speed (RPM)
                        </label>
                        <input
                          type="number"
                          id="maxSpindleSpeed"
                          name="maxSpindleSpeed"
                          min="0"
                          step="100"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          value={formData.maxSpindleSpeed}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      
                      <div className="mb-4">
                        <label htmlFor="maxFeedRate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Max Feed Rate (mm/min)
                        </label>
                        <input
                          type="number"
                          id="maxFeedRate"
                          name="maxFeedRate"
                          min="0"
                          step="100"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          value={formData.maxFeedRate}
                          onChange={handleChange}
                          required
                        />
                      </div>

                      <div className="mb-4">
                        <label htmlFor="controller" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Controller (optional)
                        </label>
                        <input
                          type="text"
                          id="controller"
                          name="controller"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          value={formData.controller}
                          onChange={handleChange}
                          placeholder="e.g., Mach3, LinuxCNC, Grbl"
                        />
                      </div>
                    </div>
                    
                    <div className="mb-2 mt-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Work Volume (mm)
                      </label>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="mb-4">
                        <label htmlFor="workVolumeX" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                          X (width)
                        </label>
                        <input
                          type="number"
                          id="workVolumeX"
                          name="workVolumeX"
                          min="0"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          value={formData.workVolumeX}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      
                      <div className="mb-4">
                        <label htmlFor="workVolumeY" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Y (depth)
                        </label>
                        <input
                          type="number"
                          id="workVolumeY"
                          name="workVolumeY"
                          min="0"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          value={formData.workVolumeY}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      
                      <div className="mb-4">
                        <label htmlFor="workVolumeZ" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Z (height)
                        </label>
                        <input
                          type="number"
                          id="workVolumeZ"
                          name="workVolumeZ"
                          min="0"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          value={formData.workVolumeZ}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Configuration Info</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                          <span className="block text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider mb-1">ID</span>
                          <span className="font-mono text-gray-900 dark:text-gray-200">{machineConfig.id}</span>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                          <span className="block text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider mb-1">Created</span>
                          <span className="text-gray-900 dark:text-gray-200">{new Date(machineConfig.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                          <span className="block text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider mb-1">Updated</span>
                          <span className="text-gray-900 dark:text-gray-200">{new Date(machineConfig.updatedAt).toLocaleString()}</span>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                          <span className="block text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider mb-1">Public</span>
                          <span className="text-gray-900 dark:text-gray-200">{machineConfig.isPublic ? 'Yes' : 'No'}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800 flex justify-end space-x-3">
                      <button
                        onClick={handleDelete}
                        className="flex items-center px-4 py-2 border border-gray-300 dark:border-gray-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <Trash2 size={16} className="mr-2" />
                        Delete
                      </button>
                      <button
                        onClick={handleSave}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <Save size={16} className="mr-2" />
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </div>
      </Layout>
    </>
  );
}