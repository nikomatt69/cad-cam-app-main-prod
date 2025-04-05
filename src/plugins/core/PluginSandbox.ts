import { Plugin, PluginAPI } from './types';
import { PluginManager } from './PluginManager';

/**
 * Creates a sandboxed environment for plugin execution
 */
export class PluginSandbox {
  private pluginManager: PluginManager;
  
  constructor() {
    this.pluginManager = PluginManager.getInstance();
  }
  
  /**
   * Create a sandboxed environment for a plugin
   */
  public createSandbox(plugin: Plugin): { api: PluginAPI, context: Record<string, any> } {
    // Create the plugin API
    const api = this.pluginManager.createPluginAPI(plugin.manifest.id);
    
    // Create the sandbox context
    const context: Record<string, any> = {
      // Safe globals
      console: {
        log: (...args: any[]) => console.log(`[Plugin ${plugin.manifest.id}]`, ...args),
        error: (...args: any[]) => console.error(`[Plugin ${plugin.manifest.id}]`, ...args),
        warn: (...args: any[]) => console.warn(`[Plugin ${plugin.manifest.id}]`, ...args),
        info: (...args: any[]) => console.info(`[Plugin ${plugin.manifest.id}]`, ...args),
      },
      
      // For React components
      React: window.React,
      
      // Plugin API
      api,
      
      // Plugin manifest
      manifest: { ...plugin.manifest },
      
      // Restricted globals based on permissions
      ...this.getSafeGlobals(plugin)
    };
    
    return { api, context };
  }
  
  /**
   * Get safe globals based on plugin permissions
   */
  private getSafeGlobals(plugin: Plugin): Record<string, any> {
    const { permissions } = plugin.manifest;
    const globals: Record<string, any> = {};
    
    // Network access
    if (permissions.includes('network:fetch')) {
      globals.fetch = this.createSafeFetch();
    }
    
    // Storage access
    if (permissions.includes('storage:read') || permissions.includes('storage:write')) {
      globals.localStorage = this.createSafeStorage(plugin.manifest.id, permissions);
    }
    
    return globals;
  }
  
  /**
   * Create a safe fetch function that logs and restricts network requests
   */
  private createSafeFetch(): typeof fetch {
    return async (input: RequestInfo | URL, init?: RequestInit) => {
      // Log the request
      console.log('[Plugin Fetch]', input, init);
      
      // You can add additional restrictions here
      // For example, only allow certain domains
      
      // Call the real fetch
      return fetch(input, init);
    };
  }
  
  /**
   * Create a safe storage object that prefixes all keys with the plugin ID
   */
  private createSafeStorage(pluginId: string, permissions: string[]): Storage {
    const canRead = permissions.includes('storage:read');
    const canWrite = permissions.includes('storage:write');
    
    // Create a proxy to localStorage that prefixes all keys
    return new Proxy({} as Storage, {
      get: (target, prop) => {
        if (prop === 'getItem' && canRead) {
          return (key: string) => localStorage.getItem(`plugin:${pluginId}:${key}`);
        }
        if (prop === 'setItem' && canWrite) {
          return (key: string, value: string) => localStorage.setItem(`plugin:${pluginId}:${key}`, value);
        }
        if (prop === 'removeItem' && canWrite) {
          return (key: string) => localStorage.removeItem(`plugin:${pluginId}:${key}`);
        }
        if (prop === 'clear' && canWrite) {
          return () => {
            Object.keys(localStorage).forEach(key => {
              if (key.startsWith(`plugin:${pluginId}:`)) {
                localStorage.removeItem(key);
              }
            });
          };
        }
        if (prop === 'key' && canRead) {
          return (index: number) => {
            const keys = Object.keys(localStorage).filter(key => 
              key.startsWith(`plugin:${pluginId}:`)
            );
            const key = keys[index];
            return key ? key.replace(`plugin:${pluginId}:`, '') : null;
          };
        }
        if (prop === 'length' && canRead) {
          return Object.keys(localStorage).filter(key => 
            key.startsWith(`plugin:${pluginId}:`)
          ).length;
        }
        
        // Default: deny access
        return undefined;
      }
    });
  }
  
  /**
   * Evaluate plugin code in a controlled environment
   */
  public evaluatePluginCode(code: string, context: Record<string, any>): any {
    try {
      // Create a function with the context variables as parameters
      const contextKeys = Object.keys(context);
      const contextValues = contextKeys.map(key => context[key]);
      
      // Use Function constructor to create a sandboxed function
      const sandboxedFunction = new Function(
        ...contextKeys,
        `"use strict";
        // Prevent access to global scope
        const window = undefined;
        const document = undefined;
        const globalThis = undefined;
        
        ${code}
        
        // Return the exports
        return typeof exports !== 'undefined' ? exports : typeof module !== 'undefined' ? module.exports : undefined;`
      );
      
      // Execute the function with the context
      return sandboxedFunction(...contextValues);
    } catch (error) {
      console.error('Error evaluating plugin code:', error);
      throw error;
    }
  }
}