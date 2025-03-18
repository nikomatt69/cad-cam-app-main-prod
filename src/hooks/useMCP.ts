// src/hooks/useMCP.ts
import { useState, useEffect, useCallback } from 'react';
import { mcpCadService } from '@/src/lib/ai/mcp/mcpCadService';
import { CADElement } from '@/src/types/AITypes';

// Add imports for AIRequest and AIResponse types
import { AIRequest, AIResponse } from '@/src/types/AITypes';

interface UseMCPOptions {
  sessionId?: string;
  onContextUpdate?: (context: any) => void;
}

export function useMCP(options?: UseMCPOptions) {
  const [sessionId, setSessionId] = useState<string>(options?.sessionId || mcpCadService.getSessionId());
  const [isActive, setIsActive] = useState<boolean>(true);
  
  // Initialize or restore the session
  useEffect(() => {
    if (options?.sessionId) {
      setSessionId(options.sessionId);
    }
  }, [options?.sessionId]);
  
  // Enhance a prompt with context
  const enhancePrompt = useCallback((prompt: string, elements: CADElement[] = []) => {
    if (!isActive) return prompt;
    return mcpCadService.enhancePrompt(prompt, elements);
  }, [isActive]);
  
  // Process a request through MCP
  const processRequest = useCallback(async <T>(
    request: AIRequest, 
    serviceFunction: (request: AIRequest) => Promise<AIResponse<T>>
  ): Promise<AIResponse<T>> => {
    if (!isActive) return serviceFunction(request);
    
    try {
      return await mcpCadService.processCadRequest(request, serviceFunction);
    } catch (error) {
      console.error('MCP request processing failed:', error);
      // Fall back to original service if MCP fails
      return serviceFunction(request);
    }
  }, [isActive]);
  
  // Create a new session
  const createNewSession = useCallback(() => {
    const newSessionId = mcpCadService.createNewSession();
    setSessionId(newSessionId);
    return newSessionId;
  }, []);
  
  // Toggle MCP on/off
  const toggleMCP = useCallback((active?: boolean) => {
    setIsActive(prev => typeof active !== 'undefined' ? active : !prev);
  }, []);
  
  return {
    sessionId,
    isActive,
    enhancePrompt,
    processRequest,
    createNewSession,
    toggleMCP
  };
}