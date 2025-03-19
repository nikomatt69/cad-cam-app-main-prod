// src/components/ui/ToastContainer.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import Toast, { Toast as ToastType } from './Toast';
import { v4 as uuidv4 } from 'uuid';

const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastType[]>([]);
  
  const removeToast = useCallback((id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);
  
  const addToast = useCallback((message: string, type: ToastType['type'] = 'info', duration = 5000) => {
    const newToast: ToastType = {
      id: uuidv4(),
      message,
      type,
      duration,
    };
    
    setToasts((prevToasts) => [...prevToasts, newToast]);
    
    return newToast.id;
  }, []);
  
  // Expose the toast functions to the window object
  useEffect(() => {
    window.toast = {
      info: (message: string) => addToast(message, 'info'),
      success: (message: string) => addToast(message, 'success'),
      warning: (message: string) => addToast(message, 'warning'),
      error: (message: string) => addToast(message, 'error'),
    };
    
    return () => {
      window.toast = undefined;
    };
  }, [addToast]);
  
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ToastContainer;