import React, { useState, useEffect } from 'react';

interface MeasurementPanelProps {
  title: string;
  icon: string;
}

export function MeasurementPanel({ title, icon }: MeasurementPanelProps) {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [measurementResults, setMeasurementResults] = useState<string[]>([]);
  const [units, setUnits] = useState<'mm' | 'in'>('mm');
  
  const tools = [
    { 
      id: 'measure-distance', 
      name: 'Distance', 
      description: 'Measure distance between points or entities',
      icon: 'ruler' 
    },
    { 
      id: 'measure-angle', 
      name: 'Angle',
      description: 'Measure angle between lines or three points',
      icon: 'protractor'
    },
    { 
      id: 'measure-area', 
      name: 'Area',
      description: 'Measure area of a closed shape',
      icon: 'square'
    }
  ];
  
  useEffect(() => {
    // Simulate receiving measurement results
    const handleMeasurementResult = (event: CustomEvent) => {
      const { result, toolId } = event.detail;
      setMeasurementResults(prev => [result, ...prev.slice(0, 4)]);
    };
    
    document.addEventListener('measurement:result', handleMeasurementResult as EventListener);
    
    return () => {
      document.removeEventListener('measurement:result', handleMeasurementResult as EventListener);
    };
  }, []);
  
  const activateTool = (toolId: string) => {
    setSelectedTool(toolId);
    
    // Simulate tool activation
    const event = new CustomEvent('cadtool:activate', { 
      detail: { toolId } 
    });
    document.dispatchEvent(event);
    
    // For demonstration, simulate a measurement result after 2 seconds
    setTimeout(() => {
      let result = '';
      
      if (toolId === 'measure-distance') {
        const distance = (Math.random() * 100).toFixed(2);
        result = `Distance: ${distance} ${units}`;
      } else if (toolId === 'measure-angle') {
        const angle = (Math.random() * 180).toFixed(1);
        result = `Angle: ${angle}°`;
      } else if (toolId === 'measure-area') {
        const area = (Math.random() * 1000).toFixed(2);
        result = `Area: ${area} ${units}²`;
      }
      
      const event = new CustomEvent('measurement:result', { 
        detail: { result, toolId } 
      });
      document.dispatchEvent(event);
    }, 2000);
  };
  
  const toggleUnits = () => {
    setUnits(prev => prev === 'mm' ? 'in' : 'mm');
  };
  
  return (
    <div className="cad-helper-tools-panel">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium">{title}</h3>
        <button 
          className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
          onClick={toggleUnits}
        >
          {units.toUpperCase()}
        </button>
      </div>
      
      {/* Measurement tools */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {tools.map(tool => (
          <button
            key={tool.id}
            className={`p-2 text-center rounded text-sm ${
              selectedTool === tool.id 
                ? 'bg-blue-100 border border-blue-300' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
            onClick={() => activateTool(tool.id)}
            title={tool.description}
          >
            {tool.name}
          </button>
        ))}
      </div>
      
      {/* Measurement results */}
      {measurementResults.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2">
            Recent Measurements
          </div>
          <div className="space-y-2">
            {measurementResults.map((result, index) => (
              <div 
                key={index} 
                className="cad-helper-tools-measurement-result"
              >
                {result}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Tool help text */}
      {selectedTool && (
        <div className="mt-4 p-2 bg-blue-50 text-sm rounded">
          {selectedTool === 'measure-distance' && 
            'Click two points or entities to measure the distance between them.'}
          {selectedTool === 'measure-angle' && 
            'Select two lines to measure the angle, or click three points.'}
          {selectedTool === 'measure-area' && 
            'Click on a closed shape to measure its area.'}
        </div>
      )}
    </div>
  );
}