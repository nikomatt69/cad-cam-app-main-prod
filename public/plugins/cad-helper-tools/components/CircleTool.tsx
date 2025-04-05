import React, { useState } from 'react';

interface CircleToolProps {
  tooltip: string;
  icon: string;
}

export function CircleTool({ tooltip, icon }: CircleToolProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const circleTools = [
    { id: 'circle-by-3-points', name: 'Circle by 3 Points' },
    { id: 'circle-by-diameter', name: 'Circle by Diameter' },
    { id: 'circle-by-center-radius', name: 'Circle by Center & Radius' },
  ];
  
  // Function to activate a specific circle tool
  const activateTool = (toolId: string) => {
    // This would typically dispatch an action to activate the tool
    console.log(`Activating circle tool: ${toolId}`);
    setIsOpen(false);
    
    // Here you would call into your application's tool system
    // For example: appDispatch({ type: 'SET_ACTIVE_TOOL', payload: toolId });
    
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
          <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            {circleTools.map(tool => (
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