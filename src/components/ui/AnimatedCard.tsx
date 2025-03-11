// src/components/ui/AnimatedCard.tsx
import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

const AnimatedCard: React.FC<AnimatedCardProps> = ({ 
  children, 
  className = '',
  delay = 0 
}) => {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 24, 
        delay 
      }}
      whileHover={{ y: -5, boxShadow: "0px 10px 20px rgba(0, 0, 0, 0.1)" }}
      className={`bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white shadow-md rounded-md overflow-hidden ${className}`}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedCard;