// src/components/ai/mcp/MCPGenerationMonitor.tsx
import React from 'react';
import { Server, Loader, CheckCircle, AlertTriangle, Terminal } from 'react-feather';

interface MCPGenerationMonitorProps {
  isGenerating: boolean;
  progress: number;
  stage: string;
  error: string | null;
  className?: string;
}

const MCPGenerationMonitor: React.FC<MCPGenerationMonitorProps> = ({
  isGenerating,
  progress,
  stage,
  error,
  className = ''
}) => {
  const getStageLabel = (stage: string): string => {
    switch (stage) {
      case 'starting':
        return 'Inizializzazione MCP';
      case 'processing':
        return 'Generazione del modello 3D';
      case 'completed':
        return 'Assemblaggio completato';
      case 'error':
        return 'Errore durante la generazione';
      default:
        return stage || 'In attesa';
    }
  };
  
  const getIcon = () => {
    if (error) return <AlertTriangle className="text-red-500" size={20} />;
    if (!isGenerating && progress === 100) return <CheckCircle className="text-green-500" size={20} />;
    if (isGenerating) return <Loader className="text-blue-500 animate-spin" size={20} />;
    return <Server className="text-gray-500" size={20} />;
  };
  
  return (
    <div className={`p-4 border rounded-lg ${
      error ? 'bg-red-50 border-red-200' :
      isGenerating ? 'bg-blue-50 border-blue-200' :
      progress === 100 ? 'bg-green-50 border-green-200' :
      'bg-gray-50 border-gray-200'
    } ${className}`}>
      <div className="flex items-center mb-2">
        {getIcon()}
        <span className="ml-2 font-medium">{getStageLabel(stage)}</span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
        <div 
          className={`h-2 rounded-full ${
            error ? 'bg-red-500' :
            progress === 100 ? 'bg-green-500' :
            'bg-blue-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {error && (
        <div className="mt-2 p-2 bg-red-100 rounded text-sm text-red-800 flex items-start">
          <Terminal size={14} className="mr-1 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {isGenerating && progress > 0 && (
        <div className="text-xs text-gray-500 text-right">
          {progress}% completato
        </div>
      )}
    </div>
  );
};

export default MCPGenerationMonitor;