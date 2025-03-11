// src/components/ai/AIProcessingIndicator.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, Loader, AlertTriangle, CheckCircle } from 'react-feather';

type AIProcessingStatus = 'idle' | 'processing' | 'success' | 'error';

interface AIProcessingIndicatorProps {
  status: AIProcessingStatus;
  message?: string;
  progress?: number; // 0-100
  showDetails?: boolean;
  className?: string;
}

const AIProcessingIndicator: React.FC<AIProcessingIndicatorProps> = ({
  status,
  message,
  progress = 0,
  showDetails = false,
  className = '',
}) => {
  const statusConfig = {
    idle: {
      icon: <Cpu size={18} className="text-blue-500" />,
      color: 'bg-blue-50 border-blue-200',
      textColor: 'text-blue-700'
    },
    processing: {
      icon: <Loader size={18} className="text-blue-500 animate-spin" />,
      color: 'bg-blue-50 border-blue-200',
      textColor: 'text-blue-700'
    },
    success: {
      icon: <CheckCircle size={18} className="text-green-500" />,
      color: 'bg-green-50 border-green-200',
      textColor: 'text-green-700'
    },
    error: {
      icon: <AlertTriangle size={18} className="text-red-500" />,
      color: 'bg-red-50 border-red-200',
      textColor: 'text-red-700'
    }
  };
  
  const { icon, color, textColor } = statusConfig[status];
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`p-3 flex items-start border rounded-md ${color} ${className}`}
    >
      <div className="mr-3 flex-shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1">
        <p className={`text-sm font-medium ${textColor}`}>
          {message || getDefaultMessage(status)}
        </p>
        
        {status === 'processing' && (
          <div className="mt-2 w-full bg-blue-100 rounded-full h-1.5">
            <motion.div 
              className="bg-blue-500 h-1.5 rounded-full" 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}
        
        {showDetails && status === 'error' && (
          <button 
            className="mt-1 text-xs underline text-red-600 hover:text-red-800"
            onClick={() => console.log('Show error details')}
          >
            Show details
          </button>
        )}
      </div>
    </motion.div>
  );
};

function getDefaultMessage(status: AIProcessingStatus): string {
  switch (status) {
    case 'idle':
      return 'AI assistant ready';
    case 'processing':
      return 'AI is analyzing your design...';
    case 'success':
      return 'Analysis complete';
    case 'error':
      return 'An error occurred during AI processing';
  }
}

export default AIProcessingIndicator;