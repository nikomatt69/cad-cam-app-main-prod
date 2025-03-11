// src/components/ai/TextToCADGenerator.tsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PenTool, 
  Cpu, 
  Loader, 
  Check, 
  AlertTriangle, 
  Maximize2, 
  Minimize2, 
  Eye, 
  EyeOff, 
  ThumbsUp, 
  ThumbsDown,
  RefreshCw,
  Save,
  CheckCircle
} from 'react-feather';

import { useElementsStore } from '../../store/elementsStore';
import { useLayerStore } from '../../store/layerStore';
import { unifiedAIService } from '../../lib/ai/unifiedAIService';
import { aiAnalytics } from '../../lib/ai/aiAnalytics';
import { TextToCADRequest } from '../../types/ai';
import { Element } from '../../store/elementsStore';

// Example constraints presets for common design scenarios
const CONSTRAINT_PRESETS = [
  {
    name: 'Mechanical Part',
    description: 'Constraints optimized for manufacturing mechanical components',
    constraints: {
      preferredTypes: ['cube', 'cylinder', 'cone', 'torus'],
      maxDimensions: { width: 200, height: 200, depth: 200 },
      minWallThickness: 2.5,
      maxElements: 20
    }
  },
  {
    name: 'Architectural Model',
    description: 'Settings for architectural and structural designs',
    constraints: {
      preferredTypes: ['cube', 'extrusion', 'cylinder'],
      maxDimensions: { width: 500, height: 300, depth: 500 },
      minWallThickness: 3,
      maxElements: 50
    }
  },
  {
    name: 'Organic Form',
    description: 'Settings for organic, sculptural designs',
    constraints: {
      preferredTypes: ['sphere', 'torus', 'cylinder', 'cone'],
      smoothTransitions: true,
      organicDeformation: true,
      maxElements: 30
    }
  },
  {
    name: 'Precise Engineering',
    description: 'High precision engineering constraints',
    constraints: {
      preferredTypes: ['cube', 'cylinder', 'line', 'rectangle'],
      maxDimensions: { width: 150, height: 150, depth: 150 },
      precision: 'high',
      useStandardDimensions: true,
      maxElements: 25
    }
  }
];

interface TextToCADGeneratorProps {
  className?: string;
  onClose?: () => void;
  standalone?: boolean;
}

const TextToCADGenerator: React.FC<TextToCADGeneratorProps> = ({ 
  className, 
  onClose,
  standalone = true
}) => {
  // State for the text-to-CAD interface
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [elementCount, setElementCount] = useState(0);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  
  // User preferences for generation
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [complexity, setComplexity] = useState<'simple' | 'moderate' | 'complex' | 'creative'>('moderate');
  const [style, setStyle] = useState<'precise' | 'artistic' | 'mechanical' | 'organic'>('precise');
  const [customConstraints, setCustomConstraints] = useState<Record<string, any>>({});
  
  // History of generated models
  const [generationHistory, setGenerationHistory] = useState<Array<{
    id: string;
    description: string;
    elements: Element[];
    timestamp: Date;
  }>>([]);
  
  // Get stores
  const { addElements } = useElementsStore();
  const { activeLayer, layers } = useLayerStore();
  
  // Refs
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Check if active layer is locked
  const isLayerLocked = layers.find(layer => layer.id === activeLayer)?.locked || false;
  
  // Clear success message after a delay
  useEffect(() => {
    if (success) {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
      
      successTimeoutRef.current = setTimeout(() => {
        setSuccess(null);
      }, 5000);
      
      return () => {
        if (successTimeoutRef.current) {
          clearTimeout(successTimeoutRef.current);
        }
      };
    }
  }, [success]);
  
  // Focus the description input when component mounts
  useEffect(() => {
    if (descriptionInputRef.current) {
      descriptionInputRef.current.focus();
    }
  }, []);
  
  // Handle preset selection
  const handleSelectPreset = (index: number) => {
    setSelectedPreset(index === selectedPreset ? null : index);
    if (index !== null && index !== selectedPreset) {
      setCustomConstraints(CONSTRAINT_PRESETS[index].constraints);
    } else {
      setCustomConstraints({});
    }
  };
  
  // Build the complete request object
  const buildRequest = (): TextToCADRequest => {
    const request: TextToCADRequest = {
      description,
      style,
      complexity
    };
    
    // Add constraints if we have any (from preset or custom)
    if (Object.keys(customConstraints).length > 0) {
      request.constraints = customConstraints;
    }
    
    return request;
  };
  
  // Generate CAD elements from text description
  const generateElements = async () => {
    if (!description.trim()) {
      setError('Please enter a description of what you want to create.');
      return;
    }
    
    if (isLayerLocked) {
      setError('Current layer is locked. Please unlock it to add elements.');
      return;
    }
    
    setError(null);
    setSuccess(null);
    setIsGenerating(true);
    setElementCount(0);
    
    try {
      // Create unique ID for this generation
      const genId = `gen_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      setGenerationId(genId);
      
      // Track in analytics
      aiAnalytics.trackEvent({
        eventType: 'request',
        eventName: 'text_to_cad_start',
        metadata: {
          description: description.substring(0, 100),
          complexity,
          style,
          hasConstraints: Object.keys(customConstraints).length > 0
        }
      });
      
      // Build request with all settings
      const request = buildRequest();
      
      // Call the unified AI service
      const response = await unifiedAIService.textToCADElements(request);
      
      if (response.success && response.data) {
        const elements = response.data;
        
        // Add to generation history
        setGenerationHistory(prev => [
          {
            id: genId,
            description,
            elements,
            timestamp: new Date()
          },
          ...prev.slice(0, 9) // Keep only the 10 most recent
        ]);
        
        setElementCount(elements.length);
        setSuccess(`Generated ${elements.length} elements successfully!`);
        
        // Track successful generation
        aiAnalytics.trackEvent({
          eventType: 'response',
          eventName: 'text_to_cad_complete',
          success: true,
          metadata: {
            generationId: genId,
            elementCount: elements.length,
            duration: response.processingTime,
            fromCache: response.fromCache
          }
        });
        
        // Add elements to the scene (if not in preview-only mode)
        if (!standalone) {
          addElements(elements);
        }
        
        // Reset feedback state for new generation
        setFeedback(null);
        setFeedbackComment('');
        setShowFeedbackForm(false);
        
      } else {
        setError(response.error || 'Failed to generate CAD elements. Please try again with a more detailed description.');
        
        // Track error
        aiAnalytics.trackEvent({
          eventType: 'error',
          eventName: 'text_to_cad_error',
          metadata: {
            generationId: genId,
            error: response.error,
            description: description.substring(0, 100)
          }
        });
      }
    } catch (err) {
      console.error('Text to CAD generation error:', err);
      setError('An unexpected error occurred during generation. Please try again.');
      
      // Track error
      aiAnalytics.trackEvent({
        eventType: 'error',
        eventName: 'text_to_cad_exception',
        metadata: {
          error: err instanceof Error ? err.message : 'Unknown error'
        }
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Apply a generation from history to the scene
  const applyGenerationFromHistory = (historyItem: {
    id: string;
    description: string;
    elements: Element[];
  }) => {
    if (isLayerLocked) {
      setError('Current layer is locked. Please unlock it to add elements.');
      return;
    }
    
    addElements(historyItem.elements);
    setSuccess(`Added ${historyItem.elements.length} elements to the scene!`);
    
    // Track application of historical generation
    aiAnalytics.trackEvent({
      eventType: 'request',
      eventName: 'text_to_cad_history_applied',
      metadata: {
        generationId: historyItem.id,
        elementCount: historyItem.elements.length
      }
    });
  };
  
  // Submit user feedback about generation quality
  const submitFeedback = () => {
    if (!generationId || !feedback) return;
    
    // Track feedback
    aiAnalytics.trackFeedback(
      generationId,
      feedback === 'positive' ? 5 : 1,
      feedbackComment
    );
    
    setSuccess('Thanks for your feedback! It helps us improve the AI.');
    setShowFeedbackForm(false);
  };
  
  // Save current settings as a custom preset
  const saveCustomPreset = () => {
    // Implementation would save current settings to local storage or user profile
    setSuccess('Settings saved as custom preset!');
  };
  
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden ${className} ${isExpanded ? 'fixed inset-0 z-50' : 'relative'}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-4">
        <div className="flex justify-between items-center">
          <h2 className="text-white text-lg font-medium flex items-center">
            <PenTool className="mr-2" size={20} />
            Text to CAD Generator
          </h2>
          <div className="flex items-center space-x-2">
            {standalone && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 text-white hover:bg-blue-700 rounded-md"
                title={isExpanded ? "Minimize" : "Maximize"}
              >
                {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 text-white hover:bg-blue-700 rounded-md"
                title="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <p className="text-blue-100 text-sm mt-1">
          Describe what you want to create and AI will generate the 3D elements
        </p>
      </div>
      
      {/* Main Content */}
      <div className="p-4">
        {/* Description Input */}
        <div className="mb-4">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <div className="relative">
            <textarea
              ref={descriptionInputRef}
              id="description"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Describe the CAD model you want to create... (e.g., 'A mechanical assembly with a base plate, four mounting holes, and a central cylinder with a shaft')"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isGenerating}
            />
            {isGenerating && (
              <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 opacity-70 flex items-center justify-center rounded-md">
                <div className="flex flex-col items-center">
                  <Loader size={22} className="animate-spin mb-2 text-blue-600" />
                  <span className="text-sm text-gray-800 dark:text-gray-200">Generating CAD elements...</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Example prompts */}
          <div className="mt-1 flex flex-wrap gap-1">
            <button 
              className="text-xs px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded"
              onClick={() => setDescription("A mechanical assembly with a base plate, four mounting holes, and a central cylinder with a shaft")}
            >
              Mechanical Assembly
            </button>
            <button 
              className="text-xs px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded"
              onClick={() => setDescription("A simple chair with four legs, a seat, and a backrest")}
            >
              Furniture
            </button>
            <button 
              className="text-xs px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded"
              onClick={() => setDescription("A robotic arm with three joints and a gripper at the end")}
            >
              Robotics
            </button>
          </div>
        </div>
        
        {/* Settings Controls */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <button
              type="button"
              className="text-sm text-blue-600 dark:text-blue-400 font-medium flex items-center"
              onClick={() => setShowSettings(!showSettings)}
            >
              {showSettings ? "Hide" : "Show"} Advanced Settings
              <svg xmlns="http://www.w3.org/2000/svg" className={`ml-1 h-4 w-4 transition-transform ${showSettings ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            
            <div className="flex items-center space-x-2">
              <button
                type="button"
                className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                onClick={generateElements}
                disabled={isGenerating || !description.trim() || isLayerLocked}
              >
                <Cpu size={14} className="mr-1.5" />
                Generate Model
              </button>
            </div>
          </div>
          
          {/* Advanced Settings Panel */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pt-2 pb-3 border-t border-gray-200 dark:border-gray-700 space-y-4">
                  {/* Preset Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Constraint Presets
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {CONSTRAINT_PRESETS.map((preset, index) => (
                        <div
                          key={index}
                          onClick={() => handleSelectPreset(index)}
                          className={`p-2 border rounded-md cursor-pointer transition-colors ${
                            selectedPreset === index 
                              ? 'bg-blue-50 border-blue-300 dark:bg-blue-900 dark:border-blue-700' 
                              : 'bg-white border-gray-200 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">{preset.name}</h4>
                            {selectedPreset === index && <Check size={14} className="text-blue-600 dark:text-blue-400" />}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{preset.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Complexity & Style controls */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Complexity
                      </label>
                      <select
                        value={complexity}
                        onChange={(e) => setComplexity(e.target.value as any)}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        <option value="simple">Simple (Few Elements)</option>
                        <option value="moderate">Moderate (Balanced)</option>
                        <option value="complex">Complex (Detailed)</option>
                        <option value="creative">Creative (Experimental)</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Design Style
                      </label>
                      <select
                        value={style}
                        onChange={(e) => setStyle(e.target.value as any)}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        <option value="precise">Precise (Engineering)</option>
                        <option value="mechanical">Mechanical (Functional)</option>
                        <option value="organic">Organic (Natural Forms)</option>
                        <option value="artistic">Artistic (Creative)</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Save Settings button */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded-md text-sm hover:bg-gray-200 flex items-center dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                      onClick={saveCustomPreset}
                    >
                      <Save size={14} className="mr-1.5" />
                      Save Settings
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Status Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900 rounded-md flex items-start">
            <AlertTriangle className="text-red-500 dark:text-red-400 mr-2 flex-shrink-0 mt-0.5" size={16} />
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900 rounded-md flex items-start">
            <CheckCircle className="text-green-500 dark:text-green-400 mr-2 flex-shrink-0 mt-0.5" size={16} />
            <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
          </div>
        )}
        
        {/* Generation Result & Feedback */}
        {elementCount > 0 && !isGenerating && (
          <div className="mb-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Generation Result
              </h3>
              <div className="flex items-center">
                <button
                  type="button"
                  className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  onClick={() => setShowPreview(!showPreview)}
                  title={showPreview ? "Hide Preview" : "Show Preview"}
                >
                  {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            
            {/* If preview component would go here in a real implementation */}
            {showPreview && (
              <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-md mb-3 flex items-center justify-center">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Preview: {elementCount} elements generated
                </p>
              </div>
            )}
            
            {/* Feedback section */}
            {!feedback ? (
              <div className="mt-3">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Was this generation helpful?</p>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    className="flex items-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md"
                    onClick={() => {
                      setFeedback('positive');
                      if (generationId) {
                        aiAnalytics.trackFeedback(generationId, 5);
                      }
                    }}
                  >
                    <ThumbsUp size={14} className="mr-1.5" />
                    Yes
                  </button>
                  <button
                    type="button"
                    className="flex items-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md"
                    onClick={() => {
                      setFeedback('negative');
                      setShowFeedbackForm(true);
                    }}
                  >
                    <ThumbsDown size={14} className="mr-1.5" />
                    No
                  </button>
                </div>
              </div>
            ) : feedback === 'positive' ? (
              <div className="mt-3 p-2 bg-green-50 dark:bg-green-900 text-green-800 dark:text-green-200 text-sm rounded-md">
                <p className="flex items-center">
                  <Check size={14} className="mr-1.5" />
                  Thanks for your feedback!
                </p>
              </div>
            ) : showFeedbackForm ? (
              <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  How could we improve this generation?
                </label>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                  placeholder="Please tell us what went wrong..."
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                ></textarea>
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    className="px-3 py-1 bg-blue-600 text-white rounded-md text-xs hover:bg-blue-700"
                    onClick={submitFeedback}
                  >
                    Submit Feedback
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm rounded-md">
                <p className="flex items-center">
                  <Check size={14} className="mr-1.5" />
                  Thanks for your feedback!
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* Generation History */}
        {generationHistory.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
            <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">
              Recent Generations
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {generationHistory.map((item) => (
                <div 
                  key={item.id}
                  className="p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                    {item.description}
                  </p>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {item.elements.length} elements • {new Date(item.timestamp).toLocaleString()}
                    </span>
                    <button
                      type="button"
                      className="px-2 py-1 bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded text-xs hover:bg-blue-100 dark:hover:bg-blue-800"
                      onClick={() => applyGenerationFromHistory(item)}
                      disabled={isLayerLocked}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                className="flex items-center text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                onClick={() => setGenerationHistory([])}
              >
                <RefreshCw size={12} className="mr-1" />
                Clear History
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TextToCADGenerator;