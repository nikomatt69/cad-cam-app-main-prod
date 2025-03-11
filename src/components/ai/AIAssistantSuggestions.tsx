import React from 'react';
import { useAIAssistantStore, AssistantMode } from '../../store/aiAssistantStore';

interface AIAssistantSuggestionsProps {
  onSelectSuggestion: (suggestion: string) => void;
}

// Suggested prompts for each mode
const SUGGESTED_PROMPTS: Record<AssistantMode, string[]> = {
  general: [
    "What are the best practices for this task?",
    "Can you help me optimize this?",
    "How do I get started with this?"
  ],
  cad: [
    "Create a simple CAD model of a bracket",
    "How do I extrude this 2D sketch?", 
    "What are best practices for designing this part?",
    "Help me optimize this design for manufacturing"
  ],
  cam: [
    "What cutting parameters should I use for aluminum?",
    "How do I create an efficient pocket operation?",
    "Recommend a tool path strategy for this contour",
    "What's the best approach for machining this feature?"
  ],
  gcode: [
    "Debug this G-code for potential issues",
    "Optimize this G-code for faster machining",
    "What does this G-code command do?",
    "How to add a tool change operation to this code"
  ],
  toolpath: [
    "How to create a spiral toolpath for this pocket",
    "What stepover should I use for this surface finish?",
    "How to avoid tool engagement issues in this corner",
    "Generate a toolpath for machining this boss"
  ]
};

const AIAssistantSuggestions: React.FC<AIAssistantSuggestionsProps> = ({ 
  onSelectSuggestion 
}) => {
  const { currentMode } = useAIAssistantStore();
  const suggestions = SUGGESTED_PROMPTS[currentMode];
  
  return (
    <div className="p-2 space-y-1">
      <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
        Try asking
      </h4>
      <div className="space-y-1">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSelectSuggestion(suggestion)}
            className="w-full text-left p-2 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md text-gray-700 dark:text-gray-300 transition-colors"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AIAssistantSuggestions;