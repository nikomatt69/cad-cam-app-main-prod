// src/store/cadStore.ts
import { create } from 'zustand';

type ViewMode = '2d' | '3d';
type OriginPreset = 'center' | 'bottomLeft' | 'topRight' | 'bottomRight' | 'topLeft';

interface MachineConfig {
  id: string;
  name: string;
  config: {
    workVolume?: {
      x: number;
      y: number;
      z: number;
    };
    type: string;
    maxSpindleSpeed?: number;
    maxFeedRate?: number;
  };
}

interface Workpiece {
  width: number;
  height: number;
  depth: number;
  material: string;
  units: 'mm' | 'inch';
}

interface OriginOffset {
  x: number;
  y: number;
  z: number;
}

interface CADState {
  viewMode: ViewMode;
  activeTool: string;
  gridVisible: boolean;
  axisVisible: boolean;
  workpiece: Workpiece;
  selectedMachine: MachineConfig | null;
  originOffset: OriginOffset;
  
  // Actions
  setViewMode: (mode: ViewMode) => void;
  setActiveTool: (tool: string) => void;
  toggleGrid: () => void;
  toggleAxis: () => void;
  setWorkpiece: (workpiece: Workpiece) => void;
  setSelectedMachine: (machine: MachineConfig | null) => void;
  
  // Origin actions
  setOriginOffset: (offset: OriginOffset) => void;
  resetOrigin: () => void;
  setOriginPreset: (preset: OriginPreset) => void;
}

export const useCADStore = create<CADState>((set, get) => ({
  viewMode: '3d',
  activeTool: 'select',
  gridVisible: true,
  axisVisible: true,
  workpiece: {
    width: 100,
    height: 200,
    depth: 20,
    material: 'aluminum',
    units: 'mm'
  },
  selectedMachine: null,
  originOffset: { x: 0, y: 0, z: 0 },
  
  setViewMode: (mode) => set({ viewMode: mode }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  toggleGrid: () => set((state) => ({ gridVisible: !state.gridVisible })),
  toggleAxis: () => set((state) => ({ axisVisible: !state.axisVisible })),
  setWorkpiece: (workpiece) => set({ workpiece }),
  setSelectedMachine: (machine) => set({ selectedMachine: machine }),
  
  setOriginOffset: (offset) => set({ originOffset: offset }),
  
  resetOrigin: () => set({ originOffset: { x: 0, y: 0, z: 0 } }),
  
  setOriginPreset: (preset) => {
    const { workpiece } = get();
    const halfWidth = workpiece.width / 2;
    const halfHeight = workpiece.height / 2;
    const halfDepth = workpiece.depth / 2;
    
    switch (preset) {
      case 'center':
        set({ originOffset: { x: 0, y: 0, z: 0 } });
        break;
      case 'bottomLeft':
        set({ originOffset: { x: halfWidth, y: halfHeight, z: -halfDepth } });
        break;
      case 'topRight':
        set({ originOffset: { x: halfWidth, y: halfHeight, z: halfDepth } });
        break;
      case 'bottomRight':
        set({ originOffset: { x: halfWidth, y: -halfHeight, z: -halfDepth } });
        break;
      case 'topLeft':
        set({ originOffset: { x: halfWidth, y: halfHeight, z: halfDepth } });
        break;
    }
  }
}));