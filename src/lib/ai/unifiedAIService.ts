// src/lib/ai/unifiedAIService.ts
import { aiCore } from './aiCore';
import { aiCache } from './aiCache';
import { aiAnalytics } from './aiAnalytics';
import { Element } from 'src/store/elementsStore';
import { promptTemplates } from './promptTemplates';
import { 
  AIServiceConfig, 
  AIDesignSuggestion, 
  AIRequest, 
  AIResponse, 
  TextToCADRequest,
  TextToCADResponse
} from 'src/types/ai';

/**
 * UnifiedAIService provides a centralized interface for all AI capabilities
 * in the application, with consistent error handling, analytics, and caching.
 */
export class UnifiedAIService {
  [x: string]: any;
  private config: AIServiceConfig = {
    allowBrowser: true,
    defaultModel: 'claude-3-5-sonnet-20240229',
    maxTokens: 4000,
    temperature: 0.7,
    cacheEnabled: true,
    analyticsEnabled: true,
  };
  
  constructor(config?: Partial<AIServiceConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Convert text description to CAD elements
   */
  async textToCADElements(request: TextToCADRequest): Promise<AIResponse<Element[]>> {
    const { description, constraints, style, complexity } = request;
    
    // Check cache first if enabled
    if (this.config.cacheEnabled) {
      const cacheKey = aiCache.getKeyForRequest({
        type: 'textToCAD',
        description,
        constraints,
        style,
        complexity
      });
      
      const cachedResult = aiCache.get<Element[]>(cacheKey);
      if (cachedResult) {
        return {
          rawResponse: null,
          data: cachedResult,
          success: true,
          fromCache: true
        };
      }
    }
    
    // Track analytics
    const requestId = this.config.analyticsEnabled 
      ? aiAnalytics.trackRequestStart('textToCAD', this.config.defaultModel, { complexity, style })
      : '';
    
    const startTime = Date.now();
    
    try {
      // Build prompt using template and request data
      const promptTemplate = promptTemplates.textToCAD;
      const promptWithSystemContext = promptTemplate.system
        .replace('{{complexity}}', complexity || 'moderate')
        .replace('{{style}}', style || 'precise');
        
      // Build user prompt with constraints
      let prompt = promptTemplate.user.replace('{{description}}', description);
      
      if (constraints) {
        prompt += '\n\nConstraints:\n' + Object.entries(constraints)
          .map(([key, value]) => `- ${key}: ${value}`)
          .join('\n');
      }
      
      // Make the AI request
      const response = await aiCore.processRequest<Element[]>({
        prompt,
        systemPrompt: promptWithSystemContext,
        model: 'claude-3-opus-20240229',
        temperature: complexity === 'creative' ? 0.8 : 0.5,
        maxTokens: this.config.maxTokens,
        parseResponse: this.parseTextToCADResponse
      });
      
      // Cache successful results
      if (response.success && response.data && this.config.cacheEnabled) {
        const cacheKey = aiCache.getKeyForRequest({
          type: 'textToCAD',
          description,
          constraints,
          style,
          complexity
        });
        
        aiCache.set(cacheKey, response.data);
      }
      
      // Track completion analytics
      if (this.config.analyticsEnabled) {
        aiAnalytics.trackRequestComplete(
          requestId, 
          Date.now() - startTime, 
          response.success || false
        );
      }
      
      return response;
      
    } catch (error) {
      console.error('Text to CAD conversion error:', error);
      
      // Track error in analytics
      if (this.config.analyticsEnabled) {
        aiAnalytics.trackRequestComplete(requestId, Date.now() - startTime, false);
      }
      
      return {
        rawResponse: null,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error in text-to-CAD conversion',
        success: false
      };
    }
  }
  
  /**
   * Parse the AI response for text to CAD conversion
   */
  private parseTextToCADResponse = (text: string): Element[] => {
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || 
                        text.match(/\[\s*\{[\s\S]*\}\s*\]/);
                        
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }
      
      const parsedData = JSON.parse(jsonMatch[0]);
      
      // Validate and enhance the elements
      return this.validateAndEnhanceElements(parsedData);
      
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw new Error('Failed to parse AI response for CAD elements');
    }
  }
  
  /**
   * Validate and enhance CAD elements with proper defaults
   */
  private validateAndEnhanceElements(elements: any[]): Element[] {
    return elements.map(element => {
      // Ensure all elements have required properties
      return {
        type: element.type || 'cube',
        x: element.x ?? 0,
        y: element.y ?? 0,
        z: element.z ?? 0,
        width: element.width ?? 50,
        height: element.height ?? 50,
        depth: element.depth ?? 50,
        radius: element.radius ?? 25,
        color: element.color ?? '#1e88e5',
        ...(element.rotation && { 
          rotation: {
            x: element.rotation.x ?? 0,
            y: element.rotation.y ?? 0,
            z: element.rotation.z ?? 0
          }
        }),
        // Add any other properties that were in the original element
        ...element
      };
    });
  }
  
  /**
   * Analyze CAD design and provide suggestions
   */
  async analyzeDesign(elements: Element[]): Promise<AIResponse<AIDesignSuggestion[]>> {
    // Implementation would be similar to textToCADElements but use different templates
    // and parsing logic for the design analysis feature
    // This is a placeholder for the full implementation
    
    return {
      rawResponse: '',
      data: [],
      success: true
    };
  }
  
  /**
   * Optimize G-code for CNC machines
   */
  async optimizeGCode(gcode: string, machineType: string): Promise<AIResponse<string>> {
    // Implementation would optimize G-code using AI
    // This is a placeholder for the full implementation
    
    return {
      rawResponse: '',
      data: gcode,
      success: true
    };
  }
  
  /**
   * Get recommendations for machining parameters based on material and tool
   */
  async getMachiningParameters(material: string, toolType: string, operation: string): Promise<AIResponse<any>> {
    // Implementation would provide machining parameter recommendations
    // This is a placeholder for the full implementation
    
    return {
      rawResponse: '',
      data: {},
      success: true
    };
  }
  
  /**
   * Set configuration for the AI service
   */
  setConfig(config: Partial<AIServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Export a singleton instance
export const unifiedAIService = new UnifiedAIService();

export default unifiedAIService;