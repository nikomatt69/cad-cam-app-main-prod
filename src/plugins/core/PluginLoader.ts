// src/plugins/core/PluginLoader.ts
import { PluginManager } from './PluginManager';
import { Plugin, PluginManifest } from './types';
import { usePluginStore } from './PluginStore';
import semver from 'semver'; // Add this to your dependencies

// Add this interface at the top of the file after imports
interface CustomWindow extends Window {
  [key: string]: any;
}

declare const window: CustomWindow;

// Add interface for plugin window augmentation
declare global {
  interface Window {
    [key: `plugin_${string}`]: any;
  }
}

export class PluginLoader {
  private static instance: PluginLoader;
  private pluginManager: PluginManager;
  private loadedScripts: Set<string> = new Set();
  
  private constructor() {
    this.pluginManager = PluginManager.getInstance();
  }
  
  /**
   * Gets the singleton instance of PluginLoader
   */
  public static getInstance(): PluginLoader {
    if (!PluginLoader.instance) {
      PluginLoader.instance = new PluginLoader();
    }
    return PluginLoader.instance;
  }
  
  /**
   * Load all installed plugins
   */
  public async loadInstalledPlugins(): Promise<void> {
    const { plugins, installedPlugins } = usePluginStore.getState();
    
    console.log(`Loading ${installedPlugins.length} installed plugins...`);
    
    // Load plugins that were previously active
    for (const pluginId of installedPlugins) {
      const plugin = plugins[pluginId];
      if (plugin && plugin.enabled) {
        try {
          await this.pluginManager.enablePlugin(pluginId);
        } catch (error) {
          console.error(`Failed to enable plugin ${pluginId}:`, error);
          // Continue with other plugins even if one fails
        }
      }
    }
  }
  
  /**
   * Load plugin code dynamically
   */
  public async loadPluginCode(plugin: Plugin): Promise<any> {
    const { manifest } = plugin;
    const pluginId = manifest.id;
    
    try {
      // For local development plugins (stored in the public directory)
      if (this.isLocalPlugin(manifest)) {
        return await this.loadLocalPlugin(manifest);
      }
      
      // For remote plugins (from CDN or a plugin marketplace)
      return await this.loadRemotePlugin(manifest);
    } catch (error) {
      console.error(`Failed to load plugin code for ${pluginId}:`, error);
      throw new Error(`Failed to load plugin code for ${pluginId}: ${error}`);
    }
  }
  
  /**
   * Check if a plugin is a local development plugin
   */
  private isLocalPlugin(manifest: PluginManifest): boolean {
    // Check if the plugin is in the development directory
    return true; // Override this logic based on your plugin distribution method
  }
  
  /**
   * Load a local plugin from the public directory
   */
  private async loadLocalPlugin(manifest: PluginManifest): Promise<any> {
    const pluginId = manifest.id;
    const entryPath = manifest.entryPoint;
    
    // Server-side rendering check
    if (typeof window === 'undefined') {
      console.warn(`Cannot load plugin ${pluginId} during server-side rendering`);
      return {};
    }
    
    try {
      // For local plugins, use the fetch API to load the plugin code
      // Use the compiled JS file for consistency with browser compatibility
      const jsPath = entryPath.replace('.ts', '.js').replace('.tsx', '.js');
      const response = await fetch(`/plugins/${pluginId}/dist/index.js`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch plugin code: ${response.statusText}`);
      }
      
      const code = await response.text();
      
      // Create a module using a Function constructor
      const moduleFactory = new Function('exports', 'require', 'moduleObj', code);
      
      // Create a simple module-like object
      const exports = {};
      const moduleObj = { exports };
      
      // Execute the module code
      moduleFactory(exports, () => {}, moduleObj);
      
      return moduleObj.exports;
    } catch (error) {
      console.error(`Failed to load local plugin ${pluginId}:`, error);
      throw error;
    }
  }
  
  /**
   * Load a remote plugin from a CDN or plugin marketplace
   */
  private async loadRemotePlugin(manifest: PluginManifest): Promise<any> {
    const pluginId = manifest.id;
    const entryPath = manifest.entryPoint;
    
    // Check if script is already loaded
    const scriptUrl = `/api/plugins/serve?id=${pluginId}&file=dist/index.js`;
    if (this.loadedScripts.has(scriptUrl)) {
      console.log(`Plugin ${pluginId} is already loaded, reusing existing instance`);
      return window[`plugin_${pluginId}`];
    }
    
    return new Promise((resolve, reject) => {
      // Create a new script element
      const scriptElement = document.createElement('script');
      scriptElement.src = scriptUrl;
      scriptElement.async = true;
      scriptElement.id = `plugin-${pluginId}`;
      
      // Set up load and error handlers
      scriptElement.onload = () => {
        this.loadedScripts.add(scriptUrl);
        const pluginModule = (window as any)[`plugin_${pluginId}`];
        if (pluginModule) {
          resolve(pluginModule);
        } else {
          reject(new Error(`Plugin ${pluginId} loaded but did not expose a module`));
        }
      };
      
      scriptElement.onerror = () => {
        reject(new Error(`Failed to load script for plugin ${pluginId}`));
      };
      
      // Append the script to the document
      document.head.appendChild(scriptElement);
    });
  }
  
  /**
   * Check if a plugin is compatible with the current app version
   */
  public isPluginCompatible(manifest: PluginManifest): boolean {
    try {
      // Get the current app version
      const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';
      
      // Check minimum app version requirement
      if (manifest.minAppVersion && !semver.gte(appVersion, manifest.minAppVersion)) {
        console.warn(`Plugin ${manifest.id} requires app version ${manifest.minAppVersion} or higher, but current version is ${appVersion}`);
        return false;
      }
      
      // Check maximum app version requirement
      if (manifest.maxAppVersion && !semver.lte(appVersion, manifest.maxAppVersion)) {
        console.warn(`Plugin ${manifest.id} requires app version ${manifest.maxAppVersion} or lower, but current version is ${appVersion}`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to check compatibility for plugin ${manifest.id}:`, error);
      return false;
    }
  }
  
  /**
   * Validate plugin permissions against user granted permissions
   */
  public validatePermissions(manifest: PluginManifest): boolean {
    try {
      // Get user-granted permissions
      const userPermissions = this.getUserPermissions();
      
      // Check if all required permissions are granted
      for (const permission of manifest.permissions) {
        if (!userPermissions.includes(permission)) {
          console.warn(`Plugin ${manifest.id} requires permission "${permission}" which is not granted`);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to validate permissions for plugin ${manifest.id}:`, error);
      return false;
    }
  }
  
  /**
   * Get user-granted permissions
   */
  private getUserPermissions(): string[] {
    // In a real implementation, this would fetch user-granted permissions from your auth/permission system
    // For simplicity, we'll assume all permissions are granted for now
    return [
      'storage:read',
      'storage:write',
      'network:fetch',
      'ui:addToolbar',
      'ui:addSidebar',
      'ui:addModal',
      'cad:read',
      'cad:write',
      'cam:read',
      'cam:write'
    ];
  }
  
  /**
   * Clean up loaded plugins
   */
  public cleanupPlugins(): void {
    // Remove all loaded script elements
    this.loadedScripts.forEach(url => {
      const scriptId = url.split('id=')[1]?.split('&')[0];
      if (scriptId) {
        const scriptElement = document.getElementById(`plugin-${scriptId}`);
        if (scriptElement) {
          scriptElement.remove();
        }
      }
    });
    
    this.loadedScripts.clear();
  }
}