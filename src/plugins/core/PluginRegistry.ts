import { PluginManager } from './PluginManager';
import { PluginLoader } from './PluginLoader';
import { PluginSandbox } from './PluginSandbox';
import { Plugin, PluginManifest } from './types';

/**
 * Main registry for discovering and fetching plugins
 */
export class PluginRegistry {
  private static instance: PluginRegistry;
  private pluginManager: PluginManager;
  private pluginLoader: PluginLoader;
  private pluginSandbox: PluginSandbox;
  
  private constructor() {
    this.pluginManager = PluginManager.getInstance();
    this.pluginLoader = PluginLoader.getInstance();
    this.pluginSandbox = new PluginSandbox();
  }
  
  /**
   * Gets the singleton instance of PluginRegistry
   */
  public static getInstance(): PluginRegistry {
    if (!PluginRegistry.instance) {
      PluginRegistry.instance = new PluginRegistry();
    }
    return PluginRegistry.instance;
  }
  
  /**
   * Initialize the plugin system
   */
  public async initialize(): Promise<void> {
    // Load all installed plugins
    await this.pluginLoader.loadInstalledPlugins();
    
    // Set up plugin discovery endpoints
    await this.setupDiscoveryEndpoints();
  }
  
  /**
   * Set up plugin discovery endpoints
   */
  private async setupDiscoveryEndpoints(): Promise<void> {
    try {
      // Fetch the official plugin registry
      const response = await fetch('/api/plugins/registry');
      
      if (!response.ok) {
        console.warn('Failed to fetch plugin registry:', response.statusText);
        return;
      }
      
      const plugins = await response.json();
      
      // Store the available plugins
      // (This would be stored in a different part of your state management)
      console.log('Available plugins:', plugins);
    } catch (error) {
      console.error('Failed to set up plugin discovery:', error);
    }
  }
  
  /**
   * Fetch plugin details from the registry
   */
  public async getPluginDetails(id: string): Promise<PluginManifest | null> {
    try {
      const response = await fetch(`/api/plugins/registry/${id}`);
      
      if (!response.ok) {
        console.warn(`Failed to fetch plugin details for ${id}:`, response.statusText);
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Failed to get plugin details for ${id}:`, error);
      return null;
    }
  }
  
  /**
   * Search for plugins in the registry
   */
  public async searchPlugins(query: string): Promise<PluginManifest[]> {
    try {
      const response = await fetch(`/api/plugins/registry/search?q=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        console.warn('Failed to search plugins:', response.statusText);
        return [];
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to search plugins:', error);
      return [];
    }
  }
  
  /**
   * Load and initialize a plugin in a sandbox
   */
  public async loadAndInitializePlugin(plugin: Plugin): Promise<boolean> {
    try {
      // Check compatibility
      if (!this.pluginLoader.isPluginCompatible(plugin.manifest)) {
        throw new Error(`Plugin ${plugin.manifest.id} is not compatible with the current app version`);
      }
      
      // Validate permissions
      if (!this.pluginLoader.validatePermissions(plugin.manifest)) {
        throw new Error(`Plugin ${plugin.manifest.id} requires permissions that are not granted`);
      }
      
      // Load the plugin code
      const pluginModule = await this.pluginLoader.loadPluginCode(plugin);
      
      // Create sandbox and API
      const { api, context } = this.pluginSandbox.createSandbox(plugin);
      
      // Initialize the plugin
      const pluginInstance = typeof pluginModule.default === 'function' 
        ? new pluginModule.default(api, context)
        : pluginModule;
      
      // Call lifecycle method
      if (pluginInstance.onLoad) {
        await pluginInstance.onLoad();
      }
      
      // Update the plugin state with the instance
      // This would be handled by your plugin manager
      
      return true;
    } catch (error) {
      console.error(`Failed to load and initialize plugin ${plugin.manifest.id}:`, error);
      return false;
    }
  }
}