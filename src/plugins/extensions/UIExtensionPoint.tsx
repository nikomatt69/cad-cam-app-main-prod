import React, { ReactNode } from 'react';
import { usePluginStore } from '../core/PluginStore';
import { ExtensionDefinition } from '../core/types';
import { useToolState } from '@/src/store/toolStore';

interface UIExtensionPointProps {
  type: 'toolbar' | 'sidebar' | 'modal' | 'contextMenu';
  children?: ReactNode;
  filter?: (extension: ExtensionDefinition) => boolean;
  position?: 'left' | 'right' | 'center';
}

/**
 * A component that renders all UI extensions of a specific type
 */
export function UIExtensionPoint({ type, children, filter, position }: UIExtensionPointProps) {
  // Get extensions of the specified type
  const extensions = usePluginStore(state => state.getExtensionsByType(type));
  const { activeTool, setActiveTool } = useToolState();

  // Filter extensions if a filter is provided
  let filteredExtensions = filter ? extensions.filter(filter) : extensions;
  
  // Filter by position if specified
  if (position) {
    filteredExtensions = filteredExtensions.filter(ext => 
      ext.metadata?.position === position || !ext.metadata?.position
    );
  }
  
  // Group extensions by their group metadata
  const groupedExtensions = filteredExtensions.reduce<Record<string, ExtensionDefinition[]>>(
    (groups, extension) => {
      const group = extension.metadata?.group || 'default';
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(extension);
      return groups;
    },
    {}
  );
  
  // Handle tool activation
  const handleToolSelect = (toolId: string) => {
    setActiveTool(toolId);
    
    // Get the extension
    const extension = extensions.find(ext => ext.id === toolId);
    
    // Call any activation handler if provided
    if (extension && extension.handler) {
      extension.handler();
    }
  };
  
  if (type === 'toolbar') {
    return (
      <>
        {/* Render the children first (default content) */}
        {children}
        
        {/* Render each extension group */}
        {Object.entries(groupedExtensions).map(([groupName, groupExtensions]) => {
          // If there's only one extension in the group, render it as a button
          if (groupExtensions.length === 1) {
            const extension = groupExtensions[0];
            
            return (
              <button
                key={extension.id}
                onClick={() => handleToolSelect(extension.id)}
                className={`px-3 py-1.5 border shadow-sm rounded-md flex items-center ${
                  activeTool === extension.id
                    ? 'bg-blue-50 dark:bg-blue-900 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300' 
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
                title={extension.metadata?.tooltip || extension.metadata?.name || ''}
              >
                {extension.metadata?.icon && (
                  <span className="mr-1.5">
                    {typeof extension.metadata.icon === 'string' ? (
                      <span>
                        {/* Handle predefined icons */}
                        {extension.metadata.icon === 'circle' && <div className="w-4 h-4 rounded-full border-2 border-current" />}
                        {extension.metadata.icon === 'symmetry' && <span className="flex items-center space-x-1">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2v20M4 5h16M4 19h16M4 12h16"/>
                          </svg>
                        </span>}
                        {extension.metadata.icon === 'tools' && <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>}
                      </span>
                    ) : (
                      <>
                        {extension.metadata.icon}
                      </>
                    )}
                  </span>
                )}
                <span className="text-sm">{extension.metadata?.label || extension.metadata?.name || ''}</span>
              </button>
            );
          }
          
          // If there are multiple extensions in the group, render them in a dropdown
          return (
            <div className="relative" key={groupName}>
              <button
                onClick={() => {}}
                className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md shadow-sm flex items-center"
              >
                <span className="text-sm mr-1">{groupName}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              
              {/* Dropdown menu would be implemented here */}
            </div>
          );
        })}
      </>
    );
  }
  
  // For other extension points
  return (
    <>
      {/* Render the children first (default content) */}
      {children}
      
      {/* Render each extension component */}
      {filteredExtensions.map(extension => {
        if (!extension.component) {
          return null;
        }
        
        const ExtensionComponent = extension.component;
        
        return (
          <React.Fragment key={extension.id}>
            <ExtensionComponent {...extension.metadata} />
          </React.Fragment>
        );
      })}
    </>
  );
}

/**
 * Hook to get extensions of a specific type
 */
export function useUIExtensions(type: string, filter?: (extension: ExtensionDefinition) => boolean) {
  const extensions = usePluginStore(state => state.getExtensionsByType(type));
  return filter ? extensions.filter(filter) : extensions;
}