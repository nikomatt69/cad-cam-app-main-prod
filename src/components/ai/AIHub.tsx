// src/components/ai/AIHub.tsx
import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Layers, 
  PenTool, 
  Sliders, 
  Tool, 
  Code, 
  Settings, 
  X, 
  ChevronRight
} from 'react-feather';
import { motion, AnimatePresence } from 'framer-motion';
import { useAIAgent } from 'src/contexts/AIAgentProvider';
import { aiPerformanceMonitor } from '../../lib/ai/aiPerformanceMonitor';
import { MODEL_CAPABILITIES } from '../../lib/ai/aiConfigManager';

import UnifiedTextToCAD from './UnifiedTextToCAD';

import AIToolpathOptimizer from './AIToolpathOptimizer';
import AIDesignAssistant from './AIDesignAssistant';
import AISettingsPanel from './AISettingPanel';
import { AIModelType } from '@/src/types/ai';

type AITool = 'textToCad' | 'designAssistant' | 'toolpathOptimizer' | 'settings';

interface AIHubProps {
  initialTool?: AITool;
  className?: string;
}

/**
 * AIHub provides a central interface for accessing all AI capabilities in the application.
 * It offers a sidebar navigation for different AI tools and renders the selected tool.
 */
const AIHub: React.FC<AIHubProps> = ({ 
  initialTool = 'textToCad',
  className
}) => {
  const { state, dispatch } = useAIAgent();
  const [performance, setPerformance] = useState(aiPerformanceMonitor.getMetrics());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setPerformance(aiPerformanceMonitor.getMetrics());
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const renderPerformanceIndicator = () => (
    <div className="absolute top-2 right-2 flex items-center space-x-2">
      <div className={`h-2 w-2 rounded-full ${
        performance.successRate > 98 ? 'bg-green-500' :
        performance.successRate > 95 ? 'bg-yellow-500' : 'bg-red-500'
      }`} />
      <span className="text-xs text-gray-500">
        {Math.round(performance.successRate)}% Success Rate
      </span>
    </div>
  );

  const renderModelSelector = () => (
    <div className="mb-4">
      <select
        value={state.currentModel}
        onChange={(e) => dispatch({ 
          type: 'SET_MODEL', 
          payload: e.target.value as AIModelType 
        })}
        className="w-full p-2 rounded border"
      >
        {Object.entries(MODEL_CAPABILITIES).map(([model, capabilities]) => (
          <option key={model} value={model}>
            {model} ({capabilities.bestFor.join(', ')})
          </option>
        ))}
      </select>
    </div>
  );
  
  const [activeTool, setActiveTool] = useState<AITool>(initialTool);
  const [isOpen, setIsOpen] = useState(true);
  
  // Tools configuration
  const tools = [
    { 
      id: 'textToCad' as AITool, 
      name: 'Text to CAD', 
      icon: <PenTool size={18} />,
      description: 'Convert text descriptions to 3D elements'
    },
    
    { 
      id: 'designAssistant' as AITool, 
      name: 'Design Assistant', 
      icon: <Cpu size={18} />,
      description: 'Get AI suggestions for your designs'
    },
    { 
      id: 'toolpathOptimizer' as AITool, 
      name: 'Toolpath Optimizer', 
      icon: <Tool size={18} />,
      description: 'Optimize machining parameters'
    },
    { 
      id: 'settings' as AITool, 
      name: 'AI Settings', 
      icon: <Settings size={18} />,
      description: 'Configure AI behavior'
    }
  ];
  
  // Render the active tool component
  const renderTool = () => {
    switch (activeTool) {
      case 'textToCad':
        return <UnifiedTextToCAD />; 
      case 'designAssistant':
        return <AIDesignAssistant />;
      case 'toolpathOptimizer':
        return <AIToolpathOptimizer />;
      case 'settings':
        return <AISettingsPanel />;
      default:
        return <div>Select an AI tool</div>;
    }
  };
  
  return (
    <div className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-lg flex-col overflow-hidden flex ${className || ''}`}>
      {renderPerformanceIndicator()}
      {renderModelSelector()}
      {/* Collapse/Expand button */}
      <button
        className="absolute -left-3 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white rounded-full p-1 shadow-md z-10"
        onClick={() => setIsOpen(!isOpen)}
        title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
      >
        <ChevronRight size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {/* Sidebar navigation */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 220, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-gray-100 dark:bg-gray-900 flex-shrink-0 overflow-hidden"
          >
            <div className="p-4">
              <div className="flex items-center mb-6">
                <Cpu className="text-blue-600 mr-2" size={20} />
                <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200">AI Tools</h2>
              </div>
              
              <nav className="space-y-1">
                {tools.map((tool) => (
                  <button
                    key={tool.id}
                    className={`w-full flex items-center px-3 py-2 rounded-md transition-colors ${
                      activeTool === tool.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                    }`}
                    onClick={() => setActiveTool(tool.id)}
                  >
                    <span className="mr-3">{tool.icon}</span>
                    <span>{tool.name}</span>
                  </button>
                ))}
              </nav>
              
              {/* Tool description */}
              <div className="mt-6 p-3 bg-white dark:bg-gray-800 rounded-md shadow-sm">
                <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                  {tools.find(t => t.id === activeTool)?.name}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {tools.find(t => t.id === activeTool)?.description}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Content area */}
      <div className="flex-grow p-4 overflow-auto max-h-[calc(100vh-40px)]">
        {renderTool()}
      </div>
    </div>
  );
};

export default AIHub;