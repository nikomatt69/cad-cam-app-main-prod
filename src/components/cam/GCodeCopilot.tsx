// src/components/cam/GCodeCopilot.tsx
import React, { useState, useEffect } from 'react';
import { Code, CheckCircle, XCircle, HelpCircle, RefreshCw, AlertCircle } from 'react-feather';
import axios from 'axios';

interface GCodeCopilotProps {
  gcode: string;
  onSuggestionApply: (updatedCode: string) => void;
}

interface Suggestion {
  id: string;
  title: string;
  description: string;
  originalCode: string;
  suggestedCode: string;
  type: 'optimization' | 'error' | 'improvement';
}

const GCodeCopilot: React.FC<GCodeCopilotProps> = ({ gcode, onSuggestionApply }) => {
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastAnalyzedCode, setLastAnalyzedCode] = useState<string>('');

  // Claude API settings
  const CLAUDE_MODEL = 'claude-3-5-sonnet-20240229';
  const MAX_TOKENS = 2000;
  
  // Analyze G-code when it changes significantly
  useEffect(() => {
    if (!gcode || gcode.length < 10) return;
    
    // Only analyze if code has changed significantly
    const shouldAnalyze = !lastAnalyzedCode || 
      Math.abs(gcode.length - lastAnalyzedCode.length) > 50 ||
      !lastAnalyzedCode.includes(gcode.substring(0, 100));
    
    if (shouldAnalyze) {
      analyzeGCode();
    }
  }, [gcode]);

  // Function to analyze G-code using Claude AI
  const analyzeGCode = async () => {
    if (!gcode || gcode.length < 10) return;
    
    setIsAnalyzing(true);
    setError(null);
    setLastAnalyzedCode(gcode);
    
    try {
      // Call Claude API to analyze G-code
      const suggestions = await getAISuggestions(gcode);
      setSuggestions(suggestions);
    } catch (err) {
      console.error('Error analyzing G-code:', err);
      setError('Si è verificato un errore durante l\'analisi del G-code. Riprova più tardi.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Use Claude to generate G-code suggestions
  const getAISuggestions = async (code: string): Promise<Suggestion[]> => {
    try {
      // In a real implementation, call your Claude API endpoint
      // Example using a proxy API endpoint
      const response = await axios.post('/api/ai/analyze-gcode', {
        gcode: code,
        model: CLAUDE_MODEL,
        max_tokens: MAX_TOKENS
      });
      
      return response.data.suggestions;
      
      // Fallback mock implementation for demonstration
      /*
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockSuggestions: Suggestion[] = [];
      
      // G0 without Z height suggestion
      if (code.match(/G0\s+X[-\d.]+\s+Y[-\d.]+(?!\s+Z)/gm)) {
        mockSuggestions.push({
          id: 'safe-rapid-moves',
          title: 'Aggiungere altezza di sicurezza ai movimenti rapidi',
          description: 'I movimenti rapidi (G0) senza coordinata Z possono causare collisioni. Aggiungi sempre una coordinata Z di sicurezza.',
          originalCode: code.match(/G0\s+X[-\d.]+\s+Y[-\d.]+(?!\s+Z)/m)?.[0] || 'G0 X10 Y10',
          suggestedCode: (code.match(/G0\s+X[-\d.]+\s+Y[-\d.]+(?!\s+Z)/m)?.[0] || 'G0 X10 Y10') + ' Z5',
          type: 'error'
        });
      }
      
      // Missing spindle stop
      if (code.includes('M3') && !code.includes('M5')) {
        mockSuggestions.push({
          id: 'missing-spindle-stop',
          title: 'Manca arresto mandrino',
          description: 'Il programma avvia il mandrino (M3) ma non lo arresta (M5) alla fine.',
          originalCode: 'M3 S1000\n... operations ...\nM30',
          suggestedCode: 'M3 S1000\n... operations ...\nM5\nM30',
          type: 'error'
        });
      }
      
      // No coolant control
      if (!code.includes('M8') && !code.includes('M9')) {
        mockSuggestions.push({
          id: 'coolant-control',
          title: 'Aggiungere controllo refrigerante',
          description: 'Considera di aggiungere comandi per il controllo del refrigerante (M8/M9) per migliorare la qualità di taglio.',
          originalCode: 'G1 X100 Y100 F200',
          suggestedCode: 'M8 ; Coolant on\nG1 X100 Y100 F200\n... operations ...\nM9 ; Coolant off',
          type: 'improvement'
        });
      }
      
      // Consolidate repeated G0 moves
      if (code.match(/G0\s+X[-\d.]+\s+Y[-\d.]+\s*\n\s*G0\s+/gm)) {
        mockSuggestions.push({
          id: 'consolidate-rapids',
          title: 'Consolidare movimenti rapidi',
          description: 'Ci sono movimenti rapidi (G0) consecutivi che possono essere consolidati in un unico comando.',
          originalCode: 'G0 X10 Y10\nG0 Z5\nG0 X20 Y20',
          suggestedCode: 'G0 X10 Y10 Z5\nG0 X20 Y20',
          type: 'optimization'
        });
      }
      
      return mockSuggestions;
      */
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      throw error;
    }
  };

  // Build the prompt for Claude to analyze G-code
  const buildGCodeAnalysisPrompt = (gcode: string) => {
    return `You are a CNC programming expert analyzing G-code to provide optimization suggestions.

Analyze the following G-code program and identify 3-5 specific improvements:

\`\`\`
${gcode}
\`\`\`

For each suggestion, provide:
1. A clear title
2. A detailed description of the issue or improvement opportunity
3. A snippet of the original code to be modified
4. The improved code suggestion
5. The type of suggestion (optimization, error, or improvement)

Format your response as a JSON array of suggestion objects:
[
  {
    "id": "unique-identifier",
    "title": "Clear, concise suggestion title",
    "description": "Detailed explanation of the issue and benefit of the change",
    "originalCode": "The exact code snippet to be replaced",
    "suggestedCode": "The improved code",
    "type": "optimization | error | improvement"
  }
]

Focus on issues like:
- Missing safety features (tool retractions, spindle stops)
- Redundant or inefficient movements
- Opportunities to consolidate commands
- Missing or unclear comments
- Potential collision risks
- Feed rate or spindle speed optimizations

Only return the JSON array without any additional text or explanation.`;
  };

  // Apply the selected suggestion
  const applySuggestion = (suggestionId: string) => {
    const suggestion = suggestions.find(s => s.id === suggestionId);
    if (!suggestion) return;
    
    // Create updated code by replacing the original snippet with the suggested one
    const updatedCode = gcode.replace(suggestion.originalCode, suggestion.suggestedCode);
    onSuggestionApply(updatedCode);
    
    // Reset selection and refresh suggestions for the new code
    setSelectedSuggestion(null);
    setLastAnalyzedCode(updatedCode);
    
    // Refresh suggestions after a short delay
    setTimeout(() => {
      analyzeGCode();
    }, 500);
  };

  return (
    <div className="bg-white shadow-md rounded-md p-4 mt-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <Code className="text-blue-600 mr-2" size={20} />
          <h2 className="text-lg font-medium text-gray-900">G-Code Copilot</h2>
        </div>
        
        <button
          onClick={analyzeGCode}
          className="flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 focus:outline-none"
          disabled={isAnalyzing || !gcode || gcode.length < 10}
        >
          <RefreshCw size={14} className={`mr-1 ${isAnalyzing ? 'animate-spin' : ''}`} />
          {isAnalyzing ? 'Analisi in corso...' : 'Nuova analisi'}
        </button>
      </div>
      
      {isAnalyzing ? (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Analisi del G-code in corso...</p>
          <p className="text-sm text-gray-500 mt-2">Sto cercando possibili ottimizzazioni e miglioramenti</p>
        </div>
      ) : error ? (
        <div className="flex items-center p-4 bg-red-50 rounded-md">
          <AlertCircle className="text-red-500 mr-2" size={18} />
          <p className="text-red-600">{error}</p>
        </div>
      ) : suggestions.length > 0 ? (
        <div className="space-y-4">
          {suggestions.map((suggestion) => (
            <div 
              key={suggestion.id}
              className={`border rounded-md p-3 ${
                selectedSuggestion === suggestion.id 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
              } cursor-pointer transition-colors`}
              onClick={() => setSelectedSuggestion(
                selectedSuggestion === suggestion.id ? null : suggestion.id
              )}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-start">
                  <div className={`p-1 rounded-full mr-2 flex-shrink-0 ${
                    suggestion.type === 'optimization' 
                      ? 'bg-green-100 text-green-600' 
                      : suggestion.type === 'error' 
                        ? 'bg-red-100 text-red-600' 
                        : 'bg-blue-100 text-blue-600'
                  }`}>
                    {suggestion.type === 'optimization' && <CheckCircle size={16} />}
                    {suggestion.type === 'error' && <XCircle size={16} />}
                    {suggestion.type === 'improvement' && <HelpCircle size={16} />}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{suggestion.title}</h3>
                    <p className="text-xs text-gray-600 mt-1">{suggestion.description}</p>
                  </div>
                </div>
                
                {selectedSuggestion === suggestion.id && (
                  <button 
                    className="ml-2 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none"
                    onClick={(e) => {
                      e.stopPropagation();
                      applySuggestion(suggestion.id);
                    }}
                  >
                    Applica
                  </button>
                )}
              </div>
              
              {selectedSuggestion === suggestion.id && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="p-2 bg-gray-50 rounded border border-gray-200">
                    <p className="text-xs font-medium text-gray-700 mb-1">Codice originale:</p>
                    <pre className="text-xs font-mono text-gray-600 whitespace-pre-wrap overflow-auto max-h-40">
                      {suggestion.originalCode}
                    </pre>
                  </div>
                  <div className="p-2 bg-green-50 rounded border border-green-200">
                    <p className="text-xs font-medium text-gray-700 mb-1">Codice suggerito:</p>
                    <pre className="text-xs font-mono text-green-600 whitespace-pre-wrap overflow-auto max-h-40">
                      {suggestion.suggestedCode}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-6 bg-gray-50 rounded-md">
          <Code size={32} className="text-gray-400 mb-2" />
          <p className="text-gray-600">Nessun suggerimento disponibile</p>
          <p className="text-sm text-gray-500 mt-1">
            {gcode && gcode.length > 10 
              ? 'Il tuo G-code sembra già ottimizzato, o non ci sono abbastanza dati per generare suggerimenti.'
              : 'Aggiungi G-code per ricevere suggerimenti.'}
          </p>
        </div>
      )}
      
      <div className="mt-4 border-t pt-4">
        <p className="text-xs text-gray-500">
          <strong>Nota:</strong> I suggerimenti sono generati automaticamente con Claude AI e potrebbero non essere sempre appropriati. 
          Valuta sempre attentamente prima di applicare le modifiche al tuo G-code.
        </p>
      </div>
    </div>
  );
};

export default GCodeCopilot;