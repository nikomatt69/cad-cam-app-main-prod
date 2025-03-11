// src/components/cad/AICompositionDialog.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, AlertTriangle, Info, CheckCircle, Loader } from 'react-feather';
import { useElementsStore } from 'src/store/elementsStore';

interface AICompositionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  isLayerLocked: boolean;
}

type AIStatus = 'idle' | 'loading' | 'success' | 'error';

interface AIResponse {
  elements: any[];
  message: string;
}

const AICompositionDialog: React.FC<AICompositionDialogProps> = ({ 
  isOpen, 
  onClose,
  isLayerLocked 
}) => {
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState<AIStatus>('idle');
  const [aiMessage, setAiMessage] = useState('');
  const [aiElements, setAiElements] = useState<any[]>([]);
  
  const { addElements } = useElementsStore();

  // Mock AI API call - in production, you would call your actual AI service
  const generateElements = async () => {
    if (!prompt.trim()) {
      setStatus('error');
      setAiMessage('Please enter a description of what you want to create.');
      return;
    }
    
    if (isLayerLocked) {
      setStatus('error');
      setAiMessage('Current layer is locked. Unlock it to add components.');
      return;
    }

    setStatus('loading');
    setAiMessage('Generating CAD components...');
    
    try {
      // Simulate API call with setTimeout
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock AI response - in production, this would come from your API
      let mockResponse: AIResponse;
      
      // Simple keyword-based mock response generation
      if (prompt.toLowerCase().includes('cube')) {
        mockResponse = {
          elements: [
            {
              type: 'cube',
              x: 0,
              y: 0,
              z: 0,
              width: 100,
              height: 100,
              depth: 100,
              color: '#2196f3',
              wireframe: false
            }
          ],
          message: 'Generated a cube component as requested.'
        };
      } else if (prompt.toLowerCase().includes('cylinder') || prompt.toLowerCase().includes('tube')) {
        // For cylinder, we'll use a cube as placeholder (since your model might not support cylinders)
        mockResponse = {
          elements: [
            {
              type: 'cube',
              x: 0,
              y: 0,
              z: 0,
              width: 50,
              height: 50,
              depth: 150,
              color: '#4caf50',
              wireframe: false
            }
          ],
          message: 'Generated a cylinder-like component as requested.'
        };
      } else if (prompt.toLowerCase().includes('sphere')) {
        mockResponse = {
          elements: [
            {
              type: 'sphere',
              x: 0,
              y: 0,
              z: 0,
              radius: 75,
              color: '#ff9800',
              wireframe: false
            }
          ],
          message: 'Generated a sphere component as requested.'
        };
      } else if (prompt.toLowerCase().includes('table')) {
        // A table consists of 5 parts: 4 legs and a top
        mockResponse = {
          elements: [
            // Table top
            {
              type: 'cube',
              x: 0,
              y: 0,
              z: 50,
              width: 200,
              height: 10,
              depth: 120,
              color: '#8d6e63',
              wireframe: false
            },
            // Legs (4 cubes positioned at the corners)
            {
              type: 'cube',
              x: -90,
              y: -50,
              z: 0,
              width: 10,
              height: 10,
              depth: 100,
              color: '#8d6e63',
              wireframe: false
            },
            {
              type: 'cube',
              x: 90,
              y: -50,
              z: 0,
              width: 10,
              height: 10,
              depth: 100,
              color: '#8d6e63',
              wireframe: false
            },
            {
              type: 'cube',
              x: -90,
              y: 50,
              z: 0,
              width: 10,
              height: 10,
              depth: 100,
              color: '#8d6e63',
              wireframe: false
            },
            {
              type: 'cube',
              x: 90,
              y: 50,
              z: 0,
              width: 10,
              height: 10,
              depth: 100,
              color: '#8d6e63',
              wireframe: false
            }
          ],
          message: 'Generated a simple table with four legs.'
        };
      } else if (prompt.toLowerCase().includes('chair')) {
        mockResponse = {
          elements: [
            // Seat
            {
              type: 'cube',
              x: 0,
              y: 0,
              z: 45,
              width: 50,
              height: 50,
              depth: 10,
              color: '#a1887f',
              wireframe: false
            },
            // Backrest
            {
              type: 'cube',
              x: 0,
              y: 25,
              z: 95,
              width: 50,
              height: 10,
              depth: 100,
              color: '#a1887f',
              wireframe: false
            },
            // Legs (4 cubes)
            {
              type: 'cube',
              x: -20,
              y: -20,
              z: 0,
              width: 5,
              height: 5,
              depth: 90,
              color: '#a1887f',
              wireframe: false
            },
            {
              type: 'cube',
              x: 20,
              y: -20,
              z: 0,
              width: 5,
              height: 5,
              depth: 90,
              color: '#a1887f',
              wireframe: false
            },
            {
              type: 'cube',
              x: -20,
              y: 20,
              z: 0,
              width: 5,
              height: 5,
              depth: 90,
              color: '#a1887f',
              wireframe: false
            },
            {
              type: 'cube',
              x: 20,
              y: 20,
              z: 0,
              width: 5,
              height: 5,
              depth: 90,
              color: '#a1887f',
              wireframe: false
            }
          ],
          message: 'Generated a basic chair with a seat, backrest, and four legs.'
        };
      } else {
        // Default response for any other prompt
        mockResponse = {
          elements: [
            {
              type: 'cube',
              x: -60,
              y: 0,
              z: 0,
              width: 50,
              height: 50,
              depth: 50,
              color: '#f44336',
              wireframe: false
            },
            {
              type: 'sphere',
              x: 60,
              y: 0,
              z: 0,
              radius: 40,
              color: '#2196f3',
              wireframe: false
            },
            {
              type: 'rectangle',
              x: 0,
              y: 0,
              z: -60,
              width: 100,
              height: 50,
              color: '#4caf50',
              linewidth: 2
            }
          ],
          message: 'Generated a basic composition with multiple elements.'
        };
      }
      
      setStatus('success');
      setAiMessage(mockResponse.message);
      setAiElements(mockResponse.elements);
      
    } catch (error) {
      setStatus('error');
      setAiMessage('Error generating components. Please try again.');
      console.error('Error generating components:', error);
    }
  };

  const handleAddToCanvas = () => {
    if (aiElements.length > 0 && !isLayerLocked) {
      addElements(aiElements);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 50, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 50, opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white rounded-lg shadow-xl w-full max-w-lg p-6 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                AI Component Composer
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <X size={24} />
              </button>
            </div>
            
            <div>
              <p className="text-sm text-gray-500 mb-4">
                Describe the CAD component or assembly you want to create, and the AI will generate it for you.
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Component Description
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., Create a simple chair with four legs and a backrest"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
                />
              </div>
              
              {status !== 'idle' && (
                <div className={`p-4 rounded-md mb-4 ${
                  status === 'loading' ? 'bg-blue-50 text-blue-700' :
                  status === 'success' ? 'bg-green-50 text-green-700' :
                  'bg-red-50 text-red-700'
                }`}>
                  <div className="flex items-center">
                    {status === 'loading' && <Loader size={16} className="mr-2 animate-spin" />}
                    {status === 'success' && <CheckCircle size={16} className="mr-2" />}
                    {status === 'error' && <AlertTriangle size={16} className="mr-2" />}
                    <p className="text-sm">{aiMessage}</p>
                  </div>
                  
                  {status === 'success' && (
                    <div className="mt-3">
                      <p className="text-xs font-medium mb-1">Generated {aiElements.length} element(s):</p>
                      <ul className="text-xs list-disc pl-5">
                        {aiElements.map((el, idx) => (
                          <li key={idx}>{el.type} - {el.color}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              
              <div className="mt-5 sm:mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  onClick={onClose}
                >
                  Cancel
                </button>
                {status === 'success' ? (
                  <button
                    type="button"
                    className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isLayerLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={handleAddToCanvas}
                    disabled={isLayerLocked}
                  >
                    <CheckCircle size={16} className="mr-2" />
                    Add to Canvas
                  </button>
                ) : (
                  <button
                    type="button"
                    className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${(status === 'loading' || !prompt.trim() || isLayerLocked) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={generateElements}
                    disabled={status === 'loading' || !prompt.trim() || isLayerLocked}
                  >
                    {status === 'loading' ? (
                      <>
                        <Loader size={16} className="mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Send size={16} className="mr-2" />
                        Generate Component
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
            
            <div className="mt-4 bg-gray-50 p-3 rounded-md text-xs text-gray-500 flex items-start">
              <Info size={14} className="mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Example prompts:</p>
                <ul className="mt-1 list-disc pl-5">
                  <li>Create a simple table with a flat top and four legs</li>
                  <li>Generate a chair with a backrest</li>
                  <li>Make a cube with a 100mm size</li>
                  <li>Design a sphere with a 75mm radius</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AICompositionDialog;