import React, { useState } from 'react';
import { Plugin } from '../core/types';
import { Settings, Trash, ToggleLeft, ToggleRight, AlertCircle } from 'react-feather';

interface PluginCardProps {
  plugin: Plugin;
  isActive: boolean;
  onToggle: (enabled: boolean) => void;
  onUninstall: () => void;
  onSettings?: () => void;
}

export function PluginCard({ plugin, isActive, onToggle, onUninstall, onSettings }: PluginCardProps) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  
  const handleToggle = () => {
    onToggle(!isActive);
  };
  
  const handleUninstall = () => {
    if (showConfirmDelete) {
      onUninstall();
      setShowConfirmDelete(false);
    } else {
      setShowConfirmDelete(true);
    }
  };
  
  const truncate = (str: string, length: number) => {
    if (!str) return '';
    return str.length > length ? str.substring(0, length) + '...' : str;
  };
  
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
      {/* Plugin header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="mb-4 md:mb-0">
          <div className="flex items-center">
            <h3 className="text-lg font-medium text-gray-800 dark:text-white">{plugin.manifest.name}</h3>
            <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
              plugin.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
              plugin.status === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
            }`}>
              {plugin.status}
            </span>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{truncate(plugin.manifest.description, 120)}</p>
          <div className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            Version: {plugin.manifest.version} | Author: {plugin.manifest.author}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            className={`p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isActive 
                ? 'text-green-700 hover:text-green-800 focus:ring-green-500' 
                : 'text-gray-400 hover:text-gray-600 focus:ring-gray-500'
            }`}
            onClick={handleToggle}
            title={isActive ? 'Disable plugin' : 'Enable plugin'}
          >
            {isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
          </button>
          
          {onSettings && (
            <button
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              onClick={onSettings}
              title="Plugin settings"
            >
              <Settings size={20} />
            </button>
          )}
          
          <button
            className={`p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
              showConfirmDelete 
                ? 'text-red-600 hover:text-red-700 bg-red-50 dark:bg-red-900/20' 
                : 'text-gray-400 hover:text-red-600'
            }`}
            onClick={handleUninstall}
            title={showConfirmDelete ? 'Confirm uninstall' : 'Uninstall plugin'}
          >
            <Trash size={20} />
          </button>
        </div>
      </div>
      
      {/* Error message */}
      {plugin.error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-200">Error</p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{plugin.error}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Confirm delete warning */}
      {showConfirmDelete && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
          <p className="text-sm text-red-700 dark:text-red-300">
            Are you sure you want to uninstall this plugin? All plugin data will be lost.
          </p>
          <div className="mt-2 flex justify-end space-x-2">
            <button
              className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600"
              onClick={() => setShowConfirmDelete(false)}
            >
              Cancel
            </button>
            <button
              className="px-3 py-1 text-sm text-white bg-red-600 rounded hover:bg-red-700"
              onClick={handleUninstall}
            >
              Uninstall
            </button>
          </div>
        </div>
      )}
    </div>
  );
}