import { usePluginStore } from '../core/PluginStore';
import { ExtensionDefinition } from '../core/types';

export type RenderingPhase = 
  | 'beforeRender' 
  | 'afterRender' 
  | 'beforeElement' 
  | 'afterElement';

export type RenderContext = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D | WebGLRenderingContext | WebGL2RenderingContext;
  viewport: {
    x: number;
    y: number;
    width: number;
    height: number;
    scale: number;
  };
  elements: any[];
  scene?: any; // For 3D rendering (e.g., Three.js scene)
  [key: string]: any;
};

export type RenderingHook = (context: RenderContext, element?: any) => void;

interface RenderingHookExtension extends ExtensionDefinition {
  metadata: {
    phase: RenderingPhase;
    priority: number;
    [key: string]: any;
  };
  handler: RenderingHook;
}

/**
 * Hook to get rendering hook extensions
 */
export function useRenderingHooks(phase: RenderingPhase) {
  const extensions = usePluginStore(
    state => state.getExtensionsByType('renderer') as RenderingHookExtension[]
  );
  
  // Filter by phase and sort by priority
  return extensions
    .filter(ext => ext.metadata.phase === phase)
    .sort((a, b) => a.metadata.priority - b.metadata.priority);
}

/**
 * Register a new rendering hook
 */
export function registerRenderingHook(
  pluginId: string,
  phase: RenderingPhase,
  hook: RenderingHook,
  priority: number = 0,
  metadata: Record<string, any> = {}
): string {
  return usePluginStore.getState().registerExtension(pluginId, {
    id: `renderer-${phase}-${Date.now()}`,
    type: 'renderer',
    handler: hook,
    metadata: {
      ...metadata,
      phase,
      priority
    }
  });
}

/**
 * Execute rendering hooks for a specific phase
 */
export function executeRenderingHooks(
  phase: RenderingPhase,
  context: RenderContext,
  element?: any
): void {
  const hooks = usePluginStore.getState().getExtensionsByType('renderer') as RenderingHookExtension[];
  
  // Filter by phase and sort by priority
  const filtered = hooks
    .filter(hook => hook.metadata.phase === phase)
    .sort((a, b) => a.metadata.priority - b.metadata.priority);
  
  // Execute each hook
  for (const hook of filtered) {
    try {
      hook.handler(context, element);
    } catch (error) {
      console.error(`Error executing rendering hook ${hook.id}:`, error);
    }
  }
}