import React from 'react';
import { PluginAPI } from 'src/plugins/core/types';
import { Tool } from 'react-feather';

// Wrap the entire file in this self-executing function
(function(window) {
  interface ExtensionProps {
    tooltip?: string;
  }

  /**
   * CAD Helper Tools Plugin
   */
  class CADHelperTools {
    private api: PluginAPI;
    private registeredExtensions: string[] = [];
    
    constructor(api: PluginAPI) {
      this.api = api;
    }
    
    async onLoad(): Promise<void> {
      console.log('CAD Helper Tools plugin loaded');
      
      // Circle Tool
      const CircleToolButton = React.memo((props: ExtensionProps) => (
        <button
          onClick={() => {
            console.log('Circle tool activated');
          }}
          className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md shadow-sm flex items-center"
          title={props.tooltip}
        >
          <div className="w-4 h-4 rounded-full border-2 border-current mr-1.5" />
          <span className="text-sm">Circle</span>
        </button>
      ));
      CircleToolButton.displayName = 'CircleToolButton';

      // Line Tool
      const LineToolButton = React.memo((props: ExtensionProps) => (
        <button
          onClick={() => {
            console.log('Line tool activated');
          }}
          className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md shadow-sm flex items-center"
          title={props.tooltip}
        >
          <div className="w-4 h-0.5 bg-current mr-1.5" />
          <span className="text-sm">Line</span>
        </button>
      ));
      LineToolButton.displayName = 'LineToolButton';

      // Rectangle Tool
      const RectangleToolButton = React.memo((props: ExtensionProps) => (
        <button
          onClick={() => {
            console.log('Rectangle tool activated');
          }}
          className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md shadow-sm flex items-center"
          title={props.tooltip}
        >
          <div className="w-4 h-3 border-2 border-current mr-1.5" />
          <span className="text-sm">Rectangle</span>
        </button>
      ));
      RectangleToolButton.displayName = 'RectangleToolButton';

      // Register all tools
      const tools = [
        {
          id: 'circle-tool-button',
          component: CircleToolButton,
          tooltip: 'Circle by 3 Points',
          icon: 'circle',
          label: 'Circle'
        },
        {
          id: 'line-tool-button',
          component: LineToolButton,
          tooltip: 'Line by 2 Points',
          icon: 'minus',
          label: 'Line'
        },
        {
          id: 'rectangle-tool-button',
          component: RectangleToolButton,
          tooltip: 'Rectangle by 2 Points',
          icon: 'square',
          label: 'Rectangle'
        }
      ];

      // Register each tool
      for (const tool of tools) {
        this.api.registerExtension({
          id: tool.id,
          type: 'toolbar',
          component: tool.component,
          metadata: {
            tooltip: tool.tooltip,
            icon: tool.icon,
            position: 'left',
            group: 'geometry',
            label: tool.label
          }
        });
        this.registeredExtensions.push(tool.id);
      }
    }
    
    async onEnable(): Promise<void> {
      console.log('CAD Helper Tools plugin enabled');
      const linkElement = document.createElement('link');
      linkElement.rel = 'stylesheet';
      linkElement.href = '/plugins/cad-helper-tools/styles.css';
      linkElement.id = 'cad-helper-tools-styles';
      document.head.appendChild(linkElement);
    }
    
    async onDisable(): Promise<void> {
      console.log('CAD Helper Tools plugin disabled');
      for (const extensionId of this.registeredExtensions) {
        this.api.unregisterExtension(extensionId);
      }
      this.registeredExtensions = [];
      const styleElement = document.getElementById('cad-helper-tools-styles');
      if (styleElement) {
        styleElement.remove();
      }
    }
    
    async onUninstall(): Promise<void> {
      console.log('CAD Helper Tools plugin uninstalled');
    }
    
    onSettingsChange(settings: Record<string, any>): void {
      console.log('CAD Helper Tools settings changed:', settings);
    }
  }

  // This is the key part: expose the plugin class to the window object
  window.plugin_cad_helper_tools = CADHelperTools;
})(window);