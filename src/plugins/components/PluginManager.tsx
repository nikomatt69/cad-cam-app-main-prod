import React, { useState, useEffect } from 'react';
import { usePluginStore } from '../core/PluginStore';
import { PluginManager as PluginManagerClass } from '../core/PluginManager';
import { PluginRegistry } from '../core/PluginRegistry';
import { PluginCard } from './PluginCard';
import { Upload, Search, AlertCircle, Package } from 'react-feather';
import { PluginManifest } from '../core/types';

interface Plugin {
  manifest: PluginManifest;
}

interface AvailablePlugin extends Omit<PluginManifest, 'entryPoint' | 'dependencies' | 'permissions' | 'extensionPoints' | 'minAppVersion'> {}

export function PluginManager() {
  const { plugins, installedPlugins, activePlugins } = usePluginStore();
  const [availablePlugins, setAvailablePlugins] = useState<AvailablePlugin[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('installed');
  const [error, setError] = useState<string | null>(null);
  
  const pluginManager = PluginManagerClass.getInstance();
  const pluginRegistry = PluginRegistry.getInstance();
  
  // Load available plugins from the registry
  useEffect(() => {
    const fetchAvailablePlugins = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch from the API
        const response = await fetch('/api/plugins/registry');
        if (response.ok) {
          const data = await response.json();
          setAvailablePlugins(data);
        } else {
          setError('Failed to fetch available plugins');
        }
      } catch (error) {
        console.error('Failed to fetch available plugins:', error);
        setError('An error occurred while fetching plugins');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (activeTab === 'available') {
      fetchAvailablePlugins();
    }
  }, [activeTab]);
  
  // Filter plugins based on search query
  const filteredInstalledPlugins = installedPlugins
    .filter(id => {
      const plugin = plugins[id];
      if (!plugin) return false;
      
      const searchLower = searchQuery.toLowerCase();
      return (
        plugin.manifest.name.toLowerCase().includes(searchLower) ||
        plugin.manifest.description?.toLowerCase().includes(searchLower) ||
        plugin.manifest.author?.toLowerCase().includes(searchLower)
      );
    })
    .map(id => plugins[id]);
  
  const filteredAvailablePlugins = availablePlugins
    .filter(plugin => {
      const searchLower = searchQuery.toLowerCase();
      return (
        plugin.name.toLowerCase().includes(searchLower) ||
        plugin.description?.toLowerCase().includes(searchLower) ||
        plugin.author?.toLowerCase().includes(searchLower)
      );
    });
  
  // Handle installing a plugin
  const handleInstall = async (plugin: AvailablePlugin) => {
    setIsLoading(true);
    setError(null);
    try {
      // Convert AvailablePlugin to PluginManifest with default values
      const manifest: PluginManifest = {
        ...plugin,
        entryPoint: 'index.js',
        dependencies: {},
        permissions: [],
        extensionPoints: [],
        minAppVersion: '1.0.0'
      };
      
      const success = await pluginManager.installPlugin(manifest);
      
      if (success) {
        // Refresh the list of available plugins
        const updated = availablePlugins.filter(p => p.id !== plugin.id);
        setAvailablePlugins(updated);
      } else {
        setError('Failed to install plugin');
      }
    } catch (error) {
      console.error('Failed to install plugin:', error);
      setError('An error occurred while installing the plugin');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle enabling/disabling a plugin
  const handleTogglePlugin = async (id: string, enabled: boolean) => {
    setIsLoading(true);
    setError(null);
    try {
      if (enabled) {
        await pluginManager.enablePlugin(id);
      } else {
        await pluginManager.disablePlugin(id);
      }
    } catch (error) {
      console.error(`Failed to ${enabled ? 'enable' : 'disable'} plugin:`, error);
      setError(`Failed to ${enabled ? 'enable' : 'disable'} the plugin`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle uninstalling a plugin
  const handleUninstall = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await pluginManager.uninstallPlugin(id);
    } catch (error) {
      console.error('Failed to uninstall plugin:', error);
      setError('Failed to uninstall the plugin');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle file upload for plugin installation
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    setError(null);
    try {
      await pluginManager.installPluginFromFile(file);
    } catch (error) {
      console.error('Failed to install plugin from file:', error);
      setError('Failed to install plugin from file');
    } finally {
      setIsLoading(false);
      // Reset the input
      event.target.value = '';
    }
  };
  
  return (
    <div className="w-full">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 px-6 py-4 border-b dark:border-gray-700">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center mb-4 md:mb-0">
            <Package className="h-6 w-6 text-blue-500 mr-2" />
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Plugin Manager</h2>
          </div>
          
          {/* Search */}
          <div className="w-full md:w-64 relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5"
              placeholder="Search plugins..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 m-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}
      
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex">
          <button
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'installed'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('installed')}
          >
            Installed ({installedPlugins.length})
          </button>
          <button
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'available'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('available')}
          >
            Available
          </button>
        </div>
      </div>
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}
      
      {/* Content */}
      <div className="p-6">
        {activeTab === 'installed' ? (
          <>
            {filteredInstalledPlugins.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">No plugins installed</h3>
                <p className="mb-4">Get started by installing a plugin from the Available tab or upload a plugin file.</p>
                <label className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md cursor-pointer transition-colors">
                  <Upload className="h-4 w-4 mr-2" />
                  <span>Upload Plugin</span>
                  <input 
                    type="file" 
                    accept=".json,.zip" 
                    className="hidden" 
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredInstalledPlugins.map(plugin => (
                  <PluginCard
                    key={plugin.manifest.id}
                    plugin={plugin}
                    isActive={activePlugins.includes(plugin.manifest.id)}
                    onToggle={(enabled) => handleTogglePlugin(plugin.manifest.id, enabled)}
                    onUninstall={() => handleUninstall(plugin.manifest.id)}
                  />
                ))}
              </div>
            )}
            
            {/* Upload plugin section */}
            <div className="mt-8 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
              <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-white">Install from file</h3>
              <div className="flex items-center">
                <label className="flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md cursor-pointer transition-colors">
                  <Upload className="h-4 w-4 mr-2" />
                  <span>Choose File</span>
                  <input 
                    type="file" 
                    accept=".json,.zip" 
                    className="hidden" 
                    onChange={handleFileUpload}
                  />
                </label>
                <span className="ml-4 text-sm text-gray-500 dark:text-gray-400">
                  Accepts .json manifest or .zip plugin package
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            {filteredAvailablePlugins.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                {isLoading ? (
                  <p>Loading available plugins...</p>
                ) : (
                  <>
                    <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium mb-2">No plugins available</h3>
                    <p>No plugins match your search or are available in the registry.</p>
                  </>
                )}
              </div>
            ) : (
              filteredAvailablePlugins.map(plugin => (
                <div key={plugin.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 flex flex-col md:flex-row md:items-center md:justify-between">
                  <div className="mb-4 md:mb-0">
                    <h3 className="text-lg font-medium text-gray-800 dark:text-white">{plugin.name}</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{plugin.description}</p>
                    <div className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                      Version: {plugin.version} | Author: {plugin.author}
                    </div>
                  </div>
                  <button
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                    onClick={() => handleInstall(plugin)}
                    disabled={isLoading}
                  >
                    Install
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}