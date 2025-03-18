// src/components/ai/mcp/MCPAssemblyVisualizer.tsx
import React, { useState, useEffect } from 'react';
import { Clipboard, Check } from 'react-feather';

interface MCPAssemblyVisualizerProps {
  assembly: any;
  allElements: any[];
  onAddToCanvas: () => void;
}

const MCPAssemblyVisualizer: React.FC<MCPAssemblyVisualizerProps> = ({
  assembly,
  allElements,
  onAddToCanvas
}) => {
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Raggruppa gli elementi per tipo
  const elementsByType = allElements.reduce((groups, element) => {
    const type = element.type;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(element);
    return groups;
  }, {});
  
  // Copia gli ID degli elementi
  const copyElementIds = () => {
    const ids = allElements.map(el => el.id).join('\n');
    navigator.clipboard.writeText(ids);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">{assembly.name || 'Assemblaggio generato'}</h2>
        <button
          onClick={onAddToCanvas}
          className="px-4 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700"
        >
          Aggiungi al Canvas
        </button>
      </div>
      
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-blue-50 rounded-lg text-center">
          <span className="text-sm text-blue-700 font-medium">Elementi Totali</span>
          <p className="text-2xl font-bold">{allElements.length}</p>
        </div>
        
        <div className="p-4 bg-green-50 rounded-lg text-center">
          <span className="text-sm text-green-700 font-medium">Tipi Diversi</span>
          <p className="text-2xl font-bold">{Object.keys(elementsByType).length}</p>
        </div>
        
        <div className="p-4 bg-purple-50 rounded-lg text-center">
          <span className="text-sm text-purple-700 font-medium">Materiali</span>
          <p className="text-2xl font-bold">
            {new Set(allElements.map(el => el.material?.name)).size}
          </p>
        </div>
      </div>
      
      <div className="border rounded-md overflow-hidden">
        <div className="px-4 py-3 bg-gray-100 font-medium">Componenti dell assemblaggio</div>
        
        <div className="max-h-80 overflow-y-auto divide-y">
          {Object.entries(elementsByType).map(([type, elements]) => {
            const typedElements = elements as any[];
            return (
            <div key={type} className="p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium text-gray-800">{type} ({typedElements.length})</h3>
                <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                  {Math.round(typedElements.length / allElements.length * 100)}%
                </span>
              </div>
              
              <ul className="space-y-1">
                {typedElements.map((element, index) => (
                  <li 
                    key={element.id}
                    className={`px-3 py-2 text-sm rounded-md cursor-pointer ${
                      selectedElementId === element.id 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedElementId(element.id)}
                  >
                    <div className="flex justify-between">
                      <span>{element.name || `${type} ${index + 1}`}</span>
                      {element.material && (
                        <span className="text-gray-500">{element.material.name}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            );
          })}
        </div>
      </div>
      
      <div className="mt-4 border-t pt-4 flex justify-between items-center">
        <button
          onClick={copyElementIds}
          className="flex items-center text-sm text-gray-600 hover:text-gray-800"
        >
          {copied ? (
            <>
              <Check size={14} className="mr-1" />
              Copiato negli appunti
            </>
          ) : (
            <>
              <Clipboard size={14} className="mr-1" />
              Copia ID elementi
            </>
          )}
        </button>
        
        <span className="text-xs text-gray-500">
          Assembly ID: {assembly.id}
        </span>
      </div>
    </div>
  );
};

export default MCPAssemblyVisualizer;