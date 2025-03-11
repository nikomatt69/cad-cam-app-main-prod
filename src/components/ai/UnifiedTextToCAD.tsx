import React, { useState } from 'react';
import { PenTool, Loader, Check, AlertTriangle, ThumbsUp, ThumbsDown } from 'react-feather';
import { useAIAgent } from 'src/contexts/AIAgentProvider';
import { useElementsStore } from '../../store/elementsStore';

interface UnifiedTextToCADProps {
  className?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  constraintPresets?: Array<{
    id: string;
    name: string;
    description: string;
    constraints: Record<string, any>;
  }>;
}

const UnifiedTextToCAD: React.FC<UnifiedTextToCADProps> = ({
  className = '',
  onSuccess,
  onError,
  constraintPresets = []
}) => {
  const { textToCAD, state } = useAIAgent();
  const { addElements } = useElementsStore();
  
  const [description, setDescription] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [resultQuality, setResultQuality] = useState<'good' | 'bad' | null>(null);
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const isDisabled = state.isProcessing || !description.trim();
  
  const handleGenerateElements = async () => {
    if (isDisabled) return;
    
    setGenerationStatus('generating');
    setErrorMessage(null);
    
    const selectedConstraints = selectedPreset 
      ? constraintPresets.find(preset => preset.id === selectedPreset)?.constraints 
      : undefined;
    
    try {
      const result = await textToCAD(description, selectedConstraints);
      
      if (result.success && result.data) {
        addElements(result.data);
        setGenerationStatus('success');
        onSuccess?.();
      } else {
        setErrorMessage(result.error || 'Failed to generate CAD elements');
        setGenerationStatus('error');
        onError?.(result.error || 'Unknown error');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setErrorMessage(errorMessage);
      setGenerationStatus('error');
      onError?.(errorMessage);
    }
  };
  
  const handleFeedback = (quality: 'good' | 'bad') => {
    setResultQuality(quality);
    // Implementazione logica di feedback
  };
  
  const handleReset = () => {
    setDescription('');
    setSelectedPreset(null);
    setResultQuality(null);
    setGenerationStatus('idle');
    setErrorMessage(null);
  };
  
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 ${className}`}>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
        Text to CAD Generator
      </h3>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="text-to-cad-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Describe what to create
          </label>
          <textarea
            id="text-to-cad-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 
                      text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-blue-500 
                      focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400"
            placeholder="Describe the 3D model you want to create..."
            rows={4}
            disabled={generationStatus === 'generating'}
          />
        </div>
        
        {constraintPresets.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Design Constraints
            </label>
            <select
              value={selectedPreset || ''}
              onChange={(e) => setSelectedPreset(e.target.value || null)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 
                        text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 
                        dark:focus:ring-blue-400 dark:focus:border-blue-400"
              disabled={generationStatus === 'generating'}
            >
              <option value="">No constraints</option>
              {constraintPresets.map(preset => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
            {selectedPreset && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {constraintPresets.find(preset => preset.id === selectedPreset)?.description}
              </p>
            )}
          </div>
        )}
        
        <div>
          <button
            onClick={handleGenerateElements}
            disabled={isDisabled}
            className={`flex items-center justify-center w-full px-4 py-2 text-white rounded-md
                      transition-colors duration-200 ${
                        isDisabled
                          ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
                      }`}
          >
            {generationStatus === 'generating' ? (
              <>
                <Loader size={16} className="animate-spin mr-2" />
                Generating CAD Elements...
              </>
            ) : (
              <>
                <PenTool size={16} className="mr-2" />
                Generate CAD Elements
              </>
            )}
          </button>
        </div>
        
        {errorMessage && (
          <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded-md flex items-start">
            <AlertTriangle size={16} className="mr-2 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}
        
        {generationStatus === 'success' && (
          <div className="flex flex-col space-y-2">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-md flex items-center">
              <Check size={16} className="mr-2" />
              <span>CAD elements generated successfully!</span>
            </div>
            
            <div className="flex items-center justify-center space-x-4 mt-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">Was this result helpful?</p>
              <button
                onClick={() => handleFeedback('good')}
                className={`p-2 rounded-full ${
                  resultQuality === 'good'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
                aria-label="Good result"
              >
                <ThumbsUp size={16} />
              </button>
              <button
                onClick={() => handleFeedback('bad')}
                className={`p-2 rounded-full ${
                  resultQuality === 'bad'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
                aria-label="Bad result"
              >
                <ThumbsDown size={16} />
              </button>
            </div>
            
            <button
              onClick={handleReset}
              className="mt-2 text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
            >
              Generate another model
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedTextToCAD; 