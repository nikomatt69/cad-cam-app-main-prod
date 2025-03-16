// src/lib/ai/aiConfigManager.ts

import { AIMode, AIModelType, AIServiceConfig } from "@/src/types/AITypes";


/**
 * Configurazione centralizzata per tutti i modelli e le modalità AI
 */

// Definizione dei modelli AI disponibili
export const AI_MODELS = {
  CLAUDE_SONNET: 'claude-3-5-sonnet-20240229',
  CLAUDE_OPUS: 'claude-3-opus-20240229',
  CLAUDE_HAIKU: 'claude-3-haiku-20240229',
  CLAUDE_SONNET_7: 'claude-3-7-sonnet-20250219',
} as const;

// Definizione delle modalità AI
export const AI_MODES: Record<string, AIMode> = {
  CAD: 'cad',
  CAM: 'cam',
  GCODE: 'gcode',
  TOOLPATH: 'toolpath',
  ANALYSIS: 'analysis',
  GENERAL: 'general',
} as const;

// Configurazione predefinita per il servizio AI
export const DEFAULT_CONFIG: AIServiceConfig = {
  defaultModel: AI_MODELS.CLAUDE_SONNET,
  maxTokens: 4000,
  temperature: 0.7,
  cacheEnabled: true,
  analyticsEnabled: true,
  allowBrowser: true,
};

// Mappatura delle capacità per ciascun modello
export const MODEL_CAPABILITIES = {
  [AI_MODELS.CLAUDE_OPUS]: {
    maxTokens: 8000,
    bestFor: ['complex_design', 'detailed_analysis', 'high_quality_content'],
    costTier: 'high',
    tokensPerSecond: 15,
    supportedFeatures: ['complex_reasoning', 'code_generation', 'technical_analysis']
  },
  [AI_MODELS.CLAUDE_SONNET]: {
    maxTokens: 4000,
    bestFor: ['general_purpose', 'design_assistance', 'balanced_performance'],
    costTier: 'medium',
    tokensPerSecond: 25,
    supportedFeatures: ['reasoning', 'code_generation', 'technical_analysis']
  },
  [AI_MODELS.CLAUDE_HAIKU]: {
    maxTokens: 2000,
    bestFor: ['quick_suggestions', 'simple_tasks', 'interactive_assistance'],
    costTier: 'low',
    tokensPerSecond: 40,
    supportedFeatures: ['basic_reasoning', 'text_completion', 'simple_assistance']
  },
  [AI_MODELS.CLAUDE_SONNET_7]: {
    maxTokens: 6000,
    bestFor: ['advanced_reasoning', 'complex_design', 'enhanced_analysis'],
    costTier: 'medium',
    tokensPerSecond: 30,
    supportedFeatures: ['enhanced_reasoning', 'code_generation', 'technical_analysis', 'complex_reasoning']
  },
} as const;

// Mappatura dei costi per token per ciascun modello
export const MODEL_COSTS: Record<AIModelType, { input: number, output: number }> = {
  [AI_MODELS.CLAUDE_OPUS]: { input: 0.015, output: 0.075 },      // $ per 1K tokens
  [AI_MODELS.CLAUDE_SONNET]: { input: 0.008, output: 0.024 },    // $ per 1K tokens
  [AI_MODELS.CLAUDE_HAIKU]: { input: 0.002, output: 0.01 },      // $ per 1K tokens
  [AI_MODELS.CLAUDE_SONNET_7]: { input: 0.008, output: 0.024 },  // $ per 1K tokens
};

// Contesto predefinito per ciascuna modalità AI
export const MODE_CONTEXTS: Record<AIMode, string> = {
  cad: 'You are a CAD design expert assistant helping users create and optimize 3D models.',
  cam: 'You are a CAM programming expert helping users create efficient machining strategies.',
  gcode: 'You are a G-code programming expert helping users create and optimize CNC machine instructions.',
  toolpath: 'You are a toolpath optimization expert helping users create efficient cutting paths.',
  analysis: 'You are a design analysis expert helping users evaluate and improve their CAD models.',
  general: 'You are a helpful AI assistant for CAD/CAM software.'
};

/**
 * Classe per la gestione della configurazione AI
 */
export class AIConfigManager {
  private config: AIServiceConfig;
  
  constructor(initialConfig?: Partial<AIServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...initialConfig };
  }
  
  /**
   * Ottiene la configurazione corrente
   */
  getConfig(): AIServiceConfig {
    return { ...this.config };
  }
  
  /**
   * Aggiorna la configurazione
   */
  updateConfig(newConfig: Partial<AIServiceConfig>): AIServiceConfig {
    this.config = { ...this.config, ...newConfig };
    return this.getConfig();
  }
  
  /**
   * Seleziona il modello ottimale in base alla complessità del task
   */
  selectOptimalModel(taskComplexity: 'low' | 'medium' | 'high'): AIModelType {
    // Se l'auto-selezione è disabilitata, usa il modello predefinito
    if (!this.config.autoModelSelection?.enabled) {
      return this.config.defaultModel;
    }
    
    switch (taskComplexity) {
      case 'high':
        return AI_MODELS.CLAUDE_OPUS;
      case 'medium':
        return AI_MODELS.CLAUDE_SONNET;
      case 'low':
        return AI_MODELS.CLAUDE_HAIKU;
      default:
        return this.config.defaultModel;
    }
  }
  
  /**
   * Ottiene il contesto predefinito per una modalità
   */
  getModeContext(mode: AIMode): string {
    return MODE_CONTEXTS[mode] || MODE_CONTEXTS.general;
  }
  
  /**
   * Calcola il costo stimato per una richiesta
   */
  estimateCost(model: AIModelType, inputTokens: number, outputTokens: number): number {
    const costs = MODEL_COSTS[model] || MODEL_COSTS[AI_MODELS.CLAUDE_SONNET];
    
    return (
      (inputTokens / 1000) * costs.input +
      (outputTokens / 1000) * costs.output
    );
  }
  
  /**
   * Ottiene i parametri ottimali per una richiesta in base al tipo
   */
  getOptimalParameters(requestType: string): {
    model: AIModelType;
    temperature: number;
    maxTokens: number;
  } {
    switch (requestType) {
      case 'text_to_cad':
        return {
          model: AI_MODELS.CLAUDE_OPUS,
          temperature: 0.5,
          maxTokens: 6000
        };
      case 'design_analysis':
        return {
          model: AI_MODELS.CLAUDE_OPUS,
          temperature: 0.3,
          maxTokens: 4000
        };
      case 'gcode_optimization':
        return {
          model: AI_MODELS.CLAUDE_SONNET,
          temperature: 0.2,
          maxTokens: 4000
        };
      case 'suggestions':
        return {
          model: AI_MODELS.CLAUDE_HAIKU,
          temperature: 0.7,
          maxTokens: 1000
        };
      case 'chat':
        return {
          model: AI_MODELS.CLAUDE_SONNET,
          temperature: 0.7,
          maxTokens: 2000
        };
      default:
        return {
          model: this.config.defaultModel,
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens
        };
    }
  }
}

// Esporta un'istanza singleton
export const aiConfigManager = new AIConfigManager();