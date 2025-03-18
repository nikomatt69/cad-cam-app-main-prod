// src/lib/ai/mcp/mcpCadService.ts
import { AIRequest, AIResponse, CADElement } from '@/src/types/AITypes';
import { aiAnalytics } from '../ai-new/aiAnalytics';
import { aiCache } from '../ai-new/aiCache';
import { IntentAnalyzer } from '../ai-new/intentAnalyzer';

interface MCPCadContext {
  recentElements: CADElement[];
  userIntents: any[];
  designHistory: string[];
  preferredMaterials: string[];
  preferredComponents: string[];
  domainContext: 'mechanical' | 'architectural' | 'electronic' | 'artistic' | 'general' | 'consumer';
}

export class MCPCadService {
  private contextMap: Map<string, MCPCadContext> = new Map();
  private sessionId: string;
  
  constructor(sessionId?: string) {
    this.sessionId = sessionId || `session_${Date.now()}`;
  }
  
  /**
   * Enhance a prompt with contextual information from previous interactions
   */
  enhancePrompt(prompt: string, elements: CADElement[] = []): string {
    // Get current context or initialize a new one
    const context = this.getContext();
    
    // Analyze user intent from the prompt
    const intent = IntentAnalyzer.analyzeIntent(prompt);
    
    // Add intent to context history
    context.userIntents.push(intent);
    
    // Update context with new elements if provided
    if (elements.length > 0) {
      context.recentElements = [...elements, ...context.recentElements].slice(0, 10);
    }
    // Set domain context based on intent analysis
    context.domainContext = intent.domain || 'mechanical';
    
    // Enhance prompt with contextual information
    let enhancedPrompt = IntentAnalyzer.enhancePromptWithIntent(prompt, intent);
    
    // Add information about recent designs if relevant
    if (context.recentElements.length > 0 && intent.keywords.some(k => 
      ['similar', 'like', 'same', 'previous', 'before', 'again'].includes(k))) {
      enhancedPrompt += "\n\nReference previous elements created in this session, particularly:";
      
      // Add details of the most relevant previous elements
      const relevantElements = this.findRelevantElements(context, intent);
      relevantElements.forEach(element => {
        enhancedPrompt += `\n- ${element.name} (${element.type}): ${this.summarizeElement(element)}`;
      });
    }
    
    // Add preferred materials if the user hasn't specified
    if (context.preferredMaterials.length > 0 && !prompt.toLowerCase().includes('material')) {
      enhancedPrompt += `\n\nConsider using one of the user's preferred materials: ${context.preferredMaterials.join(', ')}.`;
    }
    
    // Save updated context
    this.saveContext(context);
    
    return enhancedPrompt;
  }
  
  /**
   * Process a CAD generation request through MCP
   */
  async processCadRequest<T>(request: AIRequest, originalService: (request: AIRequest) => Promise<AIResponse<T>>): Promise<AIResponse<T>> {
    // Get the current context
    const context = this.getContext();
    
    // Check if we have a cached response for a similar request
    const similarRequestResult = await this.findSimilarRequest(request, context);
    if (similarRequestResult) {
      aiAnalytics.trackEvent({
        eventType: 'mcp',
        eventName: 'similar_request_found',
        success: true,
        metadata: { 
          similarityScore: similarRequestResult.similarity,
          requestId: `mcp_${Date.now()}`
        }
      });
      
      return {
        ...similarRequestResult.response,
        fromMCP: true,
        metadata: {
          ...similarRequestResult.response.metadata,
          fromSimilarRequest: true,
          similarityScore: similarRequestResult.similarity
        }
      } as AIResponse<T>;
    }
    
    // Enhance the prompt with context
    const enhancedPrompt = this.enhancePrompt(request.prompt);
    
    // Create a new request with the enhanced prompt
    const enhancedRequest: AIRequest = {
      ...request,
      prompt: enhancedPrompt,
      metadata: {
        ...request.metadata,
        mcpEnhanced: true,
        sessionId: this.sessionId
      }
    };
    
    // Process the enhanced request
    const result = await originalService(enhancedRequest);
    
    // Update context with the response
    if (result.success && result.data) {
      this.updateContextWithResult(context, request.prompt, result);
    }
    
    return {
      ...result,
      metadata: {
        ...result.metadata,
        mcpEnhanced: true
      }
    };
  }
  
  /**
   * Find similar previous requests that might be relevant
   */
  private async findSimilarRequest<T>(request: AIRequest, context: MCPCadContext): Promise<null | {
    response: AIResponse<T>;
    similarity: number;
  }> {
    // This would normally use vector embeddings or other similarity measures
    // For now, we'll use a simple keyword-based approach
    
    // Since getByPrefix isn't available, we need to get items individually
    // Get cache keys that might contain CAD requests
    const cacheKeys = Object.keys(localStorage || {})
      .filter(key => key.startsWith('cadRequest_'));
    
    if (cacheKeys.length === 0) return null;
    
    const cachedRequests: Array<{key: string, data: any}> = [];
    for (const key of cacheKeys) {
      const data = aiCache.get(key);
      if (data) {
        cachedRequests.push({ key, data });
      }
    }
    
    if (cachedRequests.length === 0) return null;
    
    const currentKeywords = this.extractKeywords(request.prompt);
    let bestMatch: AIResponse<T> | null = null;
    let bestSimilarity = 0;
    
    for (const cached of cachedRequests) {
      // Extract original prompt from the cache key
      const originalPrompt = cached.key.replace('cadRequest_', '');
      const cachedKeywords = this.extractKeywords(originalPrompt);
      
      // Calculate similarity score
      const similarity = this.calculateSimilarity(currentKeywords, cachedKeywords);
      
      if (similarity > 0.7 && similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = cached.data as AIResponse<T>;
      }
    }
    
    return bestMatch ? { response: bestMatch, similarity: bestSimilarity } : null;
  }
  
  /**
   * Extract keywords from a prompt
   */
  private extractKeywords(prompt: string): string[] {
    return prompt.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['with', 'that', 'this', 'from', 'have', 'should', 'would', 'could', 'make'].includes(word));
  }
  
  /**
   * Calculate similarity between two sets of keywords
   */
  private calculateSimilarity(keywords1: string[], keywords2: string[]): number {
    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);
    
    const intersection = new Set(keywords1.filter(x => set2.has(x)));
    const union = new Set([...keywords1, ...keywords2]);
    
    return intersection.size / union.size;
  }
  
  /**
   * Update context with results from a request
   */
  private updateContextWithResult<T>(context: MCPCadContext, prompt: string, result: AIResponse<T>): void {
    // Add to design history
    context.designHistory.push(prompt);
    
    // Detect if there are specific materials mentioned
    const materials = this.extractMaterialsFromResponse(result);
    if (materials.length > 0) {
      context.preferredMaterials = Array.from(new Set([...materials, ...context.preferredMaterials])).slice(0, 5);
    }
    
    // Save updated context
    this.saveContext(context);
    
    // Cache this request for future similarity matching
    aiCache.set(`cadRequest_${prompt}`, result, 60 * 60 * 1000); // 1 hour cache
  }
  
  /**
   * Extract materials mentioned in response
   */
  private extractMaterialsFromResponse<T>(response: AIResponse<T>): string[] {
    const materials: string[] = [];
    
    if (response.rawResponse) {
      const materialKeywords = [
        'steel', 'aluminum', 'titanium', 'plastic', 'wood', 'glass',
        'copper', 'brass', 'bronze', 'ceramic', 'concrete', 'composite',
        'pla', 'abs', 'petg', 'nylon', 'carbon fiber'
      ];
      
      const text = response.rawResponse.toLowerCase();
      materialKeywords.forEach(material => {
        if (text.includes(material)) {
          materials.push(material);
        }
      });
    }
    
    return materials;
  }
  
  /**
   * Find elements from history relevant to current intent
   */
  private findRelevantElements(context: MCPCadContext, intent: any): CADElement[] {
    return context.recentElements
      .filter(element => {
        // Check for type matches
        if (intent.keywords.includes(element.type)) return true;
        
        // Check for name matches
        if (intent.keywords.some((keyword: string) => element.name.toLowerCase().includes(keyword))) return true;
        
        return false;
      })
      .slice(0, 3); // Return up to 3 most relevant elements
  }
  
  /**
   * Create a brief summary of a CAD element
   */
  private summarizeElement(element: CADElement): string {
    switch (element.type) {
      case 'cube':
        return `Cube with dimensions: ${(element as any).width}x${(element as any).height}x${(element as any).depth}mm`;
      case 'cylinder':
        return `Cylinder with radius: ${(element as any).radius}mm, height: ${(element as any).height}mm`;
      case 'sphere':
        return `Sphere with radius: ${(element as any).radius}mm`;
      default:
        return `${element.type} made of ${element.material.name}`;
    }
  }
  
  /**
   * Get current context or create a new one
   */
  private getContext(): MCPCadContext {
    if (!this.contextMap.has(this.sessionId)) {
      this.contextMap.set(this.sessionId, {
        recentElements: [],
        userIntents: [],
        designHistory: [],
        preferredMaterials: [],
        preferredComponents: [],
        domainContext: 'general'
      });
    }
    
    return this.contextMap.get(this.sessionId)!;
  }
  
  /**
   * Save context
   */
  private saveContext(context: MCPCadContext): void {
    this.contextMap.set(this.sessionId, context);
    
    // Persist context to localStorage if available
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`mcp_context_${this.sessionId}`, JSON.stringify(context));
      } catch (error) {
        console.warn('Failed to save MCP context to localStorage', error);
      }
    }
  }
  
  /**
   * Create a new session
   */
  createNewSession(): string {
    this.sessionId = `session_${Date.now()}`;
    return this.sessionId;
  }
  
  /**
   * Get the current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }
}

// Export a singleton instance
export const mcpCadService = new MCPCadService();