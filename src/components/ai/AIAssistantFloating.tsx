import React from 'react';
import { Cpu, X, MessageCircle } from 'react-feather';
import { useAIAssistantStore } from '../../store/aiAssistantStore';
import { motion, AnimatePresence } from 'framer-motion';

const AIAssistantFloating: React.FC = () => {
  const { isVisible, toggle, position, setPosition } = useAIAssistantStore();

  const handleDragEnd = (event: any, info: any) => {
    setPosition({ x: info.point.x, y: info.point.y });
  };

  return (
    <motion.div
      drag
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      initial={position}
      animate={position}
      className="fixed z-50"
    >
      <button
        onClick={toggle}
        className="p-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center transition-colors"
      >
        {isVisible ? (
          <X size={24} />
        ) : (
          <MessageCircle size={24} />
        )}
      </button>
    </motion.div>
  );
};

export default AIAssistantFloating;