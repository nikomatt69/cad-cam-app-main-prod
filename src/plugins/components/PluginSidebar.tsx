import React, { useState, useEffect } from 'react';
import { usePluginStore } from '../core/PluginStore';
import { ExtensionDefinition } from '../core/types';
import { Package, ChevronDown, ChevronRight } from 'react-feather';

interface SidebarExtension {
  id: string;
  component: React.ComponentType<any>;
  metadata: {
    title: string;
    icon?: string;
    group?: string;
    order?: number;
  };
}

export const PluginSidebar: React.FC = () => {
  const { activePlugins, getExtensionsByType } = usePluginStore();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'cad': true,
    'cam': true,
    'tools': true,
    'other': true
  });
  
  // Get all sidebar extensions
  const allSidebarExtensions = getExtensionsByType('sidebar');
  
  // Filter extensions that have components
  const sidebarExtensions = allSidebarExtensions
    .filter((ext) => ext.component)
    .map((ext) => ({
      id: ext.id,
      component: ext.component!,
      metadata: {
        title: ext.metadata.title || 'Untitled',
        icon: ext.metadata.icon,
        group: ext.metadata.group || 'other',
        order: ext.metadata.order || 100
      }
    })) as SidebarExtension[];
  
  // Group extensions
  const extensionGroups = sidebarExtensions.reduce((groups: Record<string, SidebarExtension[]>, ext) => {
    const group = ext.metadata.group || 'other';
    if (!groups[group]) groups[group] = [];
    groups[group].push(ext);
    return groups;
  }, {});
  
  // Sort groups and extensions within groups
  Object.keys(extensionGroups).forEach(groupName => {
    extensionGroups[groupName].sort((a, b) => 
      (a.metadata.order || 100) - (b.metadata.order || 100)
    );
  });
  
  const sortedGroups = Object.keys(extensionGroups).sort((a, b) => {
    // Custom group order (CAD first, then CAM, then tools, then others)
    const groupOrder: Record<string, number> = {
      'cad': 1,
      'cam': 2,
      'tools': 3
    };
    return (groupOrder[a] || 100) - (groupOrder[b] || 100);
  });
  
  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };
  
  return (
    <div className="h-full w-64 bg-gray-50 dark:bg-gray-800 border-r dark:border-gray-700 flex flex-col">
      <div className="p-4 border-b dark:border-gray-700 flex items-center">
        <Package className="h-5 w-5 text-blue-500 mr-2" />
        <h2 className="font-medium text-gray-800 dark:text-white">Plugins</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {sortedGroups.length > 0 ? (
          sortedGroups.map(group => {
            const extensions = extensionGroups[group];
            const isExpanded = expandedGroups[group];
            
            return (
              <div key={group} className="border-b dark:border-gray-700">
                <button
                  className="w-full text-left px-4 py-2 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => toggleGroup(group)}
                >
                  <span className="font-medium text-gray-700 dark:text-gray-300 capitalize">
                    {group}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  )}
                </button>
                
                {isExpanded && (
                  <div className="py-2 px-4 space-y-2">
                    {extensions.map(ext => {
                      const ExtComponent = ext.component;
                      return (
                        <div key={ext.id} className="cad-plugin-extension">
                          <ExtComponent />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            <p>No sidebar extensions available.</p>
          </div>
        )}
      </div>
    </div>
  );
}; 