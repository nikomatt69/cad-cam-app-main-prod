import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Truck, Zap, Target } from 'react-feather';
import { aiToolpathOptimizer } from '@/src/lib/aiToolpathOptimizer';
import { Toolpath, ToolpathParameters } from '@/src/types/ai';

const AIToolpathOptimizer: React.FC = () => {
  const [optimizedToolpath, setOptimizedToolpath] = useState<Toolpath | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const performToolpathOptimization = async () => {
    setIsOptimizing(true);
    try {
      // Create proper arguments matching the expected types
      const mockToolpath: Toolpath = {
        id: 'sample-toolpath',
        points: [{ x: 0, y: 0, z: 0 }]
      };
      
      const mockParameters: ToolpathParameters = {
        operation: 'milling',
        tool: {
          type: 'endmill',
          diameter: 10
        },
        cutting: {
          speed: 1000,
          feedRate: 200
        }
      };
      
      const result = await aiToolpathOptimizer.optimize(mockToolpath, mockParameters);
      setOptimizedToolpath(result);
    } catch (error) {
      console.error('Errore di Ottimizzazione del Percorso', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white shadow-lg rounded-xl p-6">
      <h2 className="text-xl font-bold text-gray-800 flex items-center">
        <Target className="mr-2 text-green-500" />
        AI Toolpath Optimizer
      </h2>
      
      <motion.button 
        onClick={performToolpathOptimization}
        disabled={isOptimizing}
        className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
      >
        {isOptimizing ? 'Optimizing...' : 'Optimize Toolpath'}
      </motion.button>

      {/* Rendering risultati ottimizzazione */}
      {optimizedToolpath && (
        <div className="mt-4 p-4 border border-gray-200 rounded-lg">
          <h3 className="font-semibold text-gray-700">Optimization Results</h3>
          <p className="text-gray-600 mt-2">
            {optimizedToolpath.aiOptimizations?.description || 'No description available'}
          </p>
          <div className="mt-2">
            <span className="text-sm font-medium text-gray-500">Score: </span>
            <span className="text-sm font-medium text-green-600">
              {optimizedToolpath.aiOptimizations?.optimizationScore || 0}
            </span>
          </div>
          
          {optimizedToolpath.aiOptimizations?.suggestedModifications && 
          optimizedToolpath.aiOptimizations.suggestedModifications.length > 0 && (
            <div className="mt-3">
              <h4 className="text-sm font-medium text-gray-700">Suggested Modifications:</h4>
              <ul className="mt-1 space-y-1">
                {optimizedToolpath.aiOptimizations.suggestedModifications.map((mod, index) => (
                  <li key={index} className="text-sm text-gray-600">
                    {mod.description || 'No description'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIToolpathOptimizer;