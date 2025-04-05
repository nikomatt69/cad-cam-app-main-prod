import React, { useState, useEffect } from 'react';

interface ToolsPanelProps {
  title: string;
  icon: string;
}

export function ToolsPanel({ title, icon }: ToolsPanelProps) {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [activeTools, setActiveTools] = useState<string[]>([]);
  
  const tools = [
    { 
      id: 'circle-by-3-points', 
      name: 'Circle by 3 Points', 
      description: 'Create a circle through three points',
      icon: 'circle' 
    },
    { 
      id: 'circle-by-diameter', 
      name: 'Circle by Diameter',
      description: 'Create a circle by specifying diameter',
      icon: 'circle-diameter'
    },
    { 
      id: 'symmetry-tool', 
      name: 'Symmetry',
      description: 'Create a symmetrical copy',
      icon: 'symmetry'
    },
    { 
      id: 'mirror-tool', 
      name: 'Mirror',
      description: 'Create a mirrored copy across a line',
      icon: 'mirror'
    }
  ];
  
  // Listen for tool activation events
  useEffect(() => {
    const handleToolActivation = (event: CustomEvent) => {
      const { toolId } = event.detail;
      setSelectedTool(toolId);
      
      // Add to recent tools if not already there
      setActiveTools(prev => {
        if (prev.includes(toolId)) {
          return prev;
        }
        // Add to the beginning, keep max 5 items
        return [toolId, ...prev].slice(0, 5);
      });
    };
    
    document.addEventListener('cadtool:activate', handleToolActivation as EventListener);
    
    return () => {
      document.removeEventListener('cadtool:activate', handleToolActivation as EventListener);
    };
  }, []);
  
  const activateTool = (toolId: string) => {
    setSelectedTool(toolId);
    
    // Simulate tool activation
    const event = new CustomEvent('cadtool:activate', { 
      detail: { toolId } 
    });
    document.dispatchEvent(event);
  };
  
  return (
    <div className="cad-helper-tools-panel">
      <h3 className="cad-helper-tools-panel-header">{title}</h3>
      
      {/* Recently used tools */}
      {activeTools.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2">
            Recent Tools
          </div>
          <div className="flex flex-wrap gap-2">
            {activeTools.map(toolId => {
              const tool = tools.find(t => t.id === toolId);
              if (!tool) return null;
              
              return (
                <button
                  key={`recent-${toolId}`}
                  className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
                  onClick={() => activateTool(toolId)}
                >
                  {tool.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
      
      {/* All tools list */}
      <div className="space-y-1">
        {tools.map(tool => (
          <div
            key={tool.id}
            className={`cad-helper-tools-tool-item ${selectedTool === tool.id ? 'active' : ''}`}
            onClick={() => activateTool(tool.id)}
          >
            <div className="cad-helper-tools-tool-icon">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                {tool.icon === 'circle' && <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" />}
                {tool.icon === 'symmetry' && <path fillRule="evenodd" d="M10 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1z" clipRule="evenodd" />}
                {/* Add other icon paths here */}
              </svg>
            </div>
            <div>
              <div>{tool.name}</div>
              <div className="cad-helper-tools-tool-details">{tool.description}</div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Tool options for selected tool */}
      {selectedTool && (
        <div className="mt-6 p-3 bg-gray-50 rounded">
          <h4 className="font-medium mb-2">
            {tools.find(t => t.id === selectedTool)?.name} Options
          </h4>
          
          {/* Tool-specific options would go here */}
          {selectedTool === 'circle-by-3-points' && (
            <div className="space-y-2">
              <div className="text-sm">Click to define three points that the circle will pass through.</div>
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="snap-to-grid" 
                  className="mr-2"
                />
                <label htmlFor="snap-to-grid" className="text-sm">Snap to grid</label>
              </div>
            </div>
          )}
          
          {/* Symmetry tool options */}
          {selectedTool === 'symmetry-tool' && (
            <div className="space-y-2">
              <div className="text-sm">Select elements, then define the axis of symmetry.</div>
              <div className="grid grid-cols-3 gap-2">
                <button className="text-sm bg-blue-500 text-white px-2 py-1 rounded">X Axis</button>
                <button className="text-sm bg-blue-500 text-white px-2 py-1 rounded">Y Axis</button>
                <button className="text-sm bg-blue-500 text-white px-2 py-1 rounded">Z Axis</button>
              </div>
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="keep-original" 
                  className="mr-2"
                  checked
                />
                <label htmlFor="keep-original" className="text-sm">Keep original</label>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}