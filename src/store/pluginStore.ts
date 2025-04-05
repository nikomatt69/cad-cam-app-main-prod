import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Plugin, PluginManifest, ExtensionDefinition } from 'src/plugins/core/types';

interface PluginState {
  plugins: Record<string, Plugin>;
  installedPlugins: string[];
  activePlugins: string[];
  extensions: Record<string, ExtensionDefinition[]>;
  
  // Actions
  installPlugin: (manifest: PluginManifest) => Promise<boolean>;
  enablePlugin: (id: string) => Promise<boolean>;
  disablePlugin: (id: string) => Promise<boolean>;
  uninstallPlugin: (id: string) => Promise<boolean>;
  updatePluginSettings: (id: string, settings: Record<string, any>) => void;
  registerExtension: (pluginId: string, extension: ExtensionDefinition) => string;
  unregisterExtension: (pluginId: string, extensionId: string) => void;
  getExtensionsByType: (type: string) => ExtensionDefinition[];
  getPluginById: (id: string) => Plugin | undefined;
}

export const usePluginStore = create<PluginState>()(
  persist(
    (set, get) => ({
      plugins: {},
      installedPlugins: [],
      activePlugins: [],
      extensions: {},
      
      installPlugin: async (manifest) => {
        try {
          // Validate manifest
          if (!manifest.id || !manifest.name || !manifest.version) {
            throw new Error('Invalid plugin manifest');
          }
          
          // Check for existing plugin
          const { plugins, installedPlugins } = get();
          if (plugins[manifest.id]) {
            throw new Error('Plugin already installed');
          }
          
          // Add to plugins registry
          set(state => ({
            plugins: {
              ...state.plugins,
              [manifest.id]: {
                manifest,
                enabled: false,
                status: 'installed',
                settings: {}
              }
            },
            installedPlugins: [...state.installedPlugins, manifest.id]
          }));
          
          return true;
        } catch (error) {
          console.error('Failed to install plugin:', error);
          return false;
        }
      },
      
      enablePlugin: async (id) => {
        try {
          const { plugins } = get();
          const plugin = plugins[id];
          
          if (!plugin) {
            throw new Error('Plugin not found');
          }
          
          // Update to loading state first
          set(state => ({
            plugins: {
              ...state.plugins,
              [id]: {
                ...plugin,
                status: 'loading'
              }
            }
          }));
          
          // This would be replaced with your actual loading mechanism
          const pluginModule = await import(`/public/plugins/${id}`);
          const instance = pluginModule.default ? new pluginModule.default() : pluginModule;
          
          // Call lifecycle method
          if (instance.onEnable) {
            await instance.onEnable();
          }
          
          // Update plugin state
          set(state => ({
            plugins: {
              ...state.plugins,
              [id]: {
                ...plugin,
                instance,
                enabled: true,
                status: 'active'
              }
            },
            activePlugins: [...state.activePlugins, id]
          }));
          
          return true;
        } catch (error) {
          console.error(`Failed to enable plugin ${id}:`, error);
          
          // Update plugin state to error
          set(state => ({
            plugins: {
              ...state.plugins,
              [id]: {
                ...state.plugins[id],
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
              }
            }
          }));
          
          return false;
        }
      },
      
      disablePlugin: async (id) => {
        try {
          const { plugins, activePlugins } = get();
          const plugin = plugins[id];
          
          if (!plugin) {
            throw new Error('Plugin not found');
          }
          
          // Call lifecycle method
          if (plugin.instance?.onDisable) {
            await plugin.instance.onDisable();
          }
          
          // Remove all extensions from this plugin
          const { extensions } = get();
          const newExtensions = { ...extensions };
          
          Object.keys(newExtensions).forEach(type => {
            newExtensions[type] = newExtensions[type].filter(
              ext => !ext.id.startsWith(`${id}:`)
            );
          });
          
          // Update plugin state
          set(state => ({
            plugins: {
              ...state.plugins,
              [id]: {
                ...plugin,
                enabled: false,
                status: 'disabled'
              }
            },
            activePlugins: activePlugins.filter(pid => pid !== id),
            extensions: newExtensions
          }));
          
          return true;
        } catch (error) {
          console.error(`Failed to disable plugin ${id}:`, error);
          return false;
        }
      },
      
      uninstallPlugin: async (id) => {
        try {
          const { plugins, installedPlugins, activePlugins } = get();
          const plugin = plugins[id];
          
          if (!plugin) {
            throw new Error('Plugin not found');
          }
          
          // Disable first if enabled
          if (plugin.enabled) {
            await get().disablePlugin(id);
          }
          
          // Call lifecycle method
          if (plugin.instance?.onUninstall) {
            await plugin.instance.onUninstall();
          }
          
          // Remove plugin
          const newPlugins = { ...plugins };
          delete newPlugins[id];
          
          set({
            plugins: newPlugins,
            installedPlugins: installedPlugins.filter(pid => pid !== id),
            activePlugins: activePlugins.filter(pid => pid !== id)
          });
          
          return true;
        } catch (error) {
          console.error(`Failed to uninstall plugin ${id}:`, error);
          return false;
        }
      },
      
      updatePluginSettings: (id, settings) => {
        const { plugins } = get();
        const plugin = plugins[id];
        
        if (!plugin) {
          console.error(`Plugin ${id} not found`);
          return;
        }
        
        const newSettings = {
          ...plugin.settings,
          ...settings
        };
        
        set(state => ({
          plugins: {
            ...state.plugins,
            [id]: {
              ...plugin,
              settings: newSettings
            }
          }
        }));
        
        // Notify plugin of settings change
        if (plugin.instance?.onSettingsChange) {
          plugin.instance.onSettingsChange(newSettings);
        }
      },
      
      registerExtension: (pluginId, extension) => {
        const { extensions } = get();
        const extensionId = `${pluginId}:${extension.id || uuidv4()}`;
        
        const extensionWithId = {
          ...extension,
          id: extensionId
        };
        
        const extensionsOfType = extensions[extension.type] || [];
        
        set(state => ({
          extensions: {
            ...state.extensions,
            [extension.type]: [...extensionsOfType, extensionWithId]
          }
        }));
        
        return extensionId;
      },
      
      unregisterExtension: (pluginId, extensionId) => {
        const fullExtensionId = extensionId.includes(':') 
          ? extensionId 
          : `${pluginId}:${extensionId}`;
          
        const { extensions } = get();
        const newExtensions = { ...extensions };
        
        Object.keys(newExtensions).forEach(type => {
          newExtensions[type] = newExtensions[type].filter(
            ext => ext.id !== fullExtensionId
          );
        });
        
        set({ extensions: newExtensions });
      },
      
      getExtensionsByType: (type) => {
        const { extensions } = get();
        return extensions[type] || [];
      },
      
      getPluginById: (id) => {
        return get().plugins[id];
      }
    }),
    {
      name: 'cadcamfun-plugins'
    }
  )
);