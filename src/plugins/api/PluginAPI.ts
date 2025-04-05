import { PluginAPI as IPluginAPI } from '../core/types';
import * as CADOperations from './CADOperations';
import * as CAMOperations from './CAMOperations';
import * as FileSystem from './FileSystem';

/**
 * Create a complete plugin API
 */
export function createFullPluginAPI(
  pluginId: string,
  baseApi: IPluginAPI
): IPluginAPI & typeof CADOperations & typeof CAMOperations & typeof FileSystem {
  return {
    // Base API
    ...baseApi,
    
    // Extended APIs
    ...CADOperations,
    ...CAMOperations,
    ...FileSystem
  };
}

/**
 * Create a restricted plugin API based on permissions
 */
export function createRestrictedPluginAPI(
  pluginId: string,
  baseApi: IPluginAPI,
  permissions: string[]
): IPluginAPI & Partial<typeof CADOperations & typeof CAMOperations & typeof FileSystem> {
  const api: Record<string, any> = {
    // Base API is always available
    ...baseApi
  };
  
  // CAD operations
  if (permissions.includes('cad:read')) {
    api.getElements = CADOperations.getElements;
    api.getElementById = CADOperations.getElementById;
    api.getElementsByType = CADOperations.getElementsByType;
  }
  
  if (permissions.includes('cad:write')) {
    api.createElement = CADOperations.createElement;
    api.updateElement = CADOperations.updateElement;
    api.deleteElement = CADOperations.deleteElement;
    api.transformElement = CADOperations.transformElement;
  }
  
  // CAM operations
  if (permissions.includes('cam:read')) {
    api.getToolpaths = CAMOperations.getToolpaths;
    api.getToolpathById = CAMOperations.getToolpathById;
    api.simulateToolpath = CAMOperations.simulateToolpath;
  }
  
  if (permissions.includes('cam:write')) {
    api.createToolpath = CAMOperations.createToolpath;
    api.updateToolpath = CAMOperations.updateToolpath;
    api.deleteToolpath = CAMOperations.deleteToolpath;
    api.generateGCode = CAMOperations.generateGCode;
  }
  
  // File system operations
  if (permissions.includes('storage:read')) {
    api.readFile = FileSystem.readFile;
    api.listFiles = FileSystem.listFiles;
  }
  
  if (permissions.includes('storage:write')) {
    api.writeFile = FileSystem.writeFile;
    api.deleteFile = FileSystem.deleteFile;
    api.saveAs = FileSystem.saveAs;
  }
  
  return api as IPluginAPI & Partial<typeof CADOperations & typeof CAMOperations & typeof FileSystem>;
}