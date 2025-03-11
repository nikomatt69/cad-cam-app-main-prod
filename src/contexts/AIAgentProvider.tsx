import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { AI_MODELS, MODEL_CAPABILITIES } from '../lib/ai/aiConfigManager';
import { aiAnalytics } from '../lib/ai/aiAnalytics';
import { aiCache } from '../lib/ai/aiCache';
import { unifiedAIService } from '../lib/ai/unifiedAIService';
import { AIModelType } from '../types/ai';
import { Element } from '../store/elementsStore';

// Definizione dello stato dell'agent AI unificato
export interface AIAgentState {
  isEnabled: boolean;
  currentModel: AIModelType;
  temperature: number;
  isProcessing: boolean;
  mode: 'cad' | 'cam' | 'gcode' | 'toolpath' | 'general';
  assistant: {
    isVisible: boolean;
    isPanelOpen: boolean;
    suggestions: any[];
    lastAction: string | null;
  };
  history: {
    id: string;
    type: string;
    timestamp: number;
    prompt?: string;
    result?: any;
    modelUsed: AIModelType;
    processingTime: number;
    tokenUsage?: {
      prompt: number;
      completion: number;
      total: number;
    };
  }[];
  settings: {
    autoSuggest: boolean;
    cacheEnabled: boolean;
    analyticsEnabled: boolean;
    maxTokens: number;
    suggestThreshold: number;
    customPrompts: Record<string, string>;
    autoModelSelection: boolean;
    costOptimization: boolean;
  };
  performance: {
    averageResponseTime: number;
    successRate: number;
    tokenUsage: number;
    lastSync: number;
  };
}

// Stato iniziale
const initialState: AIAgentState = {
  isEnabled: true,
  currentModel: AI_MODELS.CLAUDE_SONNET,
  temperature: 0.7,
  isProcessing: false,
  mode: 'general',
  assistant: {
    isVisible: false,
    isPanelOpen: false,
    suggestions: [],
    lastAction: null
  },
  history: [],
  settings: {
    autoSuggest: true,
    cacheEnabled: true,
    analyticsEnabled: true,
    maxTokens: 4000,
    suggestThreshold: 0.7,
    customPrompts: {},
    autoModelSelection: true,
    costOptimization: true
  },
  performance: {
    averageResponseTime: 0,
    successRate: 100,
    tokenUsage: 0,
    lastSync: Date.now()
  }
};

// Definizione delle azioni
type AIAgentAction = 
  | { type: 'TOGGLE_AI'; payload: boolean }
  | { type: 'SET_MODEL'; payload: AIModelType }
  | { type: 'SET_TEMPERATURE'; payload: number }
  | { type: 'UPDATE_PERFORMANCE'; payload: Partial<AIAgentState['performance']> }
  | { type: 'OPTIMIZE_SETTINGS'; payload: Partial<AIAgentState['settings']> }
  | { type: 'START_PROCESSING' }
  | { type: 'END_PROCESSING' }
  | { type: 'ADD_TO_HISTORY'; payload: any }
  | { type: 'CLEAR_HISTORY' }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AIAgentState['settings']> }
  | { type: 'SET_MODE'; payload: AIAgentState['mode'] }
  | { type: 'TOGGLE_ASSISTANT_VISIBILITY'; payload: boolean }
  | { type: 'TOGGLE_ASSISTANT_PANEL'; payload: boolean }
  | { type: 'SET_SUGGESTIONS'; payload: any[] }
  | { type: 'RECORD_ASSISTANT_ACTION'; payload: string };

// Reducer per gestire le azioni
function aiAgentReducer(state: AIAgentState, action: AIAgentAction): AIAgentState {
  switch (action.type) {
    case 'TOGGLE_AI':
      return { ...state, isEnabled: action.payload };
    case 'SET_MODEL':
      return { ...state, currentModel: action.payload };
    case 'SET_TEMPERATURE':
      return { ...state, temperature: action.payload };
    case 'UPDATE_PERFORMANCE':
      return { 
        ...state, 
        performance: { ...state.performance, ...action.payload } 
      };
    case 'OPTIMIZE_SETTINGS':
      return { 
        ...state, 
        settings: { ...state.settings, ...action.payload } 
      };
    case 'START_PROCESSING':
      return { ...state, isProcessing: true };
    case 'END_PROCESSING':
      return { ...state, isProcessing: false };
    case 'ADD_TO_HISTORY':
      return { 
        ...state, 
        history: [action.payload, ...state.history].slice(0, 50) 
      };
    case 'CLEAR_HISTORY':
      return { ...state, history: [] };
    case 'UPDATE_SETTINGS':
      return { 
        ...state, 
        settings: { ...state.settings, ...action.payload } 
      };
    case 'SET_MODE':
      return { ...state, mode: action.payload };
    case 'TOGGLE_ASSISTANT_VISIBILITY':
      return { 
        ...state, 
        assistant: { ...state.assistant, isVisible: action.payload } 
      };
    case 'TOGGLE_ASSISTANT_PANEL':
      return { 
        ...state, 
        assistant: { ...state.assistant, isPanelOpen: action.payload } 
      };
    case 'SET_SUGGESTIONS':
      return { 
        ...state, 
        assistant: { ...state.assistant, suggestions: action.payload } 
      };
    case 'RECORD_ASSISTANT_ACTION':
      return { 
        ...state, 
        assistant: { ...state.assistant, lastAction: action.payload } 
      };
    default:
      return state;
  }
}

// Creazione del contesto
interface AIAgentContextType {
  state: AIAgentState;
  dispatch: React.Dispatch<AIAgentAction>;
  // Core AI operations
  textToCAD: (description: string, constraints?: any) => Promise<any>;
  optimizeGCode: (gcode: string, machineType: string) => Promise<any>;
  analyzeDesign: (elements: any[]) => Promise<any>;
  generateSuggestions: (context: string) => Promise<any[]>;
  // Assistant operations
  showAssistant: () => void;
  hideAssistant: () => void;
  toggleAssistantPanel: () => void;
  // Model selection
  selectOptimalModel: (taskComplexity: 'low' | 'medium' | 'high') => AIModelType;
}

const AIAgentContext = createContext<AIAgentContextType | undefined>(undefined);

// Provider component
export const AIAgentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(aiAgentReducer, initialState);
  const router = useRouter();
  const { data: session } = useSession();

  // Automatic model selection based on task complexity
  const selectOptimalModel = (taskComplexity: 'low' | 'medium' | 'high') => {
    if (!state.settings.autoModelSelection) return state.currentModel;

    switch (taskComplexity) {
      case 'high':
        return AI_MODELS.CLAUDE_OPUS;
      case 'medium':
        return AI_MODELS.CLAUDE_SONNET;
      case 'low':
        return AI_MODELS.CLAUDE_HAIKU;
    }
  };

  // Performance monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      const currentPerf = aiAnalytics.getStats();
      dispatch({ type: 'UPDATE_PERFORMANCE', payload: currentPerf });
    }, 300000); // Every 5 minutes

    return () => clearInterval(interval);
  }, []);

  // Imposta la modalità in base al percorso URL
  useEffect(() => {
    const path = router.pathname;
    if (path.includes('/cad')) {
      dispatch({ type: 'SET_MODE', payload: 'cad' });
    } else if (path.includes('/cam')) {
      dispatch({ type: 'SET_MODE', payload: 'cam' });
    } else if (path.includes('/gcode')) {
      dispatch({ type: 'SET_MODE', payload: 'gcode' });
    } else if (path.includes('/toolpath')) {
      dispatch({ type: 'SET_MODE', payload: 'toolpath' });
    } else {
      dispatch({ type: 'SET_MODE', payload: 'general' });
    }
  }, [router.pathname]);

  // Core AI operations
  const textToCAD = async (description: string, constraints?: any) => {
    if (!state.isEnabled) return { success: false, data: null, error: 'AI is disabled' };
    
    dispatch({ type: 'START_PROCESSING' });
    
    try {
      const model = selectOptimalModel('medium');
      const startTime = Date.now();
      
      const result = await unifiedAIService.textToCADElements({
        description,
        constraints,
        complexity: 'moderate',
        style: 'precise'
      });
      
      const processingTime = Date.now() - startTime;
      
      // Add to history
      if (result.success && result.data) {
        dispatch({ 
          type: 'ADD_TO_HISTORY', 
          payload: {
            id: `cad_${Date.now()}`,
            type: 'text_to_cad',
            timestamp: Date.now(),
            prompt: description,
            result: result.data,
            modelUsed: model,
            processingTime,
            tokenUsage: result.usage
          }
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error in textToCAD:', error);
      return { 
        success: false, 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    } finally {
      dispatch({ type: 'END_PROCESSING' });
    }
  };
  
  const optimizeGCode = async (gcode: string, machineType: string) => {
    if (!state.isEnabled) return { success: false, data: null, error: 'AI is disabled' };
    
    dispatch({ type: 'START_PROCESSING' });
    
    try {
      const model = selectOptimalModel('medium');
      const startTime = Date.now();
      
      const result = await unifiedAIService.optimizeGCode(gcode, machineType);
      
      const processingTime = Date.now() - startTime;
      
      if (result.success) {
        dispatch({
          type: 'ADD_TO_HISTORY',
          payload: {
            id: `gcode_${Date.now()}`,
            type: 'gcode_optimization',
            timestamp: Date.now(),
            prompt: `Optimize G-code for ${machineType}`,
            modelUsed: model,
            processingTime,
            tokenUsage: result.usage
          }
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error in optimizeGCode:', error);
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      dispatch({ type: 'END_PROCESSING' });
    }
  };
  
  const analyzeDesign = async (elements: any[]) => {
    if (!state.isEnabled) return { success: false, data: null, error: 'AI is disabled' };
    
    dispatch({ type: 'START_PROCESSING' });
    
    try {
      const model = selectOptimalModel('high');
      const startTime = Date.now();
      
      const result = await unifiedAIService.analyzeDesign(elements);
      
      const processingTime = Date.now() - startTime;
      
      if (result.success) {
        dispatch({
          type: 'ADD_TO_HISTORY',
          payload: {
            id: `analysis_${Date.now()}`,
            type: 'design_analysis',
            timestamp: Date.now(),
            result: result.data,
            modelUsed: model,
            processingTime,
            tokenUsage: result.usage
          }
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error in analyzeDesign:', error);
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      dispatch({ type: 'END_PROCESSING' });
    }
  };
  
  const generateSuggestions = async (context: string) => {
    if (!state.isEnabled || !state.settings.autoSuggest) {
      return [];
    }
    
    try {
      const model = selectOptimalModel('low');
      
      const result = await unifiedAIService.generateSuggestions({
        context,
        mode: state.mode,
        model,
        threshold: state.settings.suggestThreshold
      });
      
      if (result.success && result.data) {
        dispatch({ type: 'SET_SUGGESTIONS', payload: result.data });
        return result.data;
      }
      
      return [];
    } catch (error) {
      console.error('Error generating suggestions:', error);
      return [];
    }
  };
  
  // Assistant operations
  const showAssistant = () => {
    dispatch({ type: 'TOGGLE_ASSISTANT_VISIBILITY', payload: true });
  };
  
  const hideAssistant = () => {
    dispatch({ type: 'TOGGLE_ASSISTANT_VISIBILITY', payload: false });
  };
  
  const toggleAssistantPanel = () => {
    dispatch({ 
      type: 'TOGGLE_ASSISTANT_PANEL', 
      payload: !state.assistant.isPanelOpen 
    });
  };

  // Context value
  const contextValue: AIAgentContextType = {
    state,
    dispatch,
    textToCAD,
    optimizeGCode,
    analyzeDesign,
    generateSuggestions,
    showAssistant,
    hideAssistant,
    toggleAssistantPanel,
    selectOptimalModel
  };

  return (
    <AIAgentContext.Provider value={contextValue}>
      {children}
    </AIAgentContext.Provider>
  );
};

// Custom hook per utilizzare il contesto
export const useAIAgent = () => {
  const context = useContext(AIAgentContext);
  if (context === undefined) {
    throw new Error('useAIAgent must be used within an AIAgentProvider');
  }
  return context;
}; 