// src/components/ai/AISettingsPanel.tsx
import React from 'react';
import { useAIAgent } from 'src/contexts/AIAgentProvider';
import { Sliders, Database, RefreshCw } from 'react-feather';
import { AIModelType } from '@/src/types/ai';
import { AI_MODELS } from '../../lib/ai/aiConfigManager';

const AISettingsPanel: React.FC = () => {
  const { state, dispatch } = useAIAgent();
  
  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
        <Sliders size={18} className="mr-2" />
        AI Assistant Settings
      </h3>
      
      <div className="space-y-4">
        {/* Enable/Disable AI */}
        <div className="flex items-center justify-between">
          <label htmlFor="ai-toggle" className="text-sm font-medium text-gray-700">
            Enable AI Assistant
          </label>
          <div className="relative inline-block w-10 mr-2 align-middle select-none">
            <input 
              id="ai-toggle" 
              type="checkbox"
              checked={state.isEnabled}
              onChange={(e) => dispatch({ type: 'TOGGLE_AI', payload: e.target.checked })}
              className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
            />
            <label 
              htmlFor="ai-toggle" 
              className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${
                state.isEnabled ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            />
          </div>
        </div>
        
        {/* Model Selection */}
        <div>
          <label htmlFor="ai-model" className="block text-sm font-medium text-gray-700 mb-1">
            AI Model
          </label>
          <select
            id="ai-model"
            value={state.currentModel as AIModelType}
            onChange={(e) => dispatch({ type: 'SET_MODEL', payload: e.target.value as AIModelType })}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
            <option value="claude-3-opus">Claude 3 Opus</option>
            <option value="claude-3-haiku-20240229">Claude 3 Haiku</option>
          </select>
        </div>
        
        {/* Temperature Control */}
        <div>
          <label htmlFor="ai-temperature" className="block text-sm font-medium text-gray-700 mb-1">
            Temperature: {state.temperature.toFixed(1)}
          </label>
          <input
            id="ai-temperature"
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={state.temperature}
            onChange={(e) => dispatch({ 
              type: 'SET_TEMPERATURE', 
              payload: parseFloat(e.target.value) 
            })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Precise</span>
            <span>Creative</span>
          </div>
        </div>
        
        {/* Auto-suggest Feature */}
        <div className="flex items-center">
          <input
            id="auto-suggest"
            type="checkbox"
            checked={state.settings.autoSuggest}
            onChange={(e) => dispatch({ 
              type: 'UPDATE_SETTINGS', 
              payload: { autoSuggest: e.target.checked } 
            })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="auto-suggest" className="ml-2 block text-sm text-gray-700">
            Enable automatic suggestions
          </label>
        </div>
        
        {/* History Management */}
        <div className="pt-3 border-t border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-medium text-gray-700 flex items-center">
              <Database size={14} className="mr-1" /> AI History
            </h4>
            <button
              onClick={() => dispatch({ type: 'CLEAR_HISTORY' })}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
            >
              <RefreshCw size={12} className="mr-1" /> Clear
            </button>
          </div>
          <p className="text-xs text-gray-500">
            {state.history.length} items in history
          </p>
        </div>
      </div>
    </div>
  );
};

export default AISettingsPanel;