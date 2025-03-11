// src/components/ai/AIPanel.tsx
import React, { useState } from 'react';
import { AIDesignSuggestion, AIRequest } from '../../types/ai';
import { useAIAgent } from 'src/contexts/AIAgentProvider';
import { Cpu, Send, AlertTriangle, Check, Sliders, Loader, X, ArrowLeft, Activity } from 'react-feather';
import { motion, AnimatePresence } from 'framer-motion';

import AIFeedbackCollector from './AIFeedbackCollector';
import AIProcessingIndicator from './AIProcesingIndicator';


export interface AIPanelProps {
  title: string;
  description?: string;
  placeholder?: string;
  systemPrompt?: string;
  onResult?: (data: any) => void;
  resultPreview?: React.ReactNode;
  showSettings?: boolean;
  customControls?: React.ReactNode;
  className?: string;
  
}

const AIPanel: React.FC<AIPanelProps> = ({
  title,
  description,
  placeholder = "Describe what you'd like to create...",
  systemPrompt,
  onResult,
  resultPreview,
  showSettings = false,
  customControls,
  className = "",
}) => {
  const { state } = useAIAgent();
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      setError('Please enter a prompt');
      return;
    }
    
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/ai/completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: trimmedPrompt,
          systemPrompt,
          metadata: { source: title }
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      setRequestId(result.requestId || Math.random().toString());
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to process request');
      }
      
      const aiResponse = result.rawResponse || '';
      setResponse(aiResponse);
      setSuccess('Successfully processed!');
      
      if (onResult) {
        onResult(result.data || aiResponse);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabled = isSubmitting || !prompt.trim();

  return (
    <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <Cpu size={18} className="mr-2 text-blue-600" />
          {title}
        </h3>
        
        {showSettings && (
          <button 
            type="button"
            className="text-gray-400 hover:text-gray-500"
            onClick={() => {/* Toggle settings */}}
          >
            <Sliders size={16} />
          </button>
        )}
      </div>
      
      {description && (
        <p className="text-sm text-gray-500 mb-4">{description}</p>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={placeholder}
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
          disabled={isSubmitting}
        />
        
        <div className="flex justify-between items-center">
          <div className="flex-1">
            {customControls}
          </div>
          
          <button
            type="submit"
            disabled={isDisabled}
            className={`ml-2 px-4 py-2 rounded-md text-white flex items-center ${
              isDisabled 
                ? 'bg-blue-300 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader size={16} className="mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Send size={16} className="mr-2" />
                Generate
              </>
            )}
          </button>
        </div>
      </form>
      
      {isSubmitting && (
        <div className="mt-4">
          <AIProcessingIndicator status="processing" />
        </div>
      )}
      
      {error && (
        <div className="mt-4 p-3 bg-red-50 rounded-md flex items-start">
          <AlertTriangle size={18} className="text-red-500 mr-2 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      
      {success && !error && (
        <div className="mt-4 p-3 bg-green-50 rounded-md flex items-start">
          <Check size={18} className="text-green-500 mr-2 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}
      
      {response && (
        <div className="mt-4">
          <div className="p-3 bg-blue-50 rounded-md mb-3">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Response:</h4>
            <div className="text-sm text-blue-700 whitespace-pre-wrap">
              {response}
            </div>
          </div>
          
          {resultPreview && (
            <div className="mb-3">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Preview:</h4>
              {resultPreview}
            </div>
          )}
          
          {requestId && (
            <AIFeedbackCollector requestId={requestId} compact />
          )}
        </div>
      )}
    </div>
  );
};

export default AIPanel;