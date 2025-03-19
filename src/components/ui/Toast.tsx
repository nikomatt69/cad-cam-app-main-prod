// src/components/ui/Toast.tsx
import React, { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'react-feather';
import { motion, AnimatePresence } from 'framer-motion';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  const [progress, setProgress] = useState(100);
  const duration = toast.duration || 5000;
  
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, duration);
    
    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev - (100 / (duration / 100));
        return newProgress < 0 ? 0 : newProgress;
      });
    }, 100);
    
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [toast.id, duration, onClose]);
  
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="text-green-500" size={18} />;
      case 'error':
        return <AlertCircle className="text-red-500" size={18} />;
      case 'warning':
        return <AlertTriangle className="text-yellow-500" size={18} />;
      default:
        return <Info className="text-blue-500" size={18} />;
    }
  };
  
  const getBgColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-800';
      case 'error':
        return 'bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-800';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900 border-yellow-200 dark:border-yellow-800';
      default:
        return 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-800';
    }
  };
  
  const getTextColor = () => {
    switch (toast.type) {
      case 'success':
        return 'text-green-800 dark:text-green-200';
      case 'error':
        return 'text-red-800 dark:text-red-200';
      case 'warning':
        return 'text-yellow-800 dark:text-yellow-200';
      default:
        return 'text-blue-800 dark:text-blue-200';
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
      className={`flex items-center p-4 mb-2 border rounded-lg shadow-md ${getBgColor()} ${getTextColor()}`}
      style={{ width: '300px' }}
    >
      <div className="flex-shrink-0 mr-2">
        {getIcon()}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{toast.message}</p>
      </div>
      <button
        className="ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
        onClick={() => onClose(toast.id)}
      >
        <X size={16} />
      </button>
      
      <div className="absolute bottom-0 left-0 h-1 bg-current opacity-20 rounded-b-lg" style={{ width: `${progress}%` }} />
    </motion.div>
  );
};

export default Toast;