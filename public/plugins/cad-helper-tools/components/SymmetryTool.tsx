import React, { useState } from 'react';

interface SymmetryToolProps {
  tooltip: string;
  icon: string;
}

export function SymmetryTool({ tooltip, icon }: SymmetryToolProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const symmetryTools = [
    { id: 'symmetry-tool', name: 'Symmetry Across Axis' },
    { id: 'mirror-tool', name: 'Mirror Across Line' },
    { id: 'polar-array', name: 'Polar Array' },
  ];
  
  // Function to activate a specific symmetry tool
  const activateTool = (toolId: string) => {
    console.log(`Activating symmetry tool: ${toolId}`);
    setIsOpen(false);
    
    // Simulate tool activation for demo purposes
    const event = new CustomEvent('cadtool:activate', { 
      detail: { toolId } 
    });
    document.dispatchEvent(event);
  };
  
  return (
    <div className="relative">
      <button
        className="cad-helper-tools-button"
        title={tooltip}
        onClick={() => setIsOpen(!isOpen)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1z" clipRule="evenodd" />
          <path d="M5 8a3 3 0 116 0 3 3 0 01-6 0zM15 8a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            {symmetryTools.map(tool => (
              <button
                key={tool.id}
                className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => activateTool(tool.id)}
              >
                {tool.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}