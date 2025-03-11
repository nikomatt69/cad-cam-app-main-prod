// src/contexts/AIContext.tsx
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { AIServiceConfig, AIModelType } from '../types/ai';
import { unifiedAIService } from '../lib/ai/unifiedAIService';
import { aiAnalytics } from '../lib/ai/aiAnalytics';
import { aiCache } from '../lib/ai/aiCache';
import { DEFAULT_CONFIG, AI_MODELS, MODEL_CAPABILITIES } from '../lib/ai/aiConfigManager';
import { optimizeAISettings } from '../lib/ai/aiPerformanceMonitor';

// Enhanced state interface
interface AIState {
  isEnabled: boolean;
  currentModel: AIModelType;
  temperature: number;
  isProcessing: boolean;
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

// Enhanced initial state
const initialState: AIState = {
  isEnabled: true,
  currentModel: DEFAULT_CONFIG.defaultModel as AIModelType,
  temperature: DEFAULT_CONFIG.temperature,
  isProcessing: false,
  history: [],
  settings: {
    autoSuggest: true,
    cacheEnabled: true,
    analyticsEnabled: true,
    maxTokens: DEFAULT_CONFIG.maxTokens,
    suggestThreshold: 0.7,
    customPrompts: {},
    autoModelSelection: true,
    costOptimization: true,
  },
  performance: {
    averageResponseTime: 0,
    successRate: 100,
    tokenUsage: 0,
    lastSync: Date.now(),
  },
};

// Add new actions
type AIAction = 
  | { type: 'TOGGLE_AI'; payload: boolean }
  | { type: 'SET_MODEL'; payload: AIModelType }
  | { type: 'SET_TEMPERATURE'; payload: number }
  | { type: 'UPDATE_PERFORMANCE'; payload: Partial<AIState['performance']> }
  | { type: 'OPTIMIZE_SETTINGS'; payload: Partial<AIState['settings']> }
  | { type: 'START_PROCESSING' }
  | { type: 'END_PROCESSING' }
  | { type: 'ADD_TO_HISTORY', payload: any }
  | { type: 'CLEAR_HISTORY' }
  | { type: 'UPDATE_SETTINGS', payload: Partial<AIState['settings']> };

// Enhanced reducer
function aiReducer(state: AIState, action: AIAction): AIState {
  switch (action.type) {
    case 'UPDATE_PERFORMANCE':
      return {
        ...state,
        performance: { ...state.performance, ...action.payload },
      };
    case 'OPTIMIZE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };
    case 'TOGGLE_AI':
      return { ...state, isEnabled: action.payload };
    case 'SET_MODEL':
      return { ...state, currentModel: action.payload };
    case 'SET_TEMPERATURE':
      return { ...state, temperature: action.payload };
    case 'START_PROCESSING':
      return { ...state, isProcessing: true };
    case 'END_PROCESSING':
      return { ...state, isProcessing: false };
    case 'ADD_TO_HISTORY':
      return { 
        ...state, 
        history: [action.payload, ...state.history].slice(0, 50) // Keep last 50 items
      };
    case 'CLEAR_HISTORY':
      return { ...state, history: [] };
    case 'UPDATE_SETTINGS':
      return { 
        ...state, 
        settings: { ...state.settings, ...action.payload }
      };
    default:
      return state;
  }
}

// Create context
interface AIContextType {
  state: AIState;
  dispatch: React.Dispatch<AIAction>;
  selectOptimalModel: (taskComplexity: 'low' | 'medium' | 'high') => AIModelType;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

// Enhanced provider component
export const AIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(aiReducer, initialState);

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
  }, [state.history]);

  // Cost optimization
  useEffect(() => {
    if (state.settings.costOptimization) {
      const optimizedSettings = optimizeAISettings(state);
      if (optimizedSettings.maxTokens) {
        dispatch({ 
          type: 'OPTIMIZE_SETTINGS', 
          payload: {
            maxTokens: optimizedSettings.maxTokens,
            autoModelSelection: optimizedSettings.autoModelSelection,
            cacheEnabled: optimizedSettings.cacheEnabled,
            analyticsEnabled: optimizedSettings.analyticsEnabled
          }
        });
      }
    }
  }, [state.performance, state.settings.costOptimization]);

  const value = {
    state,
    dispatch,
    selectOptimalModel,
  };

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
};

// Custom hook to use the AI Context
export const useAI = () => {
  const context = useContext(AIContext);
  if (context === undefined) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
};

/**
 * Helper hook that provides common AI functions for components
 */
export const useAIAssistance = () => {
  const { state, dispatch, selectOptimalModel } = useAI();
  
  /**
   * Convert text description to CAD elements
   */
  const textToCAD = async (description: string, constraints?: any) => {
    if (!state.isEnabled) return { success: false, data: null, error: 'AI is disabled' };
    
    dispatch({ type: 'START_PROCESSING' });
    
    try {
      const result = await unifiedAIService.textToCADElements({
        description,
        constraints,
        complexity: 'moderate',
        style: 'precise'
      });
      
      // Add to history
      if (result.success && result.data) {
        dispatch({ 
          type: 'ADD_TO_HISTORY', 
          payload: {
            id: `cad_${Date.now()}`,
            type: 'text_to_cad',
            timestamp: Date.now(),
            prompt: description,
            result: result.data
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
  
  /**
   * Generate optimized G-code for CNC machines
   */
  const optimizeGCode = async (gcode: string, machineType: string) => {
    if (!state.isEnabled) return { success: false, data: null, error: 'AI is disabled' };
    
    dispatch({ type: 'START_PROCESSING' });
    
    try {
      const result = await unifiedAIService.optimizeGCode(gcode, machineType);
      
      // Add to history
      if (result.success && result.data) {
        dispatch({ 
          type: 'ADD_TO_HISTORY', 
          payload: {
            id: `gcode_${Date.now()}`,
            type: 'gcode_optimization',
            timestamp: Date.now(),
            result: result.data
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
  
  /**
   * Analyze a CAD design and provide suggestions
   */
  const analyzeDesign = async (elements: any[]) => {
    if (!state.isEnabled) return { success: false, data: null, error: 'AI is disabled' };
    
    dispatch({ type: 'START_PROCESSING' });
    
    try {
      const result = await unifiedAIService.analyzeDesign(elements);
      
      // Add to history
      if (result.success && result.data) {
        dispatch({ 
          type: 'ADD_TO_HISTORY', 
          payload: {
            id: `analysis_${Date.now()}`,
            type: 'design_analysis',
            timestamp: Date.now(),
            result: result.data
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
  
  /**
   * Clear the AI cache
   */
  const clearCache = () => {
    aiCache.clear();
  };
  
  return {
    isEnabled: state.isEnabled,
    isProcessing: state.isProcessing,
    model: state.currentModel,
    temperature: state.temperature,
    settings: state.settings,
    history: state.history,
    textToCAD,
    optimizeGCode,
    analyzeDesign,
    clearCache,
    toggleAI: (enabled: boolean) => dispatch({ type: 'TOGGLE_AI', payload: enabled }),
    setModel: (model: AIModelType) => dispatch({ type: 'SET_MODEL', payload: model }),
    setTemperature: (temp: number) => dispatch({ type: 'SET_TEMPERATURE', payload: temp }),
    updateSettings: (settings: Partial<AIState['settings']>) => 
      dispatch({ type: 'UPDATE_SETTINGS', payload: settings }),
    clearHistory: () => dispatch({ type: 'CLEAR_HISTORY' }),
    selectOptimalModel,
  };
};

export default AIContext;


