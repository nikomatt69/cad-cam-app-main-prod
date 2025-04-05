import { usePluginStore } from './PluginStore';
import { PluginManifest, PluginAPI, Plugin } from './types';

export class PluginManager {
  private static instance: PluginManager;
  
  private constructor() {
    // Private constructor to enforce singleton
  }
  
  /**
   * Gets the singleton instance of PluginManager
   */
  public static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }
  
  /**
   * Install a plugin from a manifest
   */
  public async installPlugin(manifest: PluginManifest): Promise<boolean> {
    return usePluginStore.getState().installPlugin(manifest);
  }
  
  /**
   * Install a plugin from a URL
   */
  public async installPluginFromUrl(url: string): Promise<boolean> {
    try {
      // Fetch the manifest
      const response = await fetch(`${url}/manifest.json`);
      if (!response.ok) {
        throw new Error(`Failed to fetch plugin manifest: ${response.statusText}`);
      }
      
      const manifest = await response.json();
      return this.installPlugin(manifest);
    } catch (error) {
      console.error('Failed to install plugin from URL:', error);
      return false;
    }
  }
  
  /**
   * Install plugin from a file upload
   */
  public async installPluginFromFile(file: File): Promise<boolean> {
    try {
      // Check if it's a zip file
      if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
        // This would require a zip library to extract the contents
        // For now, we'll just throw an error
        throw new Error('ZIP installation not implemented yet');
      }
      
      // Assume it's a JSON manifest
      const text = await file.text();
      const manifest = JSON.parse(text);
      return this.installPlugin(manifest);
    } catch (error) {
      console.error('Failed to install plugin from file:', error);
      return false;
    }
  }
  
  /**
   * Enable a plugin
   */
  public async enablePlugin(id: string): Promise<boolean> {
    return usePluginStore.getState().enablePlugin(id);
  }
  
  /**
   * Disable a plugin
   */
  public async disablePlugin(id: string): Promise<boolean> {
    return usePluginStore.getState().disablePlugin(id);
  }
  
  /**
   * Uninstall a plugin
   */
  public async uninstallPlugin(id: string): Promise<boolean> {
    return usePluginStore.getState().uninstallPlugin(id);
  }
  
  /**
   * Get all installed plugins
   */
  public getInstalledPlugins(): Plugin[] {
    const { plugins, installedPlugins } = usePluginStore.getState();
    return installedPlugins.map(id => plugins[id]);
  }
  
  /**
   * Get all active plugins
   */
  public getActivePlugins(): Plugin[] {
    const { plugins, activePlugins } = usePluginStore.getState();
    return activePlugins.map(id => plugins[id]);
  }
  
  /**
   * Get a plugin by ID
   */
  public getPlugin(id: string): Plugin | undefined {
    return usePluginStore.getState().getPluginById(id);
  }
  
  /**
   * Update plugin settings
   */
  public updatePluginSettings(id: string, settings: Record<string, any>): void {
    usePluginStore.getState().updatePluginSettings(id, settings);
  }
  
  /**
   * Create a plugin API instance for a specific plugin
   */
  public createPluginAPI(pluginId: string): PluginAPI {
    const store = usePluginStore.getState();
    
    return {
      registerExtension: (extension) => {
        const extensionId = store.registerExtension(pluginId, extension);
        return extensionId;
      },
      
      unregisterExtension: (extensionId) => {
        store.unregisterExtension(pluginId, extensionId);
      },
      
      getSettings: () => {
        const plugin = store.plugins[pluginId];
        return plugin ? { ...plugin.settings } : {};
      },
      
      updateSettings: (settings) => {
        store.updatePluginSettings(pluginId, settings);
      },
      
      getElements: () => {
        // This would need to be connected to your element store
        // For now we return an empty array
        return [];
      },
      
      createElement: (element) => {
        // This would connect to your element creation logic
        console.log('Plugin attempting to create element:', element);
        return 'mock-element-id';
      },
      
      updateElement: (id, properties) => {
        // This would connect to your element update logic
        console.log('Plugin attempting to update element:', id, properties);
        return true;
      },
      
      deleteElement: (id) => {
        // This would connect to your element deletion logic
        console.log('Plugin attempting to delete element:', id);
        return true;
      },
      
      subscribeToEvents: (eventType, handler) => {
        // This would connect to your event system
        console.log('Plugin subscribing to event:', eventType);
        // Return a function to unsubscribe
        return () => {
          console.log('Plugin unsubscribing from event:', eventType);
        };
      }
    };
  }
}