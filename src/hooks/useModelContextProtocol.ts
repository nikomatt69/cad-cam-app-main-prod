// src/hooks/useModelContextProtocol.ts

import { useState } from 'react';
import { modelContextProtocol, ModelContextProtocol } from '@/src/lib/ai/ai-new/ModelContexProtocol';
import { Element } from '@/src/store/elementsStore';

export function useModelContextProtocol() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const generateCADElements = async (
    description: string, 
    options: {
      preserveContext?: boolean;
      designIntent?: string;
      preferredElementTypes?: string[];
      precisionLevel?: 'low' | 'standard' | 'high' | 'ultra';
      constraintRules?: Record<string, any>;
    } = {}
  ) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const result = await modelContextProtocol.processRequest(description, options);
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to generate CAD elements');
      }
      
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return null;
    } finally {
      setIsProcessing(false);
    }
  };
  
  return {
    generateCADElements,
    isProcessing,
    error
  };
}