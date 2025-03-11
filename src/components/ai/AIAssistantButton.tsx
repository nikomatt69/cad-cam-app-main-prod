import React from 'react';
import { Cpu, X } from 'react-feather';
import { useAIAssistantStore } from '../../store/aiAssistantStore';

interface AIAssistantButtonProps {
  mode?: 'cad' | 'cam';
}

const AIAssistantButton: React.FC<AIAssistantButtonProps> = ({ mode = 'cad' }) => {
  const { isVisible, toggle, setMode } = useAIAssistantStore();
  
  const handleClick = () => {
    setMode(mode);
    toggle();
  };
  
  return (
    <button
      onClick={handleClick}
      className="p-2 rounded-md hover:bg-blue-100 dark:hover:bg-gray-700 transition-colors group relative"
      title={isVisible ? "Hide AI Assistant" : "Show AI Assistant"}
    >
      {isVisible ? (
        <X 
          size={20} 
          className="text-blue-600 dark:text-blue-400" 
        />
      ) : (
        <Cpu 
          size={20} 
          className="text-gray-600 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400" 
        />
      )}
      
      <span className="absolute opacity-0 group-hover:opacity-100 transition-opacity bottom-full left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap pointer-events-none">
        {isVisible ? "Hide AI Assistant" : "Show AI Assistant"}
      </span>
    </button>
  );
};

export default AIAssistantButton;