/**
 * Core plugin system types and interfaces
 */
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  entryPoint: string;
  icon?: string;
  homepage?: string;
  repository?: string;
  dependencies: Record<string, string>;
  permissions: PluginPermission[];
  extensionPoints: string[];
  minAppVersion: string;
  maxAppVersion?: string;
}

export type PluginPermission = 
  | 'storage:read'
  | 'storage:write'
  | 'network:fetch'
  | 'ui:addToolbar'
  | 'ui:addSidebar'
  | 'ui:addModal'
  | 'cad:read'
  | 'cad:write'
  | 'cam:read'
  | 'cam:write';

export type PluginStatus = 
  | 'installed'
  | 'loading'
  | 'active'
  | 'error'
  | 'disabled'
  | 'incompatible';

export interface Plugin {
  manifest: PluginManifest;
  instance?: PluginInstance;
  enabled: boolean;
  status: PluginStatus;
  error?: string;
  settings: Record<string, any>;
}

export interface PluginInstance {
  onLoad?: () => Promise<void> | void;
  onEnable?: () => Promise<void> | void;
  onDisable?: () => Promise<void> | void;
  onUninstall?: () => Promise<void> | void;
  onSettingsChange?: (settings: Record<string, any>) => void;
  getExtensions?: () => Record<string, any>;
  [key: string]: any;
}

export type ExtensionPoint = 
  | 'toolbar'
  | 'sidebar'
  | 'modal'
  | 'contextMenu'
  | 'cadTool'
  | 'camOperation'
  | 'importer'
  | 'exporter'
  | 'renderer';

export interface ExtensionDefinition {
  id: string;
  type: ExtensionPoint;
  component?: React.ComponentType<any>;
  handler?: (...args: any[]) => any;
  metadata: Record<string, any>;
}

export interface PluginAPI {
  registerExtension: (extension: ExtensionDefinition) => void;
  unregisterExtension: (id: string) => void;
  getSettings: () => Record<string, any>;
  updateSettings: (settings: Record<string, any>) => void;
  getElements: () => any[];
  createElement: (element: any) => string;
  updateElement: (id: string, properties: any) => boolean;
  deleteElement: (id: string) => boolean;
  subscribeToEvents: (eventType: string, handler: (event: any) => void) => () => void;
}