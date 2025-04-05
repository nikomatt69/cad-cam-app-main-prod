import React, { useState, useEffect } from 'react';
import { usePluginStore } from '../core/PluginStore';
import { PluginManager } from '../core/PluginManager';
import { X } from 'react-feather';

interface PluginSettingsProps {
  pluginId: string;
  onClose: () => void;
}

export function PluginSettings({ pluginId, onClose }: PluginSettingsProps) {
  const plugin = usePluginStore(state => state.plugins[pluginId]);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  
  const pluginManager = PluginManager.getInstance();
  
  // Load initial settings
  useEffect(() => {
    if (plugin) {
      setSettings(plugin.settings || {});
    }
  }, [plugin]);
  
  // Handle saving settings
  const handleSave = async () => {
    setIsLoading(true);
    try {
      pluginManager.updatePluginSettings(pluginId, settings);
      onClose();
    } catch (error) {
      console.error('Failed to save plugin settings:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // If plugin not found
  if (!plugin) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-red-600">Plugin Not Found</h2>
          <button className="text-gray-400 hover:text-gray-500" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <p className="text-gray-500">The plugin you are looking for does not exist or has been uninstalled.</p>
        <button
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    );
  }
  
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">{plugin.manifest.name} Settings</h2>
        <button className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      
      <div className="space-y-4">
        {/* Example settings - in a real implementation, these would be generated based on the plugin's schema */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Enable notifications
          </label>
          <div className="mt-1">
            <input
              type="checkbox"
              className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
              checked={settings.enableNotifications || false}
              onChange={(e) => setSettings({
                ...settings,
                enableNotifications: e.target.checked
              })}
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Default color
          </label>
          <div className="mt-1">
            <input
              type="color"
              className="p-1 border border-gray-300 dark:border-gray-600 rounded"
              value={settings.defaultColor || '#000000'}
              onChange={(e) => setSettings({
                ...settings,
                defaultColor: e.target.value
              })}
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Auto-save interval (seconds)
          </label>
          <div className="mt-1">
            <input
              type="number"
              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
              value={settings.autoSaveInterval || 60}
              min={0}
              max={3600}
              onChange={(e) => setSettings({
                ...settings,
                autoSaveInterval: parseInt(e.target.value)
              })}
            />
          </div>
        </div>
      </div>
      
      <div className="mt-6 flex justify-end space-x-3">
        <button
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          className="inline-flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          onClick={handleSave}
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}