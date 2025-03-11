import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Maximize2, Minimize2 } from 'react-feather';
import { useAIAssistantStore } from '../store/aiAssistantStore';
import { aiAssistant } from '../lib/ai/aiAssistant';
import AIAssistantSuggestions from '../components/ai/AIAssistantSuggestions';

const AIAssistantPanel: React.FC = () => {
  const {
    isVisible,
    isExpanded,
    currentMode,
    selectedModel,
    messageHistory,
    setExpanded,
    addMessage
  } = useAIAssistantStore();

  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messageEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messageHistory]);

  const handleSendMessage = async () => {
    if (!message.trim() || isProcessing) return;

    setIsProcessing(true);
    addMessage('user', message, currentMode);
    setMessage('');

    try {
      const response = await aiAssistant.processMessage(
        message,
        currentMode,
        selectedModel
      );
      addMessage('assistant', response as string, currentMode);
    } catch (error) {
      addMessage(
        'assistant',
        'Sorry, I encountered an error processing your request.',
        currentMode
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-4 right-4 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden z-50"
    >
      {/* Panel header */}
      <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
        <h3 className="font-medium">AI Assistant</h3>
        <button onClick={() => setExpanded(!isExpanded)}>
          {isExpanded ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
        </button>
      </div>

      {/* Messages area */}
      <div className="h-96 overflow-y-auto p-4">
        {messageHistory.map((msg, index) => (
          <div
            key={index}
            className={`mb-4 ${
              msg.role === 'user' ? 'text-right' : 'text-left'
            }`}
          >
            <div
              className={`inline-block p-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={messageEndRef} />
      </div>

      {/* Suggestions */}
      <AIAssistantSuggestions onSelectSuggestion={setMessage} />

      {/* Input area */}
      <div className="p-4 border-t dark:border-gray-700">
        <div className="flex space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
          />
          <button
            onClick={handleSendMessage}
            disabled={isProcessing}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default AIAssistantPanel;