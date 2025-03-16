// src/contexts/AIContextProvider.tsx
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useRouter } from 'next/router';
import { AIState, AIMode, AIHistoryItem, AISettings, AIModelType } from '@/src/types/AITypes';
import { unifiedAIService } from '@/src/lib/ai/ai-new/unifiedAIService';
import { aiAnalytics } from '@/src/lib/ai/ai-new/aiAnalytics';
import { aiCache } from '@/src/lib/ai/ai-new/aiCache';
import { AI_MODELS, AI_MODES, aiConfigManager } from '@/src/lib/ai/ai-new/aiConfigManager';

// Stato iniziale dell'AI
const initialState: AIState = {
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
    mcpEnabled: true,
    mcpStrategy: 'balanced',
    mcpCacheLifetime: 3600,
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

// Tipi di azioni per il reducer
type AIAction = 
  | { type: 'TOGGLE_AI'; payload: boolean }
  | { type: 'SET_MODEL'; payload: AIModelType }
  | { type: 'SET_TEMPERATURE'; payload: number }
  | { type: 'UPDATE_PERFORMANCE'; payload: Partial<AIState['performance']> }
  | { type: 'OPTIMIZE_SETTINGS'; payload: Partial<AISettings> }
  | { type: 'START_PROCESSING' }
  | { type: 'END_PROCESSING' }
  | { type: 'ADD_TO_HISTORY'; payload: AIHistoryItem }
  | { type: 'CLEAR_HISTORY' }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AISettings> }
  | { type: 'SET_MODE'; payload: AIMode }
  | { type: 'TOGGLE_ASSISTANT_VISIBILITY'; payload: boolean }
  | { type: 'TOGGLE_ASSISTANT_PANEL'; payload: boolean }
  | { type: 'SET_SUGGESTIONS'; payload: any[] }
  | { type: 'RECORD_ASSISTANT_ACTION'; payload: string };

// Reducer per gestire lo stato dell'AI
function aiReducer(state: AIState, action: AIAction): AIState {
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

// Interfaccia del contesto AI
interface AIContextType {
  state: AIState;
  dispatch: React.Dispatch<AIAction>;
  // Metodi per operazioni AI core
  textToCAD: (description: string, constraints?: any) => Promise<any>;
  optimizeGCode: (gcode: string, machineType: string) => Promise<any>;
  analyzeDesign: (elements: any[]) => Promise<any>;
  generateSuggestions: (context: string) => Promise<any[]>;
  // Operazioni dell'assistente
  showAssistant: () => void;
  hideAssistant: () => void;
  toggleAssistantPanel: () => void;
  // Selezione del modello
  selectOptimalModel: (taskComplexity: 'low' | 'medium' | 'high') => AIModelType;
  // Chat dell'assistente
  sendAssistantMessage: (message: string) => Promise<any>;
}

// Creazione del contesto
const AIContext = createContext<AIContextType | undefined>(undefined);

// Provider del contesto
export const AIContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(aiReducer, initialState);
  const router = useRouter();

  // Seleziona il modello ottimale in base alla complessità del task
  const selectOptimalModel = (taskComplexity: 'low' | 'medium' | 'high'): AIModelType => {
    if (!state.settings.autoModelSelection) return state.currentModel;

    return aiConfigManager.selectOptimalModel(taskComplexity);
  };

  // Monitora le prestazioni dell'AI
  useEffect(() => {
    const interval = setInterval(() => {
      const stats = aiAnalytics.getStats();
      dispatch({ 
        type: 'UPDATE_PERFORMANCE', 
        payload: {
          averageResponseTime: stats.averageResponseTime,
          successRate: stats.successRate,
          tokenUsage: stats.tokenUsage,
          lastSync: Date.now()
        }
      });
    }, 300000); // Ogni 5 minuti

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
    } else if (path.includes('/analysis')) {
      dispatch({ type: 'SET_MODE', payload: 'analysis' });
    } else {
      dispatch({ type: 'SET_MODE', payload: 'general' });
    }
  }, [router.pathname]);

  // Conversione da testo a elementi CAD
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
      
      // Aggiungi alla cronologia
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
            tokenUsage: {
              prompt: result.usage?.promptTokens || 0,
              completion: result.usage?.completionTokens || 0, 
              total: result.usage?.totalTokens || 0
            }
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
  
  // Ottimizzazione del G-code
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
            tokenUsage: {
              prompt: result.usage?.promptTokens || 0,
              completion: result.usage?.completionTokens || 0,
              total: result.usage?.totalTokens || 0
            }
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
  
  // Analisi del design
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
            tokenUsage: {
              prompt: result.usage?.promptTokens || 0,
              completion: result.usage?.completionTokens || 0,
              total: result.usage?.totalTokens || 0
            }
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
  
  // Generazione di suggerimenti contestuali
  const generateSuggestions = async (context: string) => {
    if (!state.isEnabled || !state.settings.autoSuggest) {
      return [];
    }
    
    try {
      const model = selectOptimalModel('low');
      
      const result = await unifiedAIService.generateSuggestions(context, state.mode);
      
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
  
  // Invia un messaggio all'assistente
  const sendAssistantMessage = async (message: string) => {
    if (!state.isEnabled) {
      return { success: false, data: null, error: 'AI is disabled' };
    }
    
    dispatch({ type: 'START_PROCESSING' });
    dispatch({ type: 'RECORD_ASSISTANT_ACTION', payload: 'message_sent' });
    
    try {
      const result = await unifiedAIService.processMessage(message, state.mode);
      
      if (result.success) {
        const action: AIHistoryItem = {
          id: `chat_${Date.now()}`,
          type: 'assistant_chat',
          timestamp: Date.now(),
          prompt: message,
          result: result.data,
          modelUsed: state.currentModel,
          processingTime: result.processingTime || 0,
          tokenUsage: result.usage ? {
            prompt: result.usage.promptTokens,
            completion: result.usage.completionTokens, 
            total: result.usage.totalTokens
          } : undefined
        };
        
        dispatch({ type: 'ADD_TO_HISTORY', payload: action });
      }
      
      return result;
    } catch (error) {
      console.error('Error in assistant message:', error);
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      dispatch({ type: 'END_PROCESSING' });
    }
  };
  
  // Operazioni dell'assistente
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

  // Valore del contesto
  const contextValue: AIContextType = {
    state,
    dispatch,
    textToCAD,
    optimizeGCode,
    analyzeDesign,
    generateSuggestions,
    showAssistant,
    hideAssistant,
    toggleAssistantPanel,
    selectOptimalModel,
    sendAssistantMessage
  };

  return (
    <AIContext.Provider value={contextValue}>
      {children}
    </AIContext.Provider>
  );
};

// Hook personalizzato per utilizzare il contesto AI
export const useAI = () => {
  const context = useContext(AIContext);
  if (context === undefined) {
    throw new Error('useAI must be used within an AIContextProvider');
  }
  return context;
};