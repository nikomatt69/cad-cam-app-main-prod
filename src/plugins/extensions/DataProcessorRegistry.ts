import { usePluginStore } from '../core/PluginStore';
import { ExtensionDefinition } from '../core/types';

export type DataProcessorType = 'importer' | 'exporter';
export type FileFormat = string; // e.g., 'stl', 'obj', 'step', etc.
export type Processor = (data: any, options?: any) => Promise<any>;

interface DataProcessorExtension extends ExtensionDefinition {
  metadata: {
    formats: FileFormat[];
    name: string;
    description?: string;
    [key: string]: any;
  };
  handler: Processor;
}

/**
 * Hook to get data processor extensions
 */
export function useDataProcessors(
  type: DataProcessorType,
  format?: FileFormat
) {
  const extensions = usePluginStore(
    state => state.getExtensionsByType(type) as DataProcessorExtension[]
  );
  
  if (format) {
    return extensions.filter(ext => 
      ext.metadata.formats.includes(format)
    );
  }
  
  return extensions;
}

/**
 * Register a new data processor
 */
export function registerDataProcessor(
  pluginId: string,
  type: DataProcessorType,
  formats: FileFormat[],
  name: string,
  processor: Processor,
  metadata: Record<string, any> = {}
): string {
  return usePluginStore.getState().registerExtension(pluginId, {
    id: `${type}-${formats.join('-')}-${Date.now()}`,
    type,
    handler: processor,
    metadata: {
      ...metadata,
      formats,
      name
    }
  });
}

/**
 * Get all supported import formats
 */
export function getSupportedImportFormats(): FileFormat[] {
  const importers = usePluginStore.getState().getExtensionsByType('importer') as DataProcessorExtension[];
  const formats = new Set<FileFormat>();
  
  importers.forEach(importer => {
    importer.metadata.formats.forEach(format => formats.add(format));
  });
  
  return Array.from(formats);
}

/**
 * Get all supported export formats
 */
export function getSupportedExportFormats(): FileFormat[] {
  const exporters = usePluginStore.getState().getExtensionsByType('exporter') as DataProcessorExtension[];
  const formats = new Set<FileFormat>();
  
  exporters.forEach(exporter => {
    exporter.metadata.formats.forEach(format => formats.add(format));
  });
  
  return Array.from(formats);
}

/**
 * Process data using a specific processor
 */
export async function processData(
  processorId: string,
  data: any,
  options?: any
): Promise<any> {
  const store = usePluginStore.getState();
  const processorTypes: DataProcessorType[] = ['importer', 'exporter'];
  
  for (const type of processorTypes) {
    const processors = store.getExtensionsByType(type) as DataProcessorExtension[];
    const processor = processors.find(p => p.id === processorId);
    
    if (processor && processor.handler) {
      return processor.handler(data, options);
    }
  }
  
  throw new Error(`Processor ${processorId} not found`);
}