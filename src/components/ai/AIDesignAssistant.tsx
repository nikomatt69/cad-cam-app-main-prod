import React, { useState } from 'react';

import { useElementsStore } from '../../store/elementsStore';
import { AIDesignSuggestion } from '../../types/ai';
import { aiDesignAnalyzer } from '@/src/lib/aiDesignAnalizer';

const AIDesignAssistant: React.FC = () => {
  const [suggestions, setSuggestions] = useState<AIDesignSuggestion[]>([]);
  const { elements, addAISuggestion } = useElementsStore();

  const performAIAnalysis = async () => {
    try {
      const aiSuggestions = await aiDesignAnalyzer.analyzeDesign(elements);
      setSuggestions(aiSuggestions);
      
      // Aggiungi suggerimenti agli elementi
      aiSuggestions.forEach(suggestion => {
        elements.forEach(element => {
          addAISuggestion(element.id, suggestion);
        });
      });
    } catch (error) {
      console.error('AI Analysis Error', error);
    }
  };

  const applyAISuggestion = (suggestion: AIDesignSuggestion) => {
    // Logica per applicare suggerimenti
  };

  return (
    <div className="ai-design-assistant">
      <button 
        onClick={performAIAnalysis}
        className="btn btn-primary"
      >
        Analisi AI del Design
      </button>

      {suggestions.map((suggestion, index) => (
        <div key={index} className="ai-suggestion">
          <h3>{suggestion.type}</h3>
          <p>{suggestion.description}</p>
          <div className="suggestion-impact">
            <span>Guadagno Prestazioni: {suggestion.potentialImpact.performanceGain}%</span>
            <span>Riduzione Costi: {suggestion.potentialImpact.costReduction}%</span>
          </div>
          <button 
            onClick={() => applyAISuggestion(suggestion)}
            className="btn btn-secondary"
          >
            Applica Suggerimento
          </button>
        </div>
      ))}
    </div>
  );
};

export default AIDesignAssistant;