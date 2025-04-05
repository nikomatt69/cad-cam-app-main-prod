import { usePluginStore } from '../core/PluginStore';
import { ExtensionDefinition } from '../core/types';

/**
 * Hook to get tool extensions
 */
export function useToolExtensions(
  type: 'cadTool' | 'camOperation',
  filter?: (extension: ExtensionDefinition) => boolean
) {
  const extensions = usePluginStore(state => state.getExtensionsByType(type));
  return filter ? extensions.filter(filter) : extensions;
}

/**
 * Register a new tool extension
 */
export function registerToolExtension(
  pluginId: string,
  extension: Omit<ExtensionDefinition, 'id'>
): string {
  return usePluginStore.getState().registerExtension(pluginId, {
    ...extension,
    id: `${extension.type}-${Date.now()}`
  });
}

/**
 * Execute a tool extension handler
 */
export async function executeToolExtension(
  extensionId: string,
  ...args: any[]
): Promise<any> {
  // Find the extension across all types
  const store = usePluginStore.getState();
  const allExtensionTypes = ['cadTool', 'camOperation'];
  
  for (const type of allExtensionTypes) {
    const extensions = store.getExtensionsByType(type);
    const extension = extensions.find(ext => ext.id === extensionId);
    
    if (extension && extension.handler) {
      return extension.handler(...args);
    }
  }
  
  throw new Error(`Extension ${extensionId} not found or has no handler`);
}