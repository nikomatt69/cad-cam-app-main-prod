// src/store/localCadLibraryStore.ts
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { 
  storeData, 
  retrieveData, 
  STORAGE_KEYS 
} from '@/src/lib/localStorageService';
import { Element } from '@/src/store/elementsStore';
import { Layer } from '@/src/store/layerStore';

// Define a CAD drawing with all necessary data to reproduce it
export interface LocalCadDrawing {
  id: string;
  name: string;
  description?: string;
  elements: Element[];
  layers: Layer[];
  thumbnail?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  meta?: {
    software: string;
    version: string;
    [key: string]: any;
  };
}

export interface CadLibraryState {
  drawings: LocalCadDrawing[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadLibrary: () => void;
  saveLibrary: () => boolean;
  addDrawing: (drawing: Omit<LocalCadDrawing, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateDrawing: (id: string, updates: Partial<Omit<LocalCadDrawing, 'id' | 'createdAt' | 'updatedAt'>>) => boolean;
  deleteDrawing: (id: string) => boolean;
  clearLibrary: () => boolean;
  exportDrawing: (id: string) => LocalCadDrawing | null;
  importDrawing: (drawing: Omit<LocalCadDrawing, 'id' | 'createdAt' | 'updatedAt'>) => string;
  searchDrawings: (query: string) => LocalCadDrawing[];
}

export const useLocalCadLibraryStore = create<CadLibraryState>((set, get) => ({
  drawings: [],
  isLoading: false,
  error: null,
  
  // Load library from localStorage
  loadLibrary: () => {
    set({ isLoading: true, error: null });
    
    try {
      const library = retrieveData<LocalCadDrawing[]>(STORAGE_KEYS.CAD_LIBRARY) || [];
      set({ drawings: library, isLoading: false });
    } catch (error) {
      set({ 
        error: `Failed to load CAD library: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isLoading: false
      });
    }
  },
  
  // Save library to localStorage
  saveLibrary: () => {
    try {
      const { drawings } = get();
      const success = storeData(STORAGE_KEYS.CAD_LIBRARY, drawings);
      
      if (!success) {
        set({ error: 'Failed to save library: Storage limit may be exceeded' });
        return false;
      }
      
      return true;
    } catch (error) {
      set({ 
        error: `Failed to save CAD library: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      return false;
    }
  },
  
  // Add a new drawing to the library
  addDrawing: (drawing) => {
    const now = new Date().toISOString();
    const newDrawing: LocalCadDrawing = {
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
      ...drawing,
      meta: {
        software: 'CAD/CAM FUN',
        version: '1.0.0',
        ...drawing.meta
      }
    };
    
    set((state) => ({
      drawings: [...state.drawings, newDrawing]
    }));
    
    // Save the updated library
    get().saveLibrary();
    
    return newDrawing.id;
  },
  
  // Update an existing drawing
  updateDrawing: (id, updates) => {
    const { drawings } = get();
    const drawingIndex = drawings.findIndex(d => d.id === id);
    
    if (drawingIndex === -1) {
      set({ error: `Drawing with ID ${id} not found` });
      return false;
    }
    
    const updatedDrawings = [...drawings];
    updatedDrawings[drawingIndex] = {
      ...updatedDrawings[drawingIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    set({ drawings: updatedDrawings });
    
    // Save the updated library
    return get().saveLibrary();
  },
  
  // Delete a drawing from the library
  deleteDrawing: (id) => {
    const { drawings } = get();
    const filteredDrawings = drawings.filter(d => d.id !== id);
    
    // If no drawings were removed, the ID was invalid
    if (filteredDrawings.length === drawings.length) {
      set({ error: `Drawing with ID ${id} not found` });
      return false;
    }
    
    set({ drawings: filteredDrawings });
    
    // Save the updated library
    return get().saveLibrary();
  },
  
  // Clear the entire library
  clearLibrary: () => {
    set({ drawings: [] });
    return get().saveLibrary();
  },
  
  // Export a drawing (for external use)
  exportDrawing: (id) => {
    const { drawings } = get();
    const drawing = drawings.find(d => d.id === id);
    
    if (!drawing) {
      set({ error: `Drawing with ID ${id} not found` });
      return null;
    }
    
    return { ...drawing };
  },
  
  // Import a drawing (from external source)
  importDrawing: (drawing) => {
    // Use the addDrawing method to ensure consistent IDs and timestamps
    return get().addDrawing(drawing);
  },
  
  // Search for drawings by name, description, or tags
  searchDrawings: (query) => {
    const { drawings } = get();
    const lowerCaseQuery = query.toLowerCase();
    
    return drawings.filter(drawing => 
      drawing.name.toLowerCase().includes(lowerCaseQuery) ||
      (drawing.description && drawing.description.toLowerCase().includes(lowerCaseQuery)) ||
      (drawing.tags && drawing.tags.some(tag => tag.toLowerCase().includes(lowerCaseQuery)))
    );
  }
}));

// Initialize the library when the module is imported
if (typeof window !== 'undefined') {
  useLocalCadLibraryStore.getState().loadLibrary();
}