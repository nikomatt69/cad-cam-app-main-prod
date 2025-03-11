import { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from 'src/components/layout/Layout';
import { motion } from 'framer-motion';
import { Play, Pause, ChevronLeft, ChevronRight, Plus, Minus, Upload, Save, AlertTriangle } from 'react-feather';
import MetaTags from '../components/layout/Metatags';

export default function FanucViewer() {
  const [code, setCode] = useState<string>('');
  const [lines, setLines] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playSpeed, setPlaySpeed] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<{ line: number; color: string } | null>(null);

  useEffect(() => {
    if (code) {
      const splitLines = code.split('\n').filter(line => line.trim());
      setLines(splitLines);
      setCurrentLine(0);
    } else {
      setLines([]);
    }
  }, [code]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isPlaying && lines.length > 0) {
      timer = setTimeout(() => {
        if (currentLine < lines.length - 1) {
          setCurrentLine(prev => prev + 1);
          
          // Parse line for specific commands that might need visualization
          parseCurrentLine(lines[currentLine]);
        } else {
          setIsPlaying(false);
        }
      }, 1000 / playSpeed);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isPlaying, currentLine, lines, playSpeed]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        setCode(content);
        setError(null);
      } catch (err) {
        setError('Failed to read the file. Please try a different file.');
      }
    };
    reader.onerror = () => {
      setError('Error reading file');
    };
    reader.readAsText(file);
  };

  const parseCurrentLine = (line: string) => {
    // Reset highlight
    setHighlight(null);
    
    // Check if the line has a G or M code
    if (line.includes('G') || line.includes('M')) {
      // Highlight G-code commands
      if (line.includes('G0') || line.includes('G00')) {
        setHighlight({ line: currentLine, color: 'bg-blue-100' }); // Rapid movement
      } else if (line.includes('G1') || line.includes('G01')) {
        setHighlight({ line: currentLine, color: 'bg-green-100' }); // Linear movement
      } else if (line.match(/G2|G02|G3|G03/)) {
        setHighlight({ line: currentLine, color: 'bg-purple-100' }); // Circular movement
      } else if (line.includes('M') && !line.match(/^\s*;/)) {
        setHighlight({ line: currentLine, color: 'bg-yellow-100' }); // Machine functions
      }
    }
  };

  const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCode(e.target.value);
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const nextLine = () => {
    if (currentLine < lines.length - 1) {
      setCurrentLine(currentLine + 1);
      parseCurrentLine(lines[currentLine + 1]);
    }
  };

  const prevLine = () => {
    if (currentLine > 0) {
      setCurrentLine(currentLine - 1);
      parseCurrentLine(lines[currentLine - 1]);
    }
  };

  const increaseSpeed = () => {
    if (playSpeed < 10) {
      setPlaySpeed(prev => prev + 0.5);
    }
  };

  const decreaseSpeed = () => {
    if (playSpeed > 0.5) {
      setPlaySpeed(prev => prev - 0.5);
    }
  };

  const downloadGCode = () => {
    if (!code) return;
    
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gcode-' + new Date().toISOString().slice(0, 10) + '.nc';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
       <MetaTags 
        title="GCODEVIEWER FUN" 
     
      />
      
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">G-Code Viewer</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Area */}
          <div className="lg:col-span-1">
            <div className="bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white shadow-md rounded-md p-4">
              <h2 className="text-lg font-medium text-gray-900 mb-3">G-Code Input</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paste G-Code or Upload File
                </label>
                <textarea
                  className="w-full h-64 p-3 border border-gray-300 rounded-md font-mono text-sm focus:ring-blue-500 focus:border-blue-500"
                  value={code}
                  onChange={handleTextAreaChange}
                  placeholder="Paste your G-Code or Fanuc code here..."
                ></textarea>
              </div>
              
              <div className="flex justify-between">
                <label className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer">
                  <Upload size={16} className="mr-2" />
                  <span>Upload</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".nc,.gcode,.cnc,.txt"
                    onChange={handleFileUpload}
                  />
                </label>
                
                <button
                  onClick={downloadGCode}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
                  disabled={!code}
                >
                  <Save size={16} className="mr-2" />
                  Save
                </button>
              </div>
              
              {error && (
                <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md flex items-center">
                  <AlertTriangle size={16} className="mr-2" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Visualization Area */}
          <div className="lg:col-span-2">
            <div className="bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white shadow-md rounded-md p-4">
              <h2 className="text-lg font-medium text-gray-900 mb-3">Code Execution</h2>
              
              {lines.length > 0 ? (
                <>
                  <div className="mb-4 h-64 overflow-y-auto border border-gray-200 rounded-md font-mono">
                    <table className="min-w-full divide-y divide-gray-200">
                      <tbody className="bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white divide-y divide-gray-200">
                        {lines.map((line, idx) => (
                          <tr 
                            key={idx} 
                            className={`${idx === currentLine ? 'bg-yellow-100' : ''} ${
                              highlight?.line === idx ? highlight.color : ''
                            }`}
                          >
                            <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-500">
                              {idx + 1}
                            </td>
                            <td className="px-4 py-1 whitespace-nowrap text-sm">
                              {line}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={togglePlay}
                        className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 focus:outline-none"
                      >
                        {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                      </button>
                      
                      <button
                        onClick={prevLine}
                        className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 focus:outline-none"
                        disabled={currentLine === 0}
                      >
                        <ChevronLeft size={18} />
                      </button>
                      
                      <button
                        onClick={nextLine}
                        className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 focus:outline-none"
                        disabled={currentLine === lines.length - 1}
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                    
                    <div className="flex items-center">
                      <span className="text-sm text-gray-700 mr-2">Speed: {playSpeed}x</span>
                      <button
                        onClick={decreaseSpeed}
                        className="p-1 rounded-full bg-gray-200 hover:bg-gray-300 focus:outline-none"
                        disabled={playSpeed <= 0.5}
                      >
                        <Minus size={14} />
                      </button>
                      
                      <button
                        onClick={increaseSpeed}
                        className="p-1 rounded-full bg-gray-200 hover:bg-gray-300 focus:outline-none ml-1"
                        disabled={playSpeed >= 10}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-700">
                      Line {currentLine + 1} of {lines.length}: <span className="font-mono">{lines[currentLine]}</span>
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 border border-gray-200 rounded-md">
                  <p className="text-gray-500 mb-4">No G-Code loaded</p>
                  <p className="text-sm text-gray-400">Paste code in the input area or upload a file</p>
                </div>
              )}
            </div>
            
            <div className="bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white shadow-md rounded-md p-4 mt-6">
              <h2 className="text-lg font-medium text-gray-900 mb-3">Code Analysis</h2>
              
              {lines.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-md">
                    <p className="text-sm font-medium text-gray-700">Total Lines</p>
                    <p className="text-2xl font-bold text-blue-600">{lines.length}</p>
                  </div>
                  
                  <div className="p-3 bg-gray-50 rounded-md">
                    <p className="text-sm font-medium text-gray-700">Estimated Time</p>
                    <p className="text-2xl font-bold text-green-600">
                      {(lines.length / playSpeed / 60).toFixed(2)} min
                    </p>
                  </div>
                  
                  <div className="p-3 bg-gray-50 rounded-md">
                    <p className="text-sm font-medium text-gray-700">G0/G00 Commands</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {lines.filter(line => line.includes('G0') || line.includes('G00')).length}
                    </p>
                  </div>
                  
                  <div className="p-3 bg-gray-50 rounded-md">
                    <p className="text-sm font-medium text-gray-700">G1/G01 Commands</p>
                    <p className="text-2xl font-bold text-green-600">
                      {lines.filter(line => line.includes('G1') || line.includes('G01')).length}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Load G-Code to view analysis</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}