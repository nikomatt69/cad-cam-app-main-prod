import { PluginAPI } from 'src/plugins/core/types';

export interface CADHelperToolsInstance {
  setActiveTool: (toolId: string | null) => void;
  api: PluginAPI;
}

declare global {
  interface Window {
    CADHelperToolsInstance?: CADHelperToolsInstance;
    plugin_cad_helper_tools: any;
  }
}

export {}; 