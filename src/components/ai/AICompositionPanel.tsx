import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  AlertTriangle, 
  Layers, 
  Tool, 
  Compass, 
  Box, 
  Loader, 
  RefreshCw 
} from 'react-feather';
import { useElementsStore } from 'src/store/elementsStore';
import { aiService } from 'src/lib/aiService';
import AICompositionDialog from './AICompositionDialog';

interface AICompositionPanelProps {
  isLayerLocked: boolean;
}

// Predefined design categories to inspire users
const DESIGN_CATEGORIES = [
  { 
    name: 'Mechanical', 
    icon: <Compass size={16} />,
    prompts: [
      'Robotic arm with multiple joints',
      'Planetary gear system',
      'Precision bearing assembly',
      'Pneumatic cylinder mechanism',
      'Complex transmission system'
    ]
  },
  { 
    name: 'Architectural', 
    icon: <Layers size={16} />,
    prompts: [
      'Modern minimalist house',
      'Futuristic skyscraper',
      'Sustainable eco-friendly building',
      'Bridge design with unique support structure',
      'Underground research facility'
    ]
  },
  { 
    name: 'Industrial', 
    icon: <Tool size={16} />,
    prompts: [
      'Automated manufacturing cell',
      'Conveyor system with sorting mechanism',
      'CNC machine frame',
      'Industrial robot workstation',
      'Modular production line component'
    ]
  },
  { 
    name: 'Creative', 
    icon: <Box size={16} />,
    prompts: [
      'Sculptural furniture piece',
      'Abstract geometric sculpture',
      'Kinetic art installation',
      'Modular seating system',
      'Parametric design exploration'
    ]
  }
];

const AICompositionPanel: React.FC<AICompositionPanelProps> = ({ isLayerLocked }) => {
  const [showDialog, setShowDialog] = useState(false);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [aiPrompt, setAIPrompt] = useState('');
  const [aiError, setAIError] = useState<string | null>(null);
  const [generatedDesigns, setGeneratedDesigns] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  const { addElements } = useElementsStore();

  const generateAIElements = async (customPrompt?: string) => {
    if (isLayerLocked) {
      alert('Cannot add elements to a locked layer');
      return;
    }

    setIsAIGenerating(true);
    setAIError(null);

    const promptToUse = customPrompt || aiPrompt;

    try {
      // Enhanced prompt for more structured output
      const fullPrompt = `Generate a complex CAD design based on this description: ${promptToUse}. 
      Create multiple interconnected elements with realistic proportions and relationships.
      Provide a JSON array with detailed elements. Each element must include:
      - Precise type: 'cube', 'sphere', 'rectangle', 'line', 'cylinder'
      - Exact x, y, z coordinates
      - Detailed dimensions 
      - Realistic color
      - Optional: rotation, additional geometric details
      
      Rules:
      - Use a coherent color palette
      - Ensure elements make logical sense together
      - Create complex, multi-part designs
      - Scale and position elements realistically
      
      Output format:
      [
        {
          "type": "cube",
          "x": 0,
          "y": 0,
          "z": 0,
          "width": 50,
          "height": 50,
          "depth": 50,
          "color": "#2196F3",
          "rotation": {
            "x": 15,
            "y": 30,
            "z": 0
          }
        }
        // More elements...
      ]`;

      const response = await aiService.generateResponse(fullPrompt);
      
      try {
        const parsedElements = JSON.parse(response);
        
        // Validate and enhance elements
        const validatedElements = parsedElements.map((element: any) => {
          // Ensure required properties exist with sensible defaults
          return {
            type: element.type || 'cube',
            x: element.x ?? 0,
            y: element.y ?? 0,
            z: element.z ?? 0,
            width: element.width ?? 50,
            height: element.height ?? 50,
            depth: element.depth ?? 50,
            radius: element.radius ?? 25,
            color: element.color ?? '#2196F3',
            ...(element.rotation && { 
              rotation: {
                x: element.rotation.x ?? 0,
                y: element.rotation.y ?? 0,
                z: element.rotation.z ?? 0
              }
            })
          };
        });

        // Store generated designs for selection
        setGeneratedDesigns(prev => [
          ...prev, 
          { 
            prompt: promptToUse, 
            elements: validatedElements,
            timestamp: new Date().toISOString()
          }
        ]);

        setIsAIGenerating(false);
        setAIPrompt('');
      } catch (parseError) {
        setAIError('Failed to parse AI-generated elements. Please try again.');
        setIsAIGenerating(false);
      }
    } catch (error) {
      console.error('AI Element Generation Error:', error);
      setAIError('Failed to generate elements. Please try again.');
      setIsAIGenerating(false);
    }
  };

  const handleAddDesign = (design: any) => {
    if (isLayerLocked) {
      alert('Cannot add elements to a locked layer');
      return;
    }
    
    addElements(design.elements);
  };

  const handleCategoryPrompt = (prompt: string) => {
    setAIPrompt(prompt);
    generateAIElements(prompt);
  };

  return (
    <div className="p-3 space-y-3">
      {isLayerLocked && (
        <div className="mb-3 p-2 bg-yellow-50 rounded-md text-xs text-yellow-700 flex items-center">
          <AlertTriangle size={12} className="mr-1 flex-shrink-0" />
          <span>Current layer is locked. Unlock it to add components.</span>
        </div>
      )}

      {/* Design Category Inspiration */}
      <div className=" flex space-y-2">
        <h3 className="text-sm flex font-medium text-gray-700">Design Categories</h3>
        <div className="flex items-center space-x-2 overflow-x-auto pb-2">
          {DESIGN_CATEGORIES.map((category) => (
            <button
              key={category.name}
              onClick={() => setActiveCategory(category.name)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm transition-colors ${
                activeCategory === category.name 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.icon}
              <span>{category.name}</span>
            </button>
          ))}
        </div>

        {activeCategory && (
          <div className="space-y-2">
            {DESIGN_CATEGORIES.find(c => c.name === activeCategory)?.prompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleCategoryPrompt(prompt)}
                className="w-full text-left px-3 py-2 bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white border rounded-md hover:bg-gray-50 text-sm"
                disabled={isAIGenerating}
              >
                {prompt}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* AI Prompt Input */}
      <div className="flex space-x-2">
        <input
          type="text"
          value={aiPrompt}
          onChange={(e) => setAIPrompt(e.target.value)}
          placeholder="Describe your CAD design..."
          className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLayerLocked || isAIGenerating}
        />
        <button
          onClick={() => generateAIElements()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          disabled={isLayerLocked || isAIGenerating || !aiPrompt.trim()}
        >
          {isAIGenerating ? (
            <Loader size={12} className="animate-spin mr-2" />
          ) : (
            <Send size={12} className="mr-2" />
          )}
          Generate
        </button>
      </div>

      {/* Error Display */}
      {aiError && (
        <div className="text-xs text-red-600 flex items-center">
          <AlertTriangle size={12} className="mr-1" />
          {aiError}
        </div>
      )}

      {/* Generated Designs */}
      {generatedDesigns.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-700">Generated Designs</h3>
            <button 
              onClick={() => setGeneratedDesigns([])}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center"
            >
              <RefreshCw size={12} className="mr-1" />
              Clear
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {generatedDesigns.map((design, index) => (
              <div 
                key={index} 
                className="bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white border rounded-md p-3 space-y-2"
              >
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-700 truncate max-w-[70%]">
                    {design.prompt}
                  </p>
                  <button
                    onClick={() => handleAddDesign(design)}
                    className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                    disabled={isLayerLocked}
                  >
                    Add Design
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Generated: {new Date(design.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AICompositionPanel;