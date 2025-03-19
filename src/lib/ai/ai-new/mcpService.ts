// src/lib/ai/mcpService.ts
import { AIRequest, AIResponse, AIModelType } from '@/src/types/AITypes';
import { aiAnalytics } from './aiAnalytics';

interface MCPOptions {
  maxRetries: number;
  retryDelay: number;
  timeoutMs: number;
  priorityLevels: {
    high: number;
    normal: number;
    low: number;
  };
}

export class MCPService {
  private requestQueue: Map<string, {
    request: AIRequest;
    priority: number;
    timestamp: number;
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  }> = new Map();
  
  private processingQueue: boolean = false;
  private options: MCPOptions;
  
  constructor(options?: Partial<MCPOptions>) {
    this.options = {
      maxRetries: 3,
      retryDelay: 1000,
      timeoutMs: 30000,
      priorityLevels: {
        high: 100,
        normal: 50,
        low: 10
      },
      ...options
    };
    
    // Start processing queue
    this.processQueue();
  }
  
  /**
   * Enqueue a request to be processed with the MCP protocol
   */
  async enqueue<T>(request: AIRequest, priority: 'high' | 'normal' | 'low' = 'normal'): Promise<AIResponse<T>> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Track analytics for the request start
    aiAnalytics.trackRequestStart(
      'mcp_request',
      request.model || 'unknown',
      { priority, requestType: request.metadata?.type || 'unknown' }
    );
    
    return new Promise((resolve, reject) => {
      // Add request to queue
      this.requestQueue.set(requestId, {
        request,
        priority: this.options.priorityLevels[priority],
        timestamp: Date.now(),
        resolve,
        reject
      });
      
      // Setup timeout
      setTimeout(() => {
        if (this.requestQueue.has(requestId)) {
          this.requestQueue.delete(requestId);
          reject(new Error('Request timeout'));
          
          aiAnalytics.trackEvent({
            eventType: 'error',
            eventName: 'request_timeout',
            success: false,
            metadata: { requestId }
          });
        }
      }, this.options.timeoutMs);
      
      // Trigger queue processing if not already running
      if (!this.processingQueue) {
        this.processQueue();
      }
    });
  }
  
  /**
   * Process the queue based on priority and timing
   */
  private async processQueue() {
    this.processingQueue = true;
    
    while (this.requestQueue.size > 0) {
      // Get highest priority request
      const nextRequest = this.getNextRequest();
      
      if (!nextRequest) {
        break;
      }
      
      const { request, resolve, reject } = nextRequest;
      
      try {
        // Execute the request
        const result = await this.executeRequest(request);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }
    
    this.processingQueue = false;
  }
  
  /**
   * Get the next request to process based on priority
   */
  private getNextRequest() {
    let highestPriority = -1;
    let oldestTimestamp = Infinity;
    let selectedRequestId: string | null = null;
    // Find the highest priority request
    for (const [id, entry] of Array.from(this.requestQueue.entries())) {
      if (entry.priority > highestPriority) {
        highestPriority = entry.priority;
        oldestTimestamp = entry.timestamp;
        selectedRequestId = id;
      } else if (entry.priority === highestPriority && entry.timestamp < oldestTimestamp) {
        // If same priority, take the oldest
        oldestTimestamp = entry.timestamp;
        selectedRequestId = id;
      }
    }
    
    if (selectedRequestId) {
      const entry = this.requestQueue.get(selectedRequestId);
      this.requestQueue.delete(selectedRequestId);
      return entry;
    }
    
    return null;
  }
  
  /**
   * Execute a request to the AI API with retries
   */
  private async executeRequest(request: AIRequest, retryCount = 0): Promise<AIResponse<any>> {
    const startTime = Date.now();
    
    try {
      // Prepare the request body
      const { model = 'claude-3-5-sonnet-20240229', systemPrompt, prompt, temperature = 0.3, maxTokens = 4000 } = request;
      
      // Call our proxy endpoint instead of Anthropic directly
      const response = await fetch('/api/ai/proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens,
          temperature,
          system: systemPrompt
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'API request failed');
      }
      
      const data = await response.json();
      const content = data.content[0]?.type === 'text' ? data.content[0].text : '';
      
      // Process the response with the parser if provided
      let parsedData = null;
      let parsingError = null;
      
      if (request.parseResponse && content) {
        try {
          parsedData = await request.parseResponse(content);
        } catch (error) {
          parsingError = error instanceof Error ? error : new Error('Parsing failed');
          
          aiAnalytics.trackEvent({
            eventType: 'error',
            eventName: 'parsing_error',
            errorType: 'parsing',
            success: false,
            metadata: { error: parsingError.message }
          });
        }
      }
      
      // Calculate processing time
      const processingTime = Date.now() - startTime;
      
      // Track completion
      
      
      return {
        rawResponse: content,
        data: parsedData,
        error: parsingError?.message,
        success: !parsingError,
        processingTime,
        usage: {
          promptTokens: data.usage?.input_tokens || 0,
          completionTokens: data.usage?.output_tokens || 0,
          totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
        }
      };
    } catch (error) {
      // Handle retry logic
      if (retryCount < this.options.maxRetries) {
        console.log(`Retrying request (${retryCount + 1}/${this.options.maxRetries})...`);
        
        // Exponential backoff
        const delay = this.options.retryDelay * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return this.executeRequest(request, retryCount + 1);
      }
      
      // Track the error
      aiAnalytics.trackEvent({
        eventType: 'error',
        eventName: 'request_failed',
        errorType: error instanceof Error ? error.name : 'unknown',
        success: false,
        metadata: { 
          message: error instanceof Error ? error.message : 'Unknown error',
          retries: retryCount
        }
      });
      
      // Return error response
      return {
        rawResponse: null,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      };
    }
  }
}

// Export a singleton instance
export const mcpService = new MCPService();