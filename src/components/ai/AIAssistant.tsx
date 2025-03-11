import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { MessageCircle, X, Maximize2, Minimize2 } from 'react-feather';
import { motion, AnimatePresence } from 'framer-motion';
import { useAIAgent } from 'src/contexts/AIAgentProvider';

const AIAssistant: React.FC = () => {
  const [isBrowser, setIsBrowser] = useState(false);
  const router = useRouter();
  const { state, showAssistant, hideAssistant, toggleAssistantPanel, generateSuggestions } = useAIAgent();
  const [contextualSuggestions, setContextualSuggestions] = useState<string[]>([]);
  
  // Controllo per SSR
  useEffect(() => {
    setIsBrowser(true);
  }, []);
  
  // Generate suggestions based on current path
  useEffect(() => {
    if (!isBrowser) return;
    
    const generateContextualSuggestions = async () => {
      const path = router.asPath;
      const pageContext = `Current page: ${path}`;
      const suggestions = await generateSuggestions(pageContext);
      setContextualSuggestions(suggestions.map(s => typeof s === 'string' ? s : s.description));
    };
    
    if (state.assistant.isVisible && state.settings.autoSuggest) {
      generateContextualSuggestions();
    }
  }, [router.asPath, state.assistant.isVisible, state.settings.autoSuggest, generateSuggestions, isBrowser]);
  
  // Se siamo in SSR, non renderizziamo nulla
  if (!isBrowser) {
    return null;
  }
  
  if (!state.assistant.isVisible) {
    return (
      <button
        onClick={showAssistant}
        className="fixed bottom-4 right-4 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50"
        aria-label="Show AI Assistant"
      >
        <MessageCircle size={24} />
      </button>
    );
  }
  
  return (
    <AnimatePresence>
      {state.assistant.isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className={`fixed z-50 ${state.assistant.isPanelOpen ? 'bottom-0 right-0 w-96 h-96' : 'bottom-4 right-4 w-auto'}`}
        >
          {state.assistant.isPanelOpen ? (
            <div className="bg-white dark:bg-gray-800 rounded-tl-lg shadow-xl flex flex-col h-full">
              <div className="flex items-center justify-between p-3 border-b dark:border-gray-700">
                <h3 className="font-medium">AI Assistant</h3>
                <div className="flex space-x-1">
                  <button
                    onClick={toggleAssistantPanel}
                    className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    aria-label="Minimize"
                  >
                    <Minimize2 size={16} />
                  </button>
                  <button
                    onClick={hideAssistant}
                    className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    aria-label="Close"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  {/* Context-specific suggestions */}
                  {contextualSuggestions.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Suggestions for {state.mode} mode
                      </h4>
                      <ul className="space-y-2">
                        {contextualSuggestions.map((suggestion, index) => (
                          <li 
                            key={index}
                            className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 
                                       text-sm rounded-md cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40"
                          >
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Recent history */}
                  {state.history.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Recent Activity
                      </h4>
                      <ul className="space-y-2">
                        {state.history.slice(0, 3).map((item) => (
                          <li 
                            key={item.id}
                            className="p-2 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 
                                       text-sm rounded-md"
                          >
                            {item.type === 'text_to_cad' ? (
                              <span>Generated CAD from: &quot;{item.prompt?.substring(0, 30)}...&quot;</span>
                            ) : item.type === 'gcode_optimization' ? (
                              <span>Optimized G-code</span>
                            ) : item.type === 'design_analysis' ? (
                              <span>Analyzed design</span>
                            ) : (
                              <span>{item.type}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg flex items-center space-x-2">
              <button
                onClick={hideAssistant}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                aria-label="Close"
              >
                <X size={18} />
              </button>
              <span>AI Assistant</span>
              <button
                onClick={toggleAssistantPanel}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                aria-label="Expand"
              >
                <Maximize2 size={18} />
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AIAssistant; 