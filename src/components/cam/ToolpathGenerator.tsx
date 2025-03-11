// src/components/cam/ToolpathGenerator.tsx
import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Check, ChevronDown, ChevronUp, Code, Cpu, Edit, Download, Play, Minimize2, Maximize2, Upload, HelpCircle, Save } from 'react-feather';
import { useCADStore } from 'src/store/cadStore';
import { useElementsStore } from 'src/store/elementsStore';
import { predefinedTools, predefinedMaterials } from 'src/lib/predefinedLibraries';

interface ToolpathGeneratorProps {
  onGCodeGenerated: (gcode: string) => void;
  onToolSelected?: (tool: any) => void; // Added for tool selection
}

// Machine type definition
type MachineType = 'mill' | 'lathe' | '3dprinter';

// Mill operation types
type MillOperationType = 'contour' | 'pocket' | 'drill' | 'engrave' | 'profile' | 'threading' | '3d_surface';

// Lathe operation types
type LatheOperationType = 'facing' | 'turning' | 'boring' | 'threading' | 'grooving' | 'parting' | 'knurling';

// 3D Printer operation types
type PrinterOperationType = 'standard' | 'vase' | 'support' | 'infill' | 'raft' | 'brim';

// Combined operation type
type OperationType = MillOperationType | LatheOperationType | PrinterOperationType;

type MaterialType = 'aluminum' | 'steel' | 'wood' | 'plastic' | 'brass' | 'titanium' | 'composite' | 'other';
type ToolType = 'endmill' | 'ballnose' | 'drill' | 'vbit' | 'chamfer' | 'threadmill' | 'reamer';

// Lathe tool types
type LatheToolType = 'turning' | 'facing' | 'threading' | 'grooving' | 'boring' | 'parting';

// 3D Printer nozzle types
type PrinterNozzleType = 'brass' | 'hardened' | 'ruby' | 'standard';

// Combined tool type
type AllToolType = ToolType | LatheToolType | PrinterNozzleType;

interface ToolpathSettings {
  machineType: MachineType;
  operationType: OperationType;
  material: MaterialType;
  toolType: AllToolType;
  toolDiameter: number;
  flutes: number;
  depth: number;
  stepdown: number;
  stepover: number;
  feedrate: number;
  plungerate: number;
  rpm: number;
  tolerance: number;
  offset: 'inside' | 'outside' | 'center';
  direction: 'climb' | 'conventional';
  coolant: boolean;
  finishingPass: boolean;
  finishingAllowance: number;
  useAI: boolean;
  aiDifficulty: 'simple' | 'moderate' | 'complex';
  aiOptimize: 'speed' | 'quality' | 'balance';
  // 3D printer specific settings
  nozzleDiameter?: number;
  filamentDiameter?: number;
  layerHeight?: number;
  extrusionWidth?: number;
  printSpeed?: number;
  printTemperature?: number;
  bedTemperature?: number;
  // Lathe specific settings
  stockDiameter?: number;
  stockLength?: number;
  spindleDirection?: 'cw' | 'ccw';
  turningOperation?: 'external' | 'internal' | 'face';
  applyToolCompensation?: boolean;
  originType: 'workpiece-center' | 'workpiece-corner' | 'workpiece-corner2' |'machine-zero' | 'custom';
  originX: number;
  originY: number;
  originZ: number;
  
}

const ToolpathGenerator: React.FC<ToolpathGeneratorProps> = ({ onGCodeGenerated, onToolSelected }) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    machine: true,
    operation: true,
    material: true,
    tool: false,
    cutting: false,
    advanced: false,
    ai: false,
    printer: false,
    lathe: false,
    origin: true  // Add this li
  });
  
  const [settings, setSettings] = useState<ToolpathSettings>({
    machineType: 'mill',
    operationType: 'contour',
    material: 'aluminum',
    toolType: 'endmill',
    toolDiameter: 6,
    flutes: 2,
    depth: 5,
    stepdown: 1,
    stepover: 40, // Percentuale
    feedrate: 800,
    plungerate: 300,
    rpm: 10000,
    tolerance: 0.01,
    offset: 'outside',
    direction: 'climb',
    coolant: true,
    finishingPass: false,
    finishingAllowance: 0.2,
    useAI: false,
    aiDifficulty: 'moderate',
    aiOptimize: 'balance',
    // 3D printer default settings
    nozzleDiameter: 0.4,
    filamentDiameter: 1.75,
    layerHeight: 0.2,
    extrusionWidth: 0.4,
    printSpeed: 60,
    printTemperature: 200,
    bedTemperature: 60,
    // Lathe default settings
    stockDiameter: 50,
    stockLength: 100,
    spindleDirection: 'cw',
    turningOperation: 'external',
    applyToolCompensation: true,
    originType: 'workpiece-center',
    originX: 0,
    originY: 0, 
    originZ: 0
  });
  
  const [selectedLibraryTool, setSelectedLibraryTool] = useState<any>(null);
  const [geometryType, setGeometryType] = useState<'rectangle' | 'circle' | 'polygon' | 'custom' | 'selected'>('rectangle');
  const [rectangleWidth, setRectangleWidth] = useState(100);
  const [rectangleHeight, setRectangleHeight] = useState(50);
  const [circleRadius, setCircleRadius] = useState(25);
  const [polygonSides, setPolygonSides] = useState(6);
  const [polygonRadius, setPolygonRadius] = useState(30);
  const [customPath, setCustomPath] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  
  // References to selected CAD elements
  const { elements, selectedElement } = useElementsStore();
  const { workpiece } = useCADStore();
  
  // Timer reference for success messages
  const successTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Update settings when selected library tool changes
  useEffect(() => {
    if (selectedLibraryTool) {
      setSettings(prev => ({
        ...prev,
        toolType: selectedLibraryTool.type as AllToolType || 'endmill',
        toolDiameter: selectedLibraryTool.diameter || 6,
        flutes: selectedLibraryTool.numberOfFlutes || 2,
        rpm: selectedLibraryTool.maxRPM || 12000
      }));
      
      // Notify parent component about tool selection
      if (onToolSelected) {
        onToolSelected(selectedLibraryTool);
      }
      
      setSuccess(`Tool "${selectedLibraryTool.name}" loaded from library`);
      successTimerRef.current = setTimeout(() => {
        setSuccess(null);
      }, 3000);
    }
  }, [selectedLibraryTool, onToolSelected]);
  
  // Load default settings based on selected material
  useEffect(() => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
    }
    
    // Set defaults based on material
    switch (settings.material) {
      case 'aluminum':
        setSettings(prev => ({
          ...prev,
          feedrate: 800,
          plungerate: 300,
          rpm: 12000
        }));
        break;
      case 'steel':
        setSettings(prev => ({
          ...prev,
          feedrate: 400,
          plungerate: 150,
          rpm: 8000
        }));
        break;
      case 'wood':
        setSettings(prev => ({
          ...prev,
          feedrate: 1200,
          plungerate: 500,
          rpm: 15000
        }));
        break;
      case 'plastic':
        setSettings(prev => ({
          ...prev,
          feedrate: 600,
          plungerate: 200,
          rpm: 10000
        }));
        break;
      case 'brass':
        setSettings(prev => ({
          ...prev,
          feedrate: 600,
          plungerate: 200,
          rpm: 10000
        }));
        break;
      case 'titanium':
        setSettings(prev => ({
          ...prev,
          feedrate: 200,
          plungerate: 100,
          rpm: 6000
        }));
        break;
      default:
        break;
    }
  }, [settings.material]);
  
  // Set default operation types when machine type changes
  useEffect(() => {
    switch (settings.machineType) {
      case 'mill':
        if (!['contour', 'pocket', 'drill', 'engrave', 'profile', 'threading', '3d_surface'].includes(settings.operationType as string)) {
          setSettings(prev => ({
            ...prev,
            operationType: 'contour',
            toolType: 'endmill'
          }));
        }
        break;
      case 'lathe':
        if (!['facing', 'turning', 'boring', 'threading', 'grooving', 'parting', 'knurling'].includes(settings.operationType as string)) {
          setSettings(prev => ({
            ...prev,
            operationType: 'turning',
            toolType: 'turning'
          }));
        }
        break;
      case '3dprinter':
        if (!['standard', 'vase', 'support', 'infill', 'raft', 'brim'].includes(settings.operationType as string)) {
          setSettings(prev => ({
            ...prev,
            operationType: 'standard',
            toolType: 'standard'
          }));
        }
        break;
    }
  }, [settings.machineType]);
  
  // Update AI suggestions when relevant settings change
  useEffect(() => {
    if (settings.useAI) {
      generateAISuggestions();
    }
  }, [settings.useAI, settings.material, settings.toolDiameter, settings.operationType, settings.machineType]);
  
  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpanded(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // Update settings
  const updateSettings = (key: keyof ToolpathSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // Helper to update numeric values
  const updateNumericValue = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<number>>
  ) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      setter(value);
    }
  };
  
  // Generate AI suggestions
  const generateAISuggestions = async () => {
    setIsAIProcessing(true);
    
    try {
      // Simulate API call to Claude
      setTimeout(() => {
        let suggestions: string[] = [];
        
        switch (settings.machineType) {
          case 'mill':
            suggestions = [
              `Per ${settings.material} con fresa da ${settings.toolDiameter}mm, consigliata una velocità di avanzamento di ${settings.material === 'aluminum' ? 800 : settings.material === 'steel' ? 400 : 600} mm/min.`,
              `Con profondità di ${settings.depth}mm, suggeriamo incrementi di ${Math.min(settings.toolDiameter / 4, 1).toFixed(1)}mm per migliori risultati.`,
              `Per ottimizzare durata utensile su ${settings.material}, considera ${settings.material === 'steel' || settings.material === 'titanium' ? 'refrigerante ad alta pressione' : 'refrigerante standard'}.`
            ];
            break;
          case 'lathe':
            suggestions = [
              `Per tornitura di ${settings.material}, la velocità di avanzamento consigliata è ${settings.material === 'aluminum' ? 0.2 : settings.material === 'steel' ? 0.15 : 0.25} mm/giro.`,
              `Profondità di passata consigliata: ${settings.material === 'aluminum' ? 1.5 : settings.material === 'steel' ? 0.8 : 1.0}mm per sgrossatura.`,
              `Velocità di taglio ottimale: ${settings.material === 'aluminum' ? 300 : settings.material === 'steel' ? 150 : 200} m/min.`
            ];
            break;
          case '3dprinter':
            suggestions = [
              `La temperatura consigliata per ${settings.material === 'plastic' ? 'PLA' : settings.material} è ${settings.material === 'plastic' ? '200-220°C' : '240-260°C'}.`,
              `Per un'altezza del layer di ${settings.layerHeight}mm, una velocità di stampa di ${settings.printSpeed}mm/s è ottimale.`,
              `Temperatura del piatto consigliata: ${settings.material === 'plastic' ? '60°C per PLA, 80°C per PETG' : '100-110°C per ABS/ASA'}.`
            ];
            break;
        }
        
        setAiSuggestions(suggestions);
        setIsAIProcessing(false);
      }, 1500);
    } catch (err) {
      console.error('Errore nella generazione dei suggerimenti AI:', err);
      setIsAIProcessing(false);
    }
  };
  
  // Generate G-code based on current settings
  const generateGCode = () => {
    setIsGenerating(true);
    setError(null);
    setSuccess(null);
    
    try {
      let gcode = '';
      
      // Select the appropriate G-code generator based on machine type
      switch (settings.machineType) {
        case 'mill':
          gcode = generateMillGCode();
          break;
        case 'lathe':
          gcode = generateLatheGCode();
          break;
        case '3dprinter':
          gcode = generate3DPrinterGCode();
          break;
      }
      
      // Show success message
      setSuccess('G-code generato con successo!');
      
      // Reset success message after a timeout
      successTimerRef.current = setTimeout(() => {
        setSuccess(null);
      }, 5000);
      
      // Pass generated G-code back to parent
      onGCodeGenerated(gcode);
    } catch (err) {
      setError('Errore nella generazione del G-code. Controlla le impostazioni.');
      console.error('G-code generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const applyOriginOffset = (x: number, y: number, z: number = 0): { x: number, y: number, z: number } => {
    switch (settings.originType) {
      case 'workpiece-center':
        // Already centered, no change needed
        return { x, y, z };
        
      case 'workpiece-corner':
        // Convert from center-origin to corner-origin
        if (geometryType === 'rectangle') {
          return { 
            x: x + rectangleWidth / 2, 
            y: y + rectangleHeight / 2, 
            z
          };
        } else if (geometryType === 'circle') {
          return { 
            x: x + circleRadius, 
            y: y + circleRadius, 
            z 
          };
        } else if (geometryType === 'polygon') {
          return { 
            x: x + polygonRadius, 
            y: y + polygonRadius, 
            z 
          };

        }
        case 'workpiece-corner2':
        // Convert from center-origin to corner-origin
        if (geometryType === 'rectangle') {
          return { 
            x: x + rectangleWidth / 2, 
            y: y + rectangleHeight / 2, 
            z : z =  workpiece.depth / 2 
          };
        } else if (geometryType === 'circle') {
          return { 
            x: x + circleRadius, 
            y: y + circleRadius, 
            z 
          };
        } else if (geometryType === 'polygon') {
          return { 
            x: x + polygonRadius, 
            y: y + polygonRadius, 
            z 
          } } else if (geometryType === 'selected' && selectedElement) {
          // Handle based on element type
          if (selectedElement.type === 'rectangle') {
            return { 
              x: x + selectedElement.width / 2, 
              y: y + selectedElement.height / 2, 
              z 
            };
          } else if (selectedElement.type === 'circle') {
            return { 
              x: x + selectedElement.radius, 
              y: y + selectedElement.radius, 
              z 
            };
          }
        }
        return { x, y, z };
        
      case 'machine-zero':
        // Add workpiece position relative to machine zero
        // This would typically come from a machine setup
        return { 
          x: x + (workpiece?.width || 0), 
          y: y + (workpiece?.depth || 0), 
          z: z + (workpiece?.height || 0) 
        };
        
      case 'custom':
        // Apply custom offset
        return { 
          x: x + settings.originX, 
          y: y + settings.originY, 
          z: z + settings.originZ 
        };
        
      default:
        return { x, y, z };
    }
  };
  
  // Generate G-code for milling operations
  const generateMillGCode = () => {
    let gcode = '';
    
    // Program header
    gcode += '; CAD/CAM SYSTEM - Generated Mill G-code with AI assistance\n';
    gcode += `; Operation: ${settings.operationType}\n`;
    gcode += `; Material: ${settings.material}\n`;
    gcode += `; Tool: ${settings.toolType} Ø${settings.toolDiameter}mm\n`;
    gcode += `; Date: ${new Date().toISOString()}\n\n`;
    
    // Program initialization
    gcode += 'G90 ; Absolute positioning\n';
    gcode += 'G21 ; Metric units\n';
    gcode += 'G17 ; XY plane selection\n';
    gcode += `M3 S${settings.rpm} ; Start spindle\n`;
    
    if (settings.coolant) {
      gcode += 'M8 ; Coolant on\n';
    }
    
    gcode += 'G0 Z10 ; Move to safe height\n\n';
    
    // Generate toolpath based on geometry type and operation
    if (geometryType === 'rectangle') {
      gcode += generateRectangleToolpath();
    } else if (geometryType === 'circle') {
      gcode += generateCircleToolpath();
    } else if (geometryType === 'polygon') {
      gcode += generatePolygonToolpath();
    } else if (geometryType === 'custom' && customPath) {
      gcode += `; Custom path\n${customPath}\n`;
    } else if (geometryType === 'selected') {
      gcode += generateFromSelectedElements();
    }
    
    // Finishing pass if enabled
    if (settings.finishingPass) {
      gcode += '\n; Finishing pass\n';
      gcode += `; Finishing allowance: ${settings.finishingAllowance}mm\n`;
      // Simulate finishing pass code
      gcode += 'G0 Z5 ; Move to safe height for finishing pass\n';
      if (geometryType === 'rectangle') {
        const { toolDiameter, offset } = settings;
        let offsetDistance = 0;
        if (offset === 'inside') {
          offsetDistance = -toolDiameter / 2;
        } else if (offset === 'outside') {
          offsetDistance = toolDiameter / 2;
        }
        
        const width = rectangleWidth + offsetDistance * 2 * (offset === 'outside' ? 1 : -1);
        const height = rectangleHeight + offsetDistance * 2 * (offset === 'outside' ? 1 : -1);
        
        const startX = -width / 2;
        const startY = -height / 2;
        
        gcode += `G0 X${startX.toFixed(3)} Y${startY.toFixed(3)} ; Move to start position for finishing\n`;
        gcode += `G1 Z${(-settings.depth).toFixed(3)} F${settings.plungerate} ; Plunge to final depth\n`;
        
        const corners = [
          [startX, startY],
          [startX + width, startY],
          [startX + width, startY + height],
          [startX, startY + height],
          [startX, startY]
        ];
        
        if (settings.direction === 'conventional') {
          corners.reverse();
        }
        
        for (let i = 0; i < corners.length; i++) {
          gcode += `G1 X${corners[i][0].toFixed(3)} Y${corners[i][1].toFixed(3)} F${settings.feedrate * 0.8} ; Finishing corner ${i+1}\n`;
        }
      }
    }
    
    // Program ending
    gcode += '\n; End of program\n';
    gcode += 'G0 Z30 ; Move to safe height\n';
    
    if (settings.coolant) {
      gcode += 'M9 ; Coolant off\n';
    }
    
    gcode += 'M5 ; Stop spindle\n';
    gcode += 'M30 ; Program end\n';
    
    return gcode;
  };
  
  // Generate G-code for lathe operations
  const generateLatheGCode = () => {
    let gcode = '';
    
    // Program header
    gcode += '; CAD/CAM SYSTEM - Generated Lathe G-code with AI assistance\n';
    gcode += `; Operation: ${settings.operationType}\n`;
    gcode += `; Material: ${settings.material}\n`;
    gcode += `; Tool: ${settings.toolType}\n`;
    gcode += `; Stock: Ø${settings.stockDiameter}mm x ${settings.stockLength}mm\n`;
    gcode += `; Date: ${new Date().toISOString()}\n\n`;
    
    // Program initialization
    gcode += 'G90 ; Absolute positioning\n';
    gcode += 'G21 ; Metric units\n';
    gcode += 'G18 ; XZ plane selection (standard for lathes)\n';
    gcode += `M3 S${settings.rpm} ; Start spindle ${settings.spindleDirection === 'cw' ? 'clockwise' : 'counter-clockwise'}\n`;
    
    if (settings.coolant) {
      gcode += 'M8 ; Coolant on\n';
    }
    
    // G-code generation based on lathe operation type
    switch (settings.operationType as LatheOperationType) {
      case 'facing':
        gcode += generateLatheFacingOperation();
        break;
      case 'turning':
        gcode += generateLatheTurningOperation();
        break;
      case 'boring':
        gcode += generateLatheBoringOperation();
        break;
      case 'threading':
        gcode += generateLatheThreadingOperation();
        break;
      case 'grooving':
        gcode += generateLatheGroovingOperation();
        break;
      case 'parting':
        gcode += generateLathePartingOperation();
        break;
      case 'knurling':
        gcode += generateLatheKnurlingOperation();
        break;
    }
    
    // Program ending
    gcode += '\n; End of program\n';
    gcode += 'G0 X50 Z50 ; Retract to safe position\n';
    
    if (settings.coolant) {
      gcode += 'M9 ; Coolant off\n';
    }
    
    gcode += 'M5 ; Stop spindle\n';
    gcode += 'M30 ; Program end\n';
    
    return gcode;
  };
  
  // Generate facing operation for lathe
  const generateLatheFacingOperation = () => {
    const { stockDiameter, stockLength, depth, stepdown, feedrate } = settings;
    let gcode = '\n; Facing operation\n';
    
    // Tool setup
    gcode += 'G0 X' + (stockDiameter! + 2).toFixed(3) + ' Z2 ; Position tool\n';
    
    // Multiple passes for facing
    for (let z = 0; z > -depth; z -= stepdown) {
      const currentZ = Math.max(-depth, z);
      gcode += `G0 X${(stockDiameter! + 2).toFixed(3)} Z${currentZ.toFixed(3)} ; Rapid to start position\n`;
      gcode += `G1 X-1 F${feedrate} ; Face cut\n`;
      gcode += `G0 X${(stockDiameter! + 2).toFixed(3)} ; Retract\n`;
    }
    
    return gcode;
  };
  
  // Generate turning operation for lathe
  const generateLatheTurningOperation = () => {
    const { stockDiameter, stockLength, depth, stepdown, feedrate, turningOperation } = settings;
    let gcode = '\n; Turning operation\n';
    
    if (turningOperation === 'external') {
      // External turning
      gcode += 'G0 X' + (stockDiameter! + 2).toFixed(3) + ' Z2 ; Position tool\n';
      gcode += 'G0 Z0 ; Move to face\n';
      
      // Multiple passes for turning
      for (let d = 0; d < depth; d += stepdown) {
        const currentDepth = Math.min(depth, d + stepdown);
        const currentDiameter = stockDiameter! - (currentDepth * 2); // Diameter decreases with each pass
        
        gcode += `G0 X${(currentDiameter + 1).toFixed(3)} ; Rapid to diameter\n`;
        gcode += `G1 X${currentDiameter.toFixed(3)} F${feedrate/2} ; Plunge to depth\n`;
        gcode += `G1 Z${stockLength!.toFixed(3)} F${feedrate} ; Turn along Z\n`;
        gcode += `G0 X${(stockDiameter! + 2).toFixed(3)} ; Retract\n`;
        gcode += `G0 Z0 ; Return to face\n`;
      }
    } else if (turningOperation === 'internal') {
      // Internal turning (boring)
      const holeDiameter = stockDiameter! / 2; // Assuming a pre-drilled hole
      
      gcode += 'G0 X' + (holeDiameter - 1).toFixed(3) + ' Z2 ; Position tool\n';
      gcode += 'G0 Z0 ; Move to face\n';
      
      // Multiple passes for internal turning
      for (let d = 0; d < depth; d += stepdown) {
        const currentDepth = Math.min(depth, d + stepdown);
        const currentDiameter = holeDiameter + (currentDepth * 2); // Diameter increases with each pass
        
        gcode += `G0 X${(currentDiameter - 1).toFixed(3)} ; Rapid to diameter\n`;
        gcode += `G1 X${currentDiameter.toFixed(3)} F${feedrate/2} ; Plunge to depth\n`;
        gcode += `G1 Z${(stockLength! * 0.7).toFixed(3)} F${feedrate} ; Turn along Z\n`;
        gcode += `G0 X${(holeDiameter - 1).toFixed(3)} ; Retract\n`;
        gcode += `G0 Z0 ; Return to face\n`;
      }
    }
    
    return gcode;
  };
  
  // Generate boring operation for lathe
  const generateLatheBoringOperation = () => {
    const { stockDiameter, stockLength, depth, stepdown, feedrate } = settings;
    let gcode = '\n; Boring operation\n';
    
    // Assume a starting hole with half the stock diameter
    const startingHoleDiameter = stockDiameter! * 0.3;
    const finalHoleDiameter = startingHoleDiameter + (depth * 2);
    
    // Position tool for boring
    gcode += `G0 X${(startingHoleDiameter - 1).toFixed(3)} Z2 ; Position tool\n`;
    gcode += 'G0 Z0 ; Move to hole entrance\n';
    
    // Multiple passes for boring
    for (let d = 0; d < depth; d += stepdown) {
      const currentDepth = Math.min(depth, d + stepdown);
      const currentDiameter = startingHoleDiameter + (currentDepth * 2);
      
      gcode += `G1 X${currentDiameter.toFixed(3)} F${feedrate/2} ; Bore to diameter\n`;
      gcode += `G1 Z-${(stockLength! * 0.5).toFixed(3)} F${feedrate} ; Bore along Z\n`;
      gcode += `G0 X${(startingHoleDiameter - 1).toFixed(3)} ; Retract\n`;
      gcode += `G0 Z0 ; Return to hole entrance\n`;
    }
    
    return gcode;
  };
  
  // Generate threading operation for lathe
  const generateLatheThreadingOperation = () => {
    const { stockDiameter, stockLength, depth, feedrate } = settings;
    let gcode = '\n; Threading operation\n';
    
    // Thread parameters
    const threadPitch = 1.5; // mm per revolution
    const threadLength = stockLength! * 0.7;
    const threadStartZ = 2;
    const threadEndZ = threadStartZ + threadLength;
    const threadDiameter = stockDiameter! - (depth * 2);
    
    // Position tool for threading
    gcode += `G0 X${(stockDiameter! + 5).toFixed(3)} Z${threadStartZ.toFixed(3)} ; Position tool\n`;
    
    // Progressive threading passes
    for (let d = 0.1; d <= depth; d += 0.1) {
      const currentDiameter = stockDiameter! - (d * 2);
      gcode += `G0 X${currentDiameter.toFixed(3)} ; Rapid to thread diameter\n`;
      gcode += `G32 Z${threadEndZ.toFixed(3)} F${threadPitch} ; Thread cutting move\n`;
      gcode += `G0 X${(stockDiameter! + 2).toFixed(3)} ; Retract\n`;
      gcode += `G0 Z${threadStartZ.toFixed(3)} ; Return to start\n`;
    }
    
    return gcode;
  };
  
  // Generate grooving operation for lathe
  const generateLatheGroovingOperation = () => {
    const { stockDiameter, depth, feedrate } = settings;
    let gcode = '\n; Grooving operation\n';
    
    // Groove parameters
    const grooveWidth = 3; // mm
    const grooveDepth = depth;
    const groovePositionZ = 20; // mm from the face
    
    // Position tool for grooving
    gcode += `G0 X${(stockDiameter! + 2).toFixed(3)} Z${groovePositionZ.toFixed(3)} ; Position tool\n`;
    
    // Multiple passes for grooving
    for (let d = 0; d < grooveDepth; d += 0.5) {
      const currentDepth = Math.min(grooveDepth, d + 0.5);
      const currentDiameter = stockDiameter! - (currentDepth * 2);
      
      gcode += `G1 X${currentDiameter.toFixed(3)} F${feedrate/2} ; Plunge to depth\n`;
      gcode += `G0 X${(stockDiameter! + 2).toFixed(3)} ; Retract\n`;
    }
    
    // Finishing passes for sides of groove
    gcode += `G0 Z${(groovePositionZ - grooveWidth/2).toFixed(3)} ; Position to groove start\n`;
    gcode += `G1 X${(stockDiameter! - (grooveDepth * 2)).toFixed(3)} F${feedrate/2} ; Plunge to depth\n`;
    gcode += `G1 Z${(groovePositionZ + grooveWidth/2).toFixed(3)} F${feedrate} ; Cut to groove end\n`;
    gcode += `G0 X${(stockDiameter! + 2).toFixed(3)} ; Retract\n`;
    
    return gcode;
  };
  
  // Generate parting operation for lathe
  const generateLathePartingOperation = () => {
    const { stockDiameter, feedrate } = settings;
    let gcode = '\n; Parting operation\n';
    
    // Parting parameters
    const partPositionZ = 30; // mm from the face
    
    // Position tool for parting
    gcode += `G0 X${(stockDiameter! + 2).toFixed(3)} Z${partPositionZ.toFixed(3)} ; Position tool\n`;
    
    // Parting cut
    gcode += `G1 X-1 F${feedrate/3} ; Part off\n`;
    gcode += `G0 X${(stockDiameter! + 5).toFixed(3)} ; Retract\n`;
    
    return gcode;
  };
  
  // Generate knurling operation for lathe
  const generateLatheKnurlingOperation = () => {
    const { stockDiameter, stockLength, feedrate } = settings;
    let gcode = '\n; Knurling operation\n';
    
    // Knurling parameters
    const knurlStartZ = 5;
    const knurlLength = 30;
    const knurlEndZ = knurlStartZ + knurlLength;
    
    // Position tool for knurling
    gcode += `G0 X${(stockDiameter! + 2).toFixed(3)} Z${knurlStartZ.toFixed(3)} ; Position tool\n`;
    
    // Knurling passes
    gcode += `G1 X${stockDiameter!.toFixed(3)} F${feedrate/2} ; Approach to diameter\n`;
    gcode += `G1 Z${knurlEndZ.toFixed(3)} F${feedrate/4} ; Knurl along length\n`;
    gcode += `G0 X${(stockDiameter! + 5).toFixed(3)} ; Retract\n`;
    gcode += `G0 Z${knurlStartZ.toFixed(3)} ; Return to start\n`;
    
    // Second pass for deeper knurl
    gcode += `G1 X${(stockDiameter! + 0.2).toFixed(3)} F${feedrate/2} ; Approach with pressure\n`;
    gcode += `G1 Z${knurlEndZ.toFixed(3)} F${feedrate/4} ; Knurl along length again\n`;
    gcode += `G0 X${(stockDiameter! + 5).toFixed(3)} ; Retract\n`;
    
    return gcode;
  };
  
  // Generate G-code for 3D printer operations
  const generate3DPrinterGCode = () => {
    let gcode = '';
    
    // Program header
    gcode += '; Generated 3D Printer G-code with AI assistance\n';
    gcode += `; Operation: ${settings.operationType}\n`;
    gcode += `; Material: ${settings.material === 'plastic' ? 'PLA' : settings.material}\n`;
    gcode += `; Nozzle: ${settings.nozzleDiameter}mm\n`;
    gcode += `; Layer Height: ${settings.layerHeight}mm\n`;
    gcode += `; Date: ${new Date().toISOString()}\n\n`;
    
    // Program initialization
    gcode += 'M82 ; Set extruder to absolute mode\n';
    gcode += 'G21 ; Set units to millimeters\n';
    gcode += 'G90 ; Use absolute coordinates\n';
    gcode += `M104 S${settings.printTemperature} ; Set extruder temperature\n`;
    gcode += `M140 S${settings.bedTemperature} ; Set bed temperature\n`;
    gcode += 'M109 S' + settings.printTemperature + ' ; Wait for extruder temperature\n';
    gcode += 'M190 S' + settings.bedTemperature + ' ; Wait for bed temperature\n';
    gcode += 'G28 ; Home all axes\n';
    gcode += 'G1 Z5 F5000 ; Move Z up a bit\n';
    gcode += 'G1 X0 Y0 Z0.3 F3000 ; Move to start position\n';
    gcode += 'G1 E5 F1800 ; Prime the extruder\n';
    gcode += 'G92 E0 ; Reset extruder position\n\n';
    
    // G-code generation based on 3D printer operation type
    switch (settings.operationType as PrinterOperationType) {
      case 'standard':
        gcode += generate3DPrinterStandardOperation();
        break;
      case 'vase':
        gcode += generate3DPrinterVaseOperation();
        break;
      case 'support':
        gcode += generate3DPrinterSupportOperation();
        break;
      case 'infill':
        gcode += generate3DPrinterInfillOperation();
        break;
      case 'raft':
        gcode += generate3DPrinterRaftOperation();
        break;
      case 'brim':
        gcode += generate3DPrinterBrimOperation();
        break;
    }
    
    // Program ending
    gcode += '\n; End of print\n';
    gcode += 'G1 E-2 F1800 ; Retract filament\n';
    gcode += 'G1 Z' + (settings.depth + 5).toFixed(2) + ' F3000 ; Move Z up\n';
    gcode += 'G1 X0 Y200 F3000 ; Move to front\n';
    gcode += 'M104 S0 ; Turn off extruder\n';
    gcode += 'M140 S0 ; Turn off bed\n';
    gcode += 'M84 ; Disable motors\n';
    
    return gcode;
  };
  
  // Generate standard 3D print operation
  const generate3DPrinterStandardOperation = () => {
    const { layerHeight, extrusionWidth, printSpeed, depth } = settings;
    const layers = Math.ceil(depth / layerHeight!);
    let gcode = '\n; Standard printing operation\n';
    
    // Simple example: print a small square object
    const size = Math.min(rectangleWidth, rectangleHeight);
    
    // Calculate extrusion values
    const filamentArea = Math.PI * Math.pow(settings.filamentDiameter! / 2, 2);
    const extrusionArea = extrusionWidth! * layerHeight!;
    const extrusionMultiplier = extrusionArea / filamentArea;
    
    // Print layers
    for (let layer = 0; layer < layers; layer++) {
      const z = layerHeight! * (layer + 1);
      gcode += `\n; Layer ${layer + 1}, Z=${z.toFixed(3)}\n`;
      
      // Move to new layer
      gcode += `G1 Z${z.toFixed(3)} F3000 ; Move to new layer\n`;
      
      // Outer perimeter
      gcode += 'G1 F' + printSpeed + ' ; Set print speed\n';
      gcode += `G1 X${(-size/2).toFixed(3)} Y${(-size/2).toFixed(3)} E0.5 ; Move to start position\n`;
      gcode += `G1 X${(size/2).toFixed(3)} Y${(-size/2).toFixed(3)} E${(extrusionMultiplier * size).toFixed(5)} ; Draw line\n`;
      gcode += `G1 X${(size/2).toFixed(3)} Y${(size/2).toFixed(3)} E${(extrusionMultiplier * size * 2).toFixed(5)} ; Draw line\n`;
      gcode += `G1 X${(-size/2).toFixed(3)} Y${(size/2).toFixed(3)} E${(extrusionMultiplier * size * 3).toFixed(5)} ; Draw line\n`;
      gcode += `G1 X${(-size/2).toFixed(3)} Y${(-size/2).toFixed(3)} E${(extrusionMultiplier * size * 4).toFixed(5)} ; Draw line\n`;
      
      // Simple infill (if not first or last layer)
      if (layer > 0 && layer < layers - 1) {
        // Reset extruder for infill
        gcode += 'G92 E0 ; Reset extruder position\n';
        
        // Infill pattern - simple zigzag
        const infillSpacing = extrusionWidth! * 2;
        for (let y = -size/2 + infillSpacing; y < size/2; y += infillSpacing) {
          const dir = (Math.floor(y / infillSpacing) % 2 === 0);
          gcode += `G1 X${(dir ? -size/2 : size/2).toFixed(3)} Y${y.toFixed(3)} F3000 E0.1 ; Move to start infill line\n`;
          gcode += `G1 X${(dir ? size/2 : -size/2).toFixed(3)} Y${y.toFixed(3)} F${printSpeed} E${(extrusionMultiplier * size).toFixed(5)} ; Infill line\n`;
        }
      }
      
      // Reset extruder before next layer
      gcode += 'G92 E0 ; Reset extruder position\n';
    }
    
    return gcode;
  };
  
  // Generate vase mode 3D print operation
  const generate3DPrinterVaseOperation = () => {
    const { layerHeight, extrusionWidth, printSpeed, depth } = settings;
    const layers = Math.ceil(depth / layerHeight!);
    let gcode = '\n; Vase mode printing operation\n';
    
    // Vase parameters
    const baseRadius = circleRadius;
    const topRadius = baseRadius * 0.8; // Slight taper at the top
    
    // Calculate extrusion values
    const filamentArea = Math.PI * Math.pow(settings.filamentDiameter! / 2, 2);
    const extrusionArea = extrusionWidth! * layerHeight!;
    const extrusionMultiplier = extrusionArea / filamentArea;
    
    // Print base (first layer)
    gcode += `\n; Base layer, Z=${layerHeight!.toFixed(3)}\n`;
    gcode += `G1 Z${layerHeight!.toFixed(3)} F3000 ; Move to first layer\n`;
    
    // Concentric circles for base
    for (let r = baseRadius; r > 0; r -= extrusionWidth! * 1.2) {
      const circumference = 2 * Math.PI * r;
      gcode += `G1 X${r.toFixed(3)} Y0 F3000 ; Move to radius\n`;
      gcode += `G1 F${printSpeed} E0.5 ; Prepare to print\n`;
      gcode += `G2 X${r.toFixed(3)} Y0 I${(-r).toFixed(3)} J0 E${(extrusionMultiplier * circumference).toFixed(5)} ; Print circle\n`;
    }
    
    // Reset extruder before wall
    gcode += 'G92 E0 ; Reset extruder position\n';
    
    // Print spiral wall
    gcode += '\n; Spiral vase walls\n';
    gcode += 'M106 S255 ; Fan on full\n';
    gcode += 'G1 F3000 ; Set move speed\n';
    gcode += `G1 X${baseRadius.toFixed(3)} Y0 ; Move to start position\n`;
    
    // Continuous spiral with Z change
    gcode += 'G92 E0 ; Reset extruder position\n';
    gcode += `G1 F${printSpeed} ; Set print speed\n`;
    
    const segments = 32; // Number of segments per revolution
    const angleStep = 360 / segments;
    
    for (let layer = 1; layer < layers; layer++) {
      const z = layerHeight! * (layer + 1);
      const ratio = layer / layers;
      const currentRadius = baseRadius - (baseRadius - topRadius) * ratio;
      
      for (let i = 0; i < segments; i++) {
        const angle = i * angleStep;
        const x = currentRadius * Math.cos(angle * Math.PI / 180);
        const y = currentRadius * Math.sin(angle * Math.PI / 180);
        const zHeight = z + (i / segments) * layerHeight!;
        const extrusionAmount = extrusionMultiplier * (2 * Math.PI * currentRadius / segments);
        
        gcode += `G1 X${x.toFixed(3)} Y${y.toFixed(3)} Z${zHeight.toFixed(3)} E${(layer * 10 + i * extrusionAmount).toFixed(5)} ; Spiral\n`;
      }
    }
    
    return gcode;
  };
  
  // Generate support operation for 3D printer
  const generate3DPrinterSupportOperation = () => {
    const { layerHeight, extrusionWidth, printSpeed, depth } = settings;
    const layers = Math.ceil(depth / layerHeight!);
    let gcode = '\n; Support structure printing operation\n';
    
    // Support parameter - sparse grid
    const gridSpacing = 5; // mm between support lines
    const size = Math.max(rectangleWidth, rectangleHeight);
    
    // Calculate extrusion values
    const filamentArea = Math.PI * Math.pow(settings.filamentDiameter! / 2, 2);
    const extrusionArea = extrusionWidth! * layerHeight!;
    const extrusionMultiplier = extrusionArea / filamentArea * 0.8; // Slightly less for supports
    
    for (let layer = 0; layer < layers; layer++) {
      const z = layerHeight! * (layer + 1);
      gcode += `\n; Support Layer ${layer + 1}, Z=${z.toFixed(3)}\n`;
      gcode += `G1 Z${z.toFixed(3)} F3000 ; Move to new layer\n`;
      
      // Reset extruder for this layer
      gcode += 'G92 E0 ; Reset extruder position\n';
      
      // Alternate direction of support grid
      const altLayer = layer % 2 === 0;
      
      // Print support grid
      if (altLayer) {
        // X direction lines
        for (let y = -size/2; y <= size/2; y += gridSpacing) {
          gcode += `G1 X${(-size/2).toFixed(3)} Y${y.toFixed(3)} F3000 ; Move to start line\n`;
          gcode += `G1 X${(size/2).toFixed(3)} Y${y.toFixed(3)} F${printSpeed} E${(extrusionMultiplier * size).toFixed(5)} ; Support line\n`;
        }
      } else {
        // Y direction lines
        for (let x = -size/2; x <= size/2; x += gridSpacing) {
          gcode += `G1 X${x.toFixed(3)} Y${(-size/2).toFixed(3)} F3000 ; Move to start line\n`;
          gcode += `G1 X${x.toFixed(3)} Y${(size/2).toFixed(3)} F${printSpeed} E${(extrusionMultiplier * size).toFixed(5)} ; Support line\n`;
        }
      }
    }
    
    return gcode;
  };
  
  // Generate infill operation for 3D printer
  const generate3DPrinterInfillOperation = () => {
    const { layerHeight, extrusionWidth, printSpeed, depth } = settings;
    const layers = Math.ceil(depth / layerHeight!);
    let gcode = '\n; Infill structure printing operation\n';
    
    // Infill parameters
    const infillPercentage = 20; // 20% density
    const infillSpacing = extrusionWidth! * (100 / infillPercentage);
    const size = Math.min(rectangleWidth, rectangleHeight);
    
    // Calculate extrusion values
    const filamentArea = Math.PI * Math.pow(settings.filamentDiameter! / 2, 2);
    const extrusionArea = extrusionWidth! * layerHeight!;
    const extrusionMultiplier = extrusionArea / filamentArea;
    
    for (let layer = 0; layer < layers; layer++) {
      const z = layerHeight! * (layer + 1);
      gcode += `\n; Infill Layer ${layer + 1}, Z=${z.toFixed(3)}\n`;
      gcode += `G1 Z${z.toFixed(3)} F3000 ; Move to new layer\n`;
      
      // Reset extruder for this layer
      gcode += 'G92 E0 ; Reset extruder position\n';
      
      // Alternate infill pattern direction and angle
      const angle = (layer % 2 === 0) ? 0 : 90; // Alternate 0/90 degrees
      
      if (angle === 0) {
        // Horizontal lines
        for (let y = -size/2; y <= size/2; y += infillSpacing) {
          gcode += `G1 X${(-size/2).toFixed(3)} Y${y.toFixed(3)} F3000 ; Move to start line\n`;
          gcode += `G1 X${(size/2).toFixed(3)} Y${y.toFixed(3)} F${printSpeed} E${(extrusionMultiplier * size).toFixed(5)} ; Infill line\n`;
        }
      } else {
        // Vertical lines
        for (let x = -size/2; x <= size/2; x += infillSpacing) {
          gcode += `G1 X${x.toFixed(3)} Y${(-size/2).toFixed(3)} F3000 ; Move to start line\n`;
          gcode += `G1 X${x.toFixed(3)} Y${(size/2).toFixed(3)} F${printSpeed} E${(extrusionMultiplier * size).toFixed(5)} ; Infill line\n`;
        }
      }
    }
    
    return gcode;
  };
  
  // Generate raft operation for 3D printer
  const generate3DPrinterRaftOperation = () => {
    const { layerHeight, extrusionWidth, printSpeed } = settings;
    let gcode = '\n; Raft printing operation\n';
    
    // Raft parameters
    const raftLayers = 3;
    const raftSize = Math.max(rectangleWidth, rectangleHeight) + 10; // Extend beyond object
    
    // Calculate extrusion values
    const filamentArea = Math.PI * Math.pow(settings.filamentDiameter! / 2, 2);
    const extrusionArea = extrusionWidth! * layerHeight!;
    const extrusionMultiplier = extrusionArea / filamentArea;
    
    for (let layer = 0; layer < raftLayers; layer++) {
      const z = layerHeight! * (layer + 1);
      gcode += `\n; Raft Layer ${layer + 1}, Z=${z.toFixed(3)}\n`;
      gcode += `G1 Z${z.toFixed(3)} F3000 ; Move to new layer\n`;
      
      // Reset extruder for this layer
      gcode += 'G92 E0 ; Reset extruder position\n';
      
      // First layer: wide spacing, thick lines
      // Middle layers: medium spacing
      // Top layer: dense pattern for smooth surface
      
      let spacing;
      let speedFactor;
      let flowFactor;
      
      if (layer === 0) {
        spacing = extrusionWidth! * 3;
        speedFactor = 0.6; // Slower for first layer
        flowFactor = 1.5; // More material for adhesion
      } else if (layer === raftLayers - 1) {
        spacing = extrusionWidth! * 1.2;
        speedFactor = 0.8;
        flowFactor = 1.0;
      } else {
        spacing = extrusionWidth! * 2;
        speedFactor = 0.7;
        flowFactor = 1.2;
      }
      
      // Alternate directions for each layer
      const angle = (layer % 2 === 0) ? 0 : 90;
      
      if (angle === 0) {
        // Horizontal lines
        for (let y = -raftSize/2; y <= raftSize/2; y += spacing) {
          gcode += `G1 X${(-raftSize/2).toFixed(3)} Y${y.toFixed(3)} F3000 ; Move to start line\n`;
          gcode += `G1 X${(raftSize/2).toFixed(3)} Y${y.toFixed(3)} F${(printSpeed! * speedFactor)} E${(extrusionMultiplier * flowFactor * raftSize).toFixed(5)} ; Raft line\n`;
        }
      } else {
        // Vertical lines
        for (let x = -raftSize/2; x <= raftSize/2; x += spacing) {
          gcode += `G1 X${x.toFixed(3)} Y${(-raftSize/2).toFixed(3)} F3000 ; Move to start line\n`;
          gcode += `G1 X${x.toFixed(3)} Y${(raftSize/2).toFixed(3)} F${(printSpeed! * speedFactor)} E${(extrusionMultiplier * flowFactor * raftSize).toFixed(5)} ; Raft line\n`;
        }
      }
    }
    
    return gcode;
  };
  
  // Generate brim operation for 3D printer
  const generate3DPrinterBrimOperation = () => {
    const { layerHeight, extrusionWidth, printSpeed } = settings;
    let gcode = '\n; Brim printing operation\n';
    
    // Brim parameters
    const brimLoops = 5;
    const size = Math.min(rectangleWidth, rectangleHeight);
    
    // Calculate extrusion values
    const filamentArea = Math.PI * Math.pow(settings.filamentDiameter! / 2, 2);
    const extrusionArea = extrusionWidth! * layerHeight!;
    const extrusionMultiplier = extrusionArea / filamentArea;
    
    // First layer only
    gcode += `\n; Brim Layer, Z=${layerHeight!.toFixed(3)}\n`;
    gcode += `G1 Z${layerHeight!.toFixed(3)} F3000 ; Move to first layer\n`;
    
    // Reset extruder
    gcode += 'G92 E0 ; Reset extruder position\n';
    
    // Print concentric brim
    for (let i = 1; i <= brimLoops; i++) {
      const currentSize = size + (i * extrusionWidth! * 1.1);
      const perimeter = currentSize * 4;
      
      // Square brim
      gcode += `\n; Brim loop ${i}\n`;
      gcode += `G1 X${(-currentSize/2).toFixed(3)} Y${(-currentSize/2).toFixed(3)} F3000 ; Move to start\n`;
      gcode += `G1 F${printSpeed} E0.5 ; Prepare to print\n`;
      gcode += `G1 X${(currentSize/2).toFixed(3)} Y${(-currentSize/2).toFixed(3)} E${(extrusionMultiplier * currentSize).toFixed(5)} ; Brim line\n`;
      gcode += `G1 X${(currentSize/2).toFixed(3)} Y${(currentSize/2).toFixed(3)} E${(extrusionMultiplier * (currentSize * 2)).toFixed(5)} ; Brim line\n`;
      gcode += `G1 X${(-currentSize/2).toFixed(3)} Y${(currentSize/2).toFixed(3)} E${(extrusionMultiplier * (currentSize * 3)).toFixed(5)} ; Brim line\n`;
      gcode += `G1 X${(-currentSize/2).toFixed(3)} Y${(-currentSize/2).toFixed(3)} E${(extrusionMultiplier * (currentSize * 4)).toFixed(5)} ; Brim line\n`;
    }
    
    // Reset extruder after brim
    gcode += 'G92 E0 ; Reset extruder position\n';
    
    return gcode;
  };
  
  // Generate from selected CAD elements
  const generateFromSelectedElements = () => {
    if (!selectedElement) {
      return '; Nessun elemento selezionato per la generazione del percorso\n';
    }
    
    let gcode = `; Toolpath from selected element (${selectedElement.type})\n`;
    
    // Logic based on selected element type
    switch (selectedElement.type) {
      case 'circle':
        gcode += generateCircleFromElement(selectedElement);
        break;
      case 'rectangle':
        gcode += generateRectangleFromElement(selectedElement);
        break;
      case 'line':
        gcode += generateLineFromElement(selectedElement);
        break;
      case 'cube':
        gcode += generateCubeFromElement(selectedElement);
        break;
      case 'sphere':
        gcode += generateSphereFromElement(selectedElement);
        break;
      case 'cylinder':
        gcode += generateCylinderFromElement(selectedElement);
        break;
      case 'cone':
        gcode += generateConeFromElement(selectedElement);
        break;
      case 'torus':
        gcode += generateTorusFromElement(selectedElement);
        break;
      case 'extrude':
        gcode += generateExtrudeFromElement(selectedElement);
        break;
      case 'text':
        gcode += generateTextFromElement(selectedElement);
        break;
      case 'polygon':
        gcode += generatePolygonFromElement(selectedElement);
        break;
      default:
        gcode += `; Unsupported element type: ${selectedElement.type}\n`;
    }
    
    return gcode;
  };

  // Generate from a selected cube element
  const generateCubeFromElement = (element: any) => {
    let gcode = `; Cube: center (${element.x}, ${element.y}, ${element.z}), width ${element.width}mm, height ${element.height}mm, depth ${element.depth}mm\n`;
    const { toolDiameter, depth, stepdown, feedrate, plungerate, offset, direction } = settings;
    
    // For cubes, typically we only work on the top face for 3-axis machining
    // Calculate offset distance based on selected offset type
    let offsetDistance = 0;
    if (offset === 'inside') {
      offsetDistance = -toolDiameter / 2;
    } else if (offset === 'outside') {
      offsetDistance = toolDiameter / 2;
    }
    
    // Calculate rectangle coordinates with offset
    const width = element.width + offsetDistance * 2 * (offset === 'outside' ? 1 : -1);
    const height = element.depth + offsetDistance * 2 * (offset === 'outside' ? 1 : -1);
    
    // Start point (top face)
    const startX = element.x - width / 2;
    const startY = element.y - height / 2;
    const startZ = element.z + element.height / 2; // Top face
    
    // For each Z level
    for (let z = 0; z > -depth; z -= stepdown) {
      const currentZ = Math.max(-depth, z);
      const actualZ = startZ + currentZ;
      
      gcode += `\n; Z Level: ${actualZ.toFixed(3)}\n`;
      gcode += `G0 X${startX.toFixed(3)} Y${startY.toFixed(3)} Z${(startZ + 5).toFixed(3)} ; Move to start position\n`;
      gcode += `G1 Z${actualZ.toFixed(3)} F${plungerate} ; Plunge to cutting depth\n`;
      
      // Contour
      const corners = [
        [startX, startY],
        [startX + width, startY],
        [startX + width, startY + height],
        [startX, startY + height],
        [startX, startY] // Close the loop
      ];
      
      // Reverse order for conventional milling
      if (direction === 'conventional') {
        corners.reverse();
      }
      
      for (let i = 0; i < corners.length; i++) {
        gcode += `G1 X${corners[i][0].toFixed(3)} Y${corners[i][1].toFixed(3)} F${feedrate} ; Corner ${i+1}\n`;
      }
    }
    
    return gcode;
  };

  // Generate from a selected sphere element
  const generateSphereFromElement = (element: any) => {
    let gcode = `; Sphere: center (${element.x}, ${element.y}, ${element.z}), radius ${element.radius}mm\n`;
    const { toolDiameter, depth, stepdown, feedrate, plungerate, offset, direction } = settings;
    
    // For spheres, we typically create concentric circles at different heights
    // Calculate offset distance based on selected offset type
    let effectiveRadius = element.radius;
    if (offset === 'inside') {
      effectiveRadius -= toolDiameter / 2;
    } else if (offset === 'outside') {
      effectiveRadius += toolDiameter / 2;
    }
    
    // Start with the top of the sphere
    const topZ = element.z + element.radius;
    
    // Generate toolpath in slices from top to bottom
    for (let sliceZ = topZ; sliceZ >= element.z - depth; sliceZ -= stepdown) {
      // Calculate radius of this slice (using Pythagorean theorem)
      const distFromCenter = Math.abs(sliceZ - element.z);
      const sliceRadius = distFromCenter < element.radius ? 
        Math.sqrt(element.radius * element.radius - distFromCenter * distFromCenter) : 0;
      
      if (sliceRadius <= 0) continue;
      
      gcode += `\n; Sphere Slice at Z=${sliceZ.toFixed(3)}, Radius=${sliceRadius.toFixed(3)}\n`;
      
      // Move to start point on this slice
      gcode += `G0 X${(element.x + sliceRadius).toFixed(3)} Y${element.y.toFixed(3)} Z${(sliceZ + 5).toFixed(3)} ; Move above slice\n`;
      gcode += `G1 Z${sliceZ.toFixed(3)} F${plungerate} ; Plunge to slice level\n`;
      
      // Full circle for this slice
      if (direction === 'climb') {
        gcode += `G3 X${(element.x + sliceRadius).toFixed(3)} Y${element.y.toFixed(3)} I${(-sliceRadius).toFixed(3)} J0 F${feedrate} ; Clockwise full circle\n`;
      } else {
        gcode += `G2 X${(element.x + sliceRadius).toFixed(3)} Y${element.y.toFixed(3)} I${(-sliceRadius).toFixed(3)} J0 F${feedrate} ; Counter-clockwise full circle\n`;
      }
    }
    
    return gcode;
  };

  // Generate from a selected cylinder element
  const generateCylinderFromElement = (element: any) => {
    let gcode = `; Cylinder: center (${element.x}, ${element.y}, ${element.z}), radius ${element.radius}mm, height ${element.height}mm\n`;
    const { toolDiameter, depth, stepdown, feedrate, plungerate, offset, direction } = settings;
    
    // Calculate offset distance based on selected offset type
    let effectiveRadius = element.radius;
    if (offset === 'inside') {
      effectiveRadius -= toolDiameter / 2;
    } else if (offset === 'outside') {
      effectiveRadius += toolDiameter / 2;
    }
    
    // Start with the top of the cylinder
    const topZ = element.z + element.height / 2;
    
    // For each Z level
    for (let z = 0; z > -Math.min(depth, element.height); z -= stepdown) {
      const currentZ = Math.max(-Math.min(depth, element.height), z);
      const actualZ = topZ + currentZ;
      
      gcode += `\n; Z Level: ${actualZ.toFixed(3)}\n`;
      
      // Move to start point on circle
      gcode += `G0 X${(element.x + effectiveRadius).toFixed(3)} Y${element.y.toFixed(3)} Z${(topZ + 5).toFixed(3)} ; Move above start position\n`;
      gcode += `G1 Z${actualZ.toFixed(3)} F${plungerate} ; Plunge to cutting depth\n`;
      
      // Full circle
      if (direction === 'climb') {
        gcode += `G3 X${(element.x + effectiveRadius).toFixed(3)} Y${element.y.toFixed(3)} I${(-effectiveRadius).toFixed(3)} J0 F${feedrate} ; Clockwise full circle\n`;
      } else {
        gcode += `G2 X${(element.x + effectiveRadius).toFixed(3)} Y${element.y.toFixed(3)} I${(-effectiveRadius).toFixed(3)} J0 F${feedrate} ; Counter-clockwise full circle\n`;
      }
    }
    
    return gcode;
  };

  // Generate from a selected cone element
  const generateConeFromElement = (element: any) => {
    let gcode = `; Cone: base center (${element.x}, ${element.y}, ${element.z}), base radius ${element.radius}mm, height ${element.height}mm\n`;
    const { toolDiameter, depth, stepdown, feedrate, plungerate, offset, direction } = settings;
    
    // For cones, we create circles with decreasing radii as we move up the cone
    const baseZ = element.z - element.height / 2;
    const topZ = element.z + element.height / 2;
    
    // Generate toolpath in slices from bottom to top (or according to depth)
    for (let sliceZ = baseZ; sliceZ <= Math.min(baseZ + depth, topZ); sliceZ += stepdown) {
      // Calculate radius of this slice (linear proportion)
      const progress = (sliceZ - baseZ) / element.height;
      const sliceRadius = element.radius * (1 - progress);
      
      if (sliceRadius <= toolDiameter / 2) continue;
      
      // Calculate offset distance based on selected offset type
      let effectiveRadius = sliceRadius;
      if (offset === 'inside') {
        effectiveRadius -= toolDiameter / 2;
      } else if (offset === 'outside') {
        effectiveRadius += toolDiameter / 2;
      }
      
      if (effectiveRadius <= 0) continue;
      
      gcode += `\n; Cone Slice at Z=${sliceZ.toFixed(3)}, Radius=${effectiveRadius.toFixed(3)}\n`;
      
      // Move to start point on this slice
      gcode += `G0 X${(element.x + effectiveRadius).toFixed(3)} Y${element.y.toFixed(3)} Z${(sliceZ + 5).toFixed(3)} ; Move above slice\n`;
      gcode += `G1 Z${sliceZ.toFixed(3)} F${plungerate} ; Plunge to slice level\n`;
      
      // Full circle for this slice
      if (direction === 'climb') {
        gcode += `G3 X${(element.x + effectiveRadius).toFixed(3)} Y${element.y.toFixed(3)} I${(-effectiveRadius).toFixed(3)} J0 F${feedrate} ; Clockwise full circle\n`;
      } else {
        gcode += `G2 X${(element.x + effectiveRadius).toFixed(3)} Y${element.y.toFixed(3)} I${(-effectiveRadius).toFixed(3)} J0 F${feedrate} ; Counter-clockwise full circle\n`;
      }
    }
    
    return gcode;
  };

  // Generate from a selected torus element
  const generateTorusFromElement = (element: any) => {
    let gcode = `; Torus: center (${element.x}, ${element.y}, ${element.z}), major radius ${element.radius}mm, minor radius ${element.tubeRadius}mm\n`;
    const { toolDiameter, depth, stepdown, feedrate, plungerate, offset, direction } = settings;
    
    // For a torus, we typically create concentric circles at different heights
    const majorRadius = element.radius || 30;
    const minorRadius = element.tubeRadius || 10;
    
    // Calculate top and bottom Z values
    const topZ = element.z + minorRadius;
    const bottomZ = element.z - minorRadius;
    
    // Generate toolpath in slices from top to bottom
    for (let sliceZ = topZ; sliceZ >= Math.max(bottomZ, topZ - depth); sliceZ -= stepdown) {
      // Distance from center plane
      const distFromCenter = Math.abs(sliceZ - element.z);
      
      // Skip if we're outside the torus
      if (distFromCenter > minorRadius) continue;
      
      // Calculate inner and outer radii for this slice
      const minorSliceRadius = Math.sqrt(minorRadius * minorRadius - distFromCenter * distFromCenter);
      const outerRadius = majorRadius + minorSliceRadius;
      const innerRadius = majorRadius - minorSliceRadius;
      
      // Apply tool offset
      let effectiveOuterRadius = outerRadius;
      let effectiveInnerRadius = innerRadius;
      
      if (offset === 'outside') {
        effectiveOuterRadius += toolDiameter / 2;
        effectiveInnerRadius -= toolDiameter / 2;
      } else if (offset === 'inside') {
        effectiveOuterRadius -= toolDiameter / 2;
        effectiveInnerRadius += toolDiameter / 2;
      }
      
      if (effectiveInnerRadius >= effectiveOuterRadius) continue;
      
      gcode += `\n; Torus Slice at Z=${sliceZ.toFixed(3)}, Outer=${effectiveOuterRadius.toFixed(3)}, Inner=${effectiveInnerRadius.toFixed(3)}\n`;
      
      // Outer circle
      gcode += `G0 X${(element.x + effectiveOuterRadius).toFixed(3)} Y${element.y.toFixed(3)} Z${(sliceZ + 5).toFixed(3)} ; Move above outer circle\n`;
      gcode += `G1 Z${sliceZ.toFixed(3)} F${plungerate} ; Plunge to slice level\n`;
      
      if (direction === 'climb') {
        gcode += `G3 X${(element.x + effectiveOuterRadius).toFixed(3)} Y${element.y.toFixed(3)} I${(-effectiveOuterRadius).toFixed(3)} J0 F${feedrate} ; Outer circle clockwise\n`;
      } else {
        gcode += `G2 X${(element.x + effectiveOuterRadius).toFixed(3)} Y${element.y.toFixed(3)} I${(-effectiveOuterRadius).toFixed(3)} J0 F${feedrate} ; Outer circle counter-clockwise\n`;
      }
      
      // Inner circle (reverse direction)
      gcode += `G0 X${(element.x + effectiveInnerRadius).toFixed(3)} Y${element.y.toFixed(3)} ; Move to inner circle\n`;
      
      if (direction === 'climb') {
        gcode += `G2 X${(element.x + effectiveInnerRadius).toFixed(3)} Y${element.y.toFixed(3)} I${(-effectiveInnerRadius).toFixed(3)} J0 F${feedrate} ; Inner circle counter-clockwise\n`;
      } else {
        gcode += `G3 X${(element.x + effectiveInnerRadius).toFixed(3)} Y${element.y.toFixed(3)} I${(-effectiveInnerRadius).toFixed(3)} J0 F${feedrate} ; Inner circle clockwise\n`;
      }
    }
    
    return gcode;
  };

  // Generate from a selected extrude element
  const generateExtrudeFromElement = (element: any) => {
    let gcode = `; Extrude: base at (${element.x}, ${element.y}, ${element.z}), shape type: ${element.shapeType || 'custom'}, height: ${element.height || 10}mm\n`;
    const { toolDiameter, depth, stepdown, feedrate, plungerate, offset, direction } = settings;
    
    // For extrusions, we follow the base profile at different heights
    // We'll use a simplified approach assuming it's a rectangular or circular extrusion
    
    if (element.shapeType === 'rectangle' || element.baseShape?.type === 'rectangle') {
      // Rectangle extrusion
      const width = element.width || element.baseShape?.width || 50;
      const length = element.length || element.baseShape?.length || 50;
      
      // Calculate offset distance
      let offsetDistance = 0;
      if (offset === 'inside') {
        offsetDistance = -toolDiameter / 2;
      } else if (offset === 'outside') {
        offsetDistance = toolDiameter / 2;
      }
      
      // Calculate rectangle coordinates with offset
      const rectWidth = width + offsetDistance * 2 * (offset === 'outside' ? 1 : -1);
      const rectLength = length + offsetDistance * 2 * (offset === 'outside' ? 1 : -1);
      
      // Start point
      const startX = element.x - rectWidth / 2;
      const startY = element.y - rectLength / 2;
      const startZ = element.z;
      
      // For each Z level, up to the extrusion height or the depth parameter
      for (let z = 0; z < Math.min(element.height || 10, depth); z += stepdown) {
        const currentZ = Math.min(element.height || 10, z);
        const actualZ = startZ + currentZ;
        
        gcode += `\n; Z Level: ${actualZ.toFixed(3)}\n`;
        gcode += `G0 X${startX.toFixed(3)} Y${startY.toFixed(3)} Z${(actualZ + 5).toFixed(3)} ; Move above start position\n`;
        gcode += `G1 Z${actualZ.toFixed(3)} F${plungerate} ; Plunge to cutting depth\n`;
        
        // Contour
        const corners = [
          [startX, startY],
          [startX + rectWidth, startY],
          [startX + rectWidth, startY + rectLength],
          [startX, startY + rectLength],
          [startX, startY] // Close the loop
        ];
        
        // Reverse order for conventional milling
        if (direction === 'conventional') {
          corners.reverse();
        }
        
        for (let i = 0; i < corners.length; i++) {
          gcode += `G1 X${corners[i][0].toFixed(3)} Y${corners[i][1].toFixed(3)} F${feedrate} ; Corner ${i+1}\n`;
        }
      }
    } else if (element.shapeType === 'circle' || element.baseShape?.type === 'circle') {
      // Circle extrusion
      const radius = element.radius || element.baseShape?.radius || 25;
      
      // Calculate offset distance
      let effectiveRadius = radius;
      if (offset === 'inside') {
        effectiveRadius -= toolDiameter / 2;
      } else if (offset === 'outside') {
        effectiveRadius += toolDiameter / 2;
      }
      
      // For each Z level, up to the extrusion height or the depth parameter
      for (let z = 0; z < Math.min(element.height || 10, depth); z += stepdown) {
        const currentZ = Math.min(element.height || 10, z);
        const actualZ = element.z + currentZ;
        
        gcode += `\n; Z Level: ${actualZ.toFixed(3)}\n`;
        gcode += `G0 X${(element.x + effectiveRadius).toFixed(3)} Y${element.y.toFixed(3)} Z${(actualZ + 5).toFixed(3)} ; Move above start position\n`;
        gcode += `G1 Z${actualZ.toFixed(3)} F${plungerate} ; Plunge to cutting depth\n`;
        
        // Full circle
        if (direction === 'climb') {
          gcode += `G3 X${(element.x + effectiveRadius).toFixed(3)} Y${element.y.toFixed(3)} I${(-effectiveRadius).toFixed(3)} J0 F${feedrate} ; Clockwise full circle\n`;
        } else {
          gcode += `G2 X${(element.x + effectiveRadius).toFixed(3)} Y${element.y.toFixed(3)} I${(-effectiveRadius).toFixed(3)} J0 F${feedrate} ; Counter-clockwise full circle\n`;
        }
      }
    } else {
      // Generic extrusion - use a placeholder message
      gcode += `; Complex extrusion path not supported - convert to basic shapes first\n`;
    }
    
    return gcode;
  };

  // Generate from a selected text element
  const generateTextFromElement = (element: any) => {
    let gcode = `; Text: position (${element.x}, ${element.y}, ${element.z}), content: "${element.text || 'Text'}"\n`;
    
    // Text engraving is complex and typically requires specialized CAM software
    gcode += `; Text engraving requires conversion to paths - please use CAM software for text operations\n`;
    gcode += `; Recommend using outline paths or importing as SVG for text machining\n`;
    
    return gcode;
  };

  // Generate from a selected polygon element
  const generatePolygonFromElement = (element: any) => {
    let gcode = `; Polygon: center (${element.x}, ${element.y}, ${element.z}), sides: ${element.sides || 6}, radius: ${element.radius || 30}mm\n`;
    const { toolDiameter, depth, stepdown, feedrate, plungerate, offset, direction } = settings;
    
    // For polygons, we calculate vertices and create a path
    const sides = element.sides || 6;
    let radius = element.radius || 30;
    
    // Calculate offset distance based on selected offset type
    if (offset === 'inside') {
      radius -= toolDiameter / 2;
    } else if (offset === 'outside') {
      radius += toolDiameter / 2;
    }
    
    if (radius <= 0) {
      return `; Cannot generate toolpath: radius after offset is too small\n`;
    }
    
    // Calculate polygon points
    const points = [];
    for (let i = 0; i < sides; i++) {
      const angle = i * (2 * Math.PI / sides);
      const x = element.x + radius * Math.cos(angle);
      const y = element.y + radius * Math.sin(angle);
      points.push([x, y]);
    }
    points.push(points[0]); // Close the loop
    
    // Reverse order for conventional milling if needed
    if (direction === 'conventional') {
      points.reverse();
    }
    
    // For each Z level
    for (let z = 0; z > -depth; z -= stepdown) {
      const currentZ = Math.max(-depth, z);
      const actualZ = element.z + currentZ;
      
      gcode += `\n; Z Level: ${actualZ.toFixed(3)}\n`;
      
      // Move to first point
      gcode += `G0 X${points[0][0].toFixed(3)} Y${points[0][1].toFixed(3)} Z${(element.z + 5).toFixed(3)} ; Move above start position\n`;
      gcode += `G1 Z${actualZ.toFixed(3)} F${plungerate} ; Plunge to cutting depth\n`;
      
      // Follow polygon path
      for (let i = 1; i < points.length; i++) {
        gcode += `G1 X${points[i][0].toFixed(3)} Y${points[i][1].toFixed(3)} F${feedrate} ; Point ${i}\n`;
      }
    }
    
    return gcode;
  };
  
  // Generate from a selected circle element
  const generatePolygonToolpath = () => {
    let gcode = `; Polygon toolpath (${polygonSides} sides)\n`;
    const { toolDiameter, depth, stepdown, feedrate, plungerate, offset, direction, operationType, stepover } = settings;
    
    // Calculate offset distance based on selected offset type
    let effectiveRadius = polygonRadius;
    if (offset === 'inside') {
      effectiveRadius -= toolDiameter / 2;
    } else if (offset === 'outside') {
      effectiveRadius += toolDiameter / 2;
    }
    
    // For each Z level
    for (let z = 0; z > -depth; z -= stepdown) {
      const currentZ = Math.max(-depth, z);
      
      gcode += `\n; Z Level: ${currentZ}\n`;
      
      // For pocket operation
      if (operationType === 'pocket') {
        // Calculate number of passes based on stepover
        const stepSize = toolDiameter * (stepover / 100);
        const numSteps = Math.ceil(effectiveRadius / stepSize);
        
        gcode += `; Polygon pocket operation - Stepover: ${stepover}% (${stepSize.toFixed(2)}mm)\n`;
        
        // Start from center and spiral outward
        const centerPoint = applyOriginOffset(0, 0);
        gcode += `G0 X${centerPoint.x.toFixed(3)} Y${centerPoint.y.toFixed(3)} ; Move to center\n`;
        gcode += `G1 Z${currentZ.toFixed(3)} F${plungerate} ; Plunge to cutting depth\n`;
        
        for (let i = 1; i <= numSteps; i++) {
          const currentRadius = Math.min(i * stepSize, effectiveRadius);
          
          // Calculate polygon points for this radius
          const points = [];
          for (let j = 0; j < polygonSides; j++) {
            const angle = j * (2 * Math.PI / polygonSides);
            const baseX = currentRadius * Math.cos(angle);
            const baseY = currentRadius * Math.sin(angle);
            // Apply origin offset
            const offsetPoint = applyOriginOffset(baseX, baseY);
            points.push(offsetPoint);
          }
          // Close the polygon
          points.push(points[0]);
          
          // Reverse order for conventional milling
          if (direction === 'conventional') {
            points.reverse();
          }
          
          // Polygon path
          for (let j = 0; j < points.length; j++) {
            gcode += `G1 X${points[j].x.toFixed(3)} Y${points[j].y.toFixed(3)} F${feedrate} ; Point ${j+1} at radius ${currentRadius.toFixed(3)}\n`;
          }
        }
      } else {
        // Calculate polygon points with origin offset
        const points = [];
        for (let i = 0; i < polygonSides; i++) {
          const angle = i * (2 * Math.PI / polygonSides);
          const baseX = effectiveRadius * Math.cos(angle);
          const baseY = effectiveRadius * Math.sin(angle);
          // Apply origin offset
          const offsetPoint = applyOriginOffset(baseX, baseY);
          points.push(offsetPoint);
        }
        // Close the loop
        points.push(points[0]);
        
        // Reverse order for conventional milling
        if (direction === 'conventional') {
          points.reverse();
        }
        
        // Move to first point
        gcode += `G0 X${points[0].x.toFixed(3)} Y${points[0].y.toFixed(3)} ; Move to start position\n`;
        gcode += `G1 Z${currentZ.toFixed(3)} F${plungerate} ; Plunge to cutting depth\n`;
        
        // Cut polygon
        for (let i = 1; i < points.length; i++) {
          gcode += `G1 X${points[i].x.toFixed(3)} Y${points[i].y.toFixed(3)} F${feedrate} ; Point ${i}\n`;
        }
      }
    }
    
    return gcode;
  };
  
  // Generate from a selected rectangle element
  const generateRectangleFromElement = (element: any) => {
    let gcode = `; Rectangle: center (${element.x}, ${element.y}), width ${element.width}mm, height ${element.height}mm\n`;
    const { toolDiameter, depth, stepdown, feedrate, plungerate, offset, direction } = settings;
    
    // Calculate offset distance based on selected offset type
    let offsetDistance = 0;
    if (offset === 'inside') {
      offsetDistance = -toolDiameter / 2;
    } else if (offset === 'outside') {
      offsetDistance = toolDiameter / 2;
    }
    
    // Calculate rectangle coordinates with offset
    const width = element.width + offsetDistance * 2 * (offset === 'outside' ? 1 : -1);
    const height = element.height + offsetDistance * 2 * (offset === 'outside' ? 1 : -1);
    
    // Start point
    const startX = element.x - width / 2;
    const startY = element.y - height / 2;
    
    // For each Z level
    for (let z = 0; z > -depth; z -= stepdown) {
      const currentZ = Math.max(-depth, z);
      
      gcode += `\n; Z Level: ${currentZ}\n`;
      gcode += `G0 X${startX.toFixed(3)} Y${startY.toFixed(3)} ; Move to start position\n`;
      gcode += `G1 Z${currentZ.toFixed(3)} F${plungerate} ; Plunge to cutting depth\n`;
      
      // Contour
      const corners = [
        [startX, startY],
        [startX + width, startY],
        [startX + width, startY + height],
        [startX, startY + height],
        [startX, startY] // Close the loop
      ];
      
      // Reverse order for conventional milling
      if (direction === 'conventional') {
        corners.reverse();
      }
      
      for (let i = 0; i < corners.length; i++) {
        gcode += `G1 X${corners[i][0].toFixed(3)} Y${corners[i][1].toFixed(3)} F${feedrate} ; Corner ${i+1}\n`;
      }
    }
    
    return gcode;
  };
  
  // Generate from a selected line element
  const generateLineFromElement = (element: any) => {
    let gcode = `; Line: from (${element.x1}, ${element.y1}) to (${element.x2}, ${element.y2})\n`;
    const { depth, stepdown, feedrate, plungerate } = settings;
    
    // For each Z level
    for (let z = 0; z > -depth; z -= stepdown) {
      const currentZ = Math.max(-depth, z);
      
      gcode += `\n; Z Level: ${currentZ}\n`;
      gcode += `G0 X${element.x1.toFixed(3)} Y${element.y1.toFixed(3)} ; Move to start position\n`;
      gcode += `G1 Z${currentZ.toFixed(3)} F${plungerate} ; Plunge to cutting depth\n`;
      gcode += `G1 X${element.x2.toFixed(3)} Y${element.y2.toFixed(3)} F${feedrate} ; Linear move to end\n`;
    }
    
    return gcode;
  };
  
  // Generate rectangular toolpath
  const generateRectangleToolpath = () => {
    let gcode = '; Rectangle toolpath\n';
    const { toolDiameter, depth, stepdown, feedrate, plungerate, offset, direction, stepover, operationType } = settings;
    
    // Calculate offset distance based on selected offset type
    let offsetDistance = 0;
    if (offset === 'inside') {
      offsetDistance = -toolDiameter / 2;
    } else if (offset === 'outside') {
      offsetDistance = toolDiameter / 2;
    }
    
    // Calculate rectangle coordinates with offset
    const width = rectangleWidth + offsetDistance * 2 * (offset === 'outside' ? 1 : -1);
    const height = rectangleHeight + offsetDistance * 2 * (offset === 'outside' ? 1 : -1);
    
    // Start point (with origin in center of rectangle)
    const baseStartX = -width / 2;
    const baseStartY = -height / 2;
    
    // Apply origin offset to get actual coordinates
    const startPoint = applyOriginOffset(baseStartX, baseStartY);
    
    // For each Z level
    for (let z = 0; z > -depth; z -= stepdown) {
      const currentZ = Math.max(-depth, z);
      
      gcode += `\n; Z Level: ${currentZ}\n`;
      
      // For pocket operation
      if (operationType === 'pocket') {
        // Calculate number of passes based on stepover
        const stepSize = toolDiameter * (stepover / 100);
        const numXSteps = Math.ceil(width / stepSize);
        const numYSteps = Math.ceil(height / stepSize);
        
        gcode += `; Pocket operation - Stepover: ${stepover}% (${stepSize.toFixed(2)}mm)\n`;
        
        // Start from center and spiral outward
        const centerPoint = applyOriginOffset(0, 0);
        gcode += `G0 X${centerPoint.x.toFixed(3)} Y${centerPoint.y.toFixed(3)} ; Move to center\n`;
        gcode += `G1 Z${currentZ.toFixed(3)} F${plungerate} ; Plunge to cutting depth\n`;
        
        let currentStep = 1;
        const maxSteps = Math.max(numXSteps, numYSteps);
        
        while (currentStep <= maxSteps) {
          const currentX = Math.min(width / 2, currentStep * stepSize / 2);
          const currentY = Math.min(height / 2, currentStep * stepSize / 2);
          
          // Rectangular spiral with origin offset
          const corner1 = applyOriginOffset(currentX, -currentY);
          const corner2 = applyOriginOffset(currentX, currentY);
          const corner3 = applyOriginOffset(-currentX, currentY);
          const corner4 = applyOriginOffset(-currentX, -currentY);
          
          gcode += `G1 X${corner1.x.toFixed(3)} Y${corner1.y.toFixed(3)} F${feedrate} ; Step ${currentStep} corner 1\n`;
          gcode += `G1 X${corner2.x.toFixed(3)} Y${corner2.y.toFixed(3)} F${feedrate} ; Step ${currentStep} corner 2\n`;
          gcode += `G1 X${corner3.x.toFixed(3)} Y${corner3.y.toFixed(3)} F${feedrate} ; Step ${currentStep} corner 3\n`;
          gcode += `G1 X${corner4.x.toFixed(3)} Y${corner4.y.toFixed(3)} F${feedrate} ; Step ${currentStep} corner 4\n`;
          gcode += `G1 X${corner1.x.toFixed(3)} Y${corner1.y.toFixed(3)} F${feedrate} ; Close loop\n`;
          
          currentStep++;
        }
      } else {
        // Standard contour
        gcode += `G0 X${startPoint.x.toFixed(3)} Y${startPoint.y.toFixed(3)} ; Move to start position\n`;
        gcode += `G1 Z${currentZ.toFixed(3)} F${plungerate} ; Plunge to cutting depth\n`;
        
        // Contour
        const corners = [
          applyOriginOffset(baseStartX, baseStartY),
          applyOriginOffset(baseStartX + width, baseStartY),
          applyOriginOffset(baseStartX + width, baseStartY + height),
          applyOriginOffset(baseStartX, baseStartY + height),
          applyOriginOffset(baseStartX, baseStartY) // Close the loop
        ];
        
        // Reverse order for conventional milling
        if (direction === 'conventional') {
          corners.reverse();
        }
        
        for (let i = 0; i < corners.length; i++) {
          gcode += `G1 X${corners[i].x.toFixed(3)} Y${corners[i].y.toFixed(3)} F${feedrate} ; Corner ${i+1}\n`;
        }
      }
    }
    
    return gcode;
  };
  
  // Generate circular toolpath
  const generateCircleToolpath = () => {
    let gcode = '; Circle toolpath\n';
    const { toolDiameter, depth, stepdown, feedrate, plungerate, offset, direction, stepover, operationType } = settings;
    
    // Calculate offset distance based on selected offset type
    let effectiveRadius = circleRadius;
    if (offset === 'inside') {
      effectiveRadius -= toolDiameter / 2;
    } else if (offset === 'outside') {
      effectiveRadius += toolDiameter / 2;
    }
    
    // For each Z level
    for (let z = 0; z > -depth; z -= stepdown) {
      const currentZ = Math.max(-depth, z);
      
      gcode += `\n; Z Level: ${currentZ}\n`;
      
      // For pocket operation
      if (operationType === 'pocket') {
        // Calculate number of passes based on stepover
        const stepSize = toolDiameter * (stepover / 100);
        const numSteps = Math.ceil(effectiveRadius / stepSize);
        
        gcode += `; Circular pocket operation - Stepover: ${stepover}% (${stepSize.toFixed(2)}mm)\n`;
        
        // Start from center and spiral outward
        const centerPoint = applyOriginOffset(0, 0);
        gcode += `G0 X${centerPoint.x.toFixed(3)} Y${centerPoint.y.toFixed(3)} ; Move to center\n`;
        gcode += `G1 Z${currentZ.toFixed(3)} F${plungerate} ; Plunge to cutting depth\n`;
        
        for (let i = 1; i <= numSteps; i++) {
          const currentRadius = i * stepSize;
          if (currentRadius > effectiveRadius) break;
          
          // Center of circle with origin offset
          const center = applyOriginOffset(0, 0);
          
          // Full circle at each step
          if (direction === 'climb') {
            gcode += `G3 X${center.x.toFixed(3)} Y${center.y.toFixed(3)} I${currentRadius.toFixed(3)} J0 F${feedrate} ; Circle at radius ${currentRadius.toFixed(3)}mm\n`;
          } else {
            gcode += `G2 X${center.x.toFixed(3)} Y${center.y.toFixed(3)} I${currentRadius.toFixed(3)} J0 F${feedrate} ; Circle at radius ${currentRadius.toFixed(3)}mm\n`;
          }
        }
      } else {
        // Standard circular contour
        // Move to start point on circle with origin offset
        const startPoint = applyOriginOffset(effectiveRadius, 0);
        const center = applyOriginOffset(0, 0);
        
        gcode += `G0 X${startPoint.x.toFixed(3)} Y${startPoint.y.toFixed(3)} ; Move to start position\n`;
        gcode += `G1 Z${currentZ.toFixed(3)} F${plungerate} ; Plunge to cutting depth\n`;
        
        // Full circle - calculate I and J values as offsets from current position to circle center
        const iOffset = center.x - startPoint.x;
        const jOffset = center.y - startPoint.y;
        
        if (direction === 'climb') {
          gcode += `G3 X${startPoint.x.toFixed(3)} Y${startPoint.y.toFixed(3)} I${iOffset.toFixed(3)} J${jOffset.toFixed(3)} F${feedrate} ; Clockwise full circle\n`;
        } else {
          gcode += `G2 X${startPoint.x.toFixed(3)} Y${startPoint.y.toFixed(3)} I${iOffset.toFixed(3)} J${jOffset.toFixed(3)} F${feedrate} ; Counter-clockwise full circle\n`;
        }
      }
    }
    
    return gcode;
  };

  
  const generateCircleFromElement = (element: any) => {
    let gcode = `; Circle: center (${element.x}, ${element.y}), radius ${element.radius}mm\n`;
    const { toolDiameter, depth, stepdown, feedrate, plungerate, offset, direction } = settings;
    
    // Calculate offset distance based on selected offset type
    let effectiveRadius = element.radius;
    if (offset === 'inside') {
      effectiveRadius -= toolDiameter / 2;
    } else if (offset === 'outside') {
      effectiveRadius += toolDiameter / 2;
    }
    
    // For each Z level
    for (let z = 0; z > -depth; z -= stepdown) {
      const currentZ = Math.max(-depth, z);
      
      gcode += `\n; Z Level: ${currentZ}\n`;
      
      // Apply origin offset to element position
      const center = applyOriginOffset(element.x, element.y);
      const startPoint = {
        x: center.x + effectiveRadius,
        y: center.y,
        z: currentZ
      };
      
      // Move to start point on circle
      gcode += `G0 X${startPoint.x.toFixed(3)} Y${startPoint.y.toFixed(3)} ; Move to start position\n`;
      gcode += `G1 Z${currentZ.toFixed(3)} F${plungerate} ; Plunge to cutting depth\n`;
      
      // Full circle - I and J are relative offsets from current position to center
      if (direction === 'climb') {
        gcode += `G3 X${startPoint.x.toFixed(3)} Y${startPoint.y.toFixed(3)} I${(-effectiveRadius).toFixed(3)} J0 F${feedrate} ; Clockwise full circle\n`;
      } else {
        gcode += `G2 X${startPoint.x.toFixed(3)} Y${startPoint.y.toFixed(3)} I${(-effectiveRadius).toFixed(3)} J0 F${feedrate} ; Counter-clockwise full circle\n`;
      }
    }
    
    return gcode;
  };

  // Render machine section
  const renderMachineSection = () => {
    return (
      <div className="mb-6">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('machine')}
        >
          <h3 className="text-lg font-medium text-gray-900">Tipo di Macchina</h3>
          {expanded.machine ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
        
        {expanded.machine && (
          <div className="mt-3 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Macchina
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={settings.machineType}
                onChange={(e) => updateSettings('machineType', e.target.value)}
              >
                <option value="mill">Fresatrice CNC</option>
                <option value="lathe">Tornio CNC</option>
                <option value="3dprinter">Stampante 3D</option>
              </select>
            </div>
            
            {/* Machine-specific info */}
            <div className="p-3 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-800">
                {settings.machineType === 'mill' && (
                  <>Fresatrice CNC - Ideale per lavorazioni su superfici piane, contorni e tasche.</>
                )}
                {settings.machineType === 'lathe' && (
                  <>Tornio CNC - Ideale per parti cilindriche, alberi, e componenti rotazionali.</>
                )}
                {settings.machineType === '3dprinter' && (
                  <>Stampante 3D - Produzione additiva per modelli e prototipi.</>
                )}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };


  const renderOriginSection = () => {
    return (
      <div className="mb-6">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('origin')}
        >
          <h3 className="text-lg font-medium text-gray-900">Origine Coordinate</h3>
          {expanded.origin ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
        
        {expanded.origin && (
          <div className="mt-3 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo di Origine
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={settings.originType}
                onChange={(e) => updateSettings('originType', e.target.value)}
              >
                <option value="workpiece-center">Centro Pezzo</option>
                <option value="workpiece-corner">Angolo Pezzo (in basso a sinistra)</option>
                <option value="workpiece-corner2">Angolo Pezzo (in alto a sinistra)</option>
                <option value="machine-zero">Zero Macchina</option>
                <option value="custom">Coordinate Personalizzate</option>
              </select>
            </div>
            
            {settings.originType === 'custom' && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    X (mm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    value={settings.originX}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        updateSettings('originX', value);
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Y (mm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    value={settings.originY}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        updateSettings('originY', value);
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Z (mm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    value={settings.originZ}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        updateSettings('originZ', value);
                      }
                    }}
                  />
                </div>
              </div>
            )}
            
            <div className="p-3 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-800">
                {settings.originType === 'workpiece-center' && 
                  'Il percorso verrà generato considerando il centro del pezzo come origine (X0, Y0, Z0).'}
                {settings.originType === 'workpiece-corner' && 
                  'Il percorso verrà generato considerando l\'angolo inferiore sinistro del pezzo come origine (X0, Y0), con Z0 sulla superficie superiore.'}
                {settings.originType === 'machine-zero' && 
                  'Il percorso verrà generato utilizzando le coordinate della macchina senza offset.'}
                {settings.originType === 'custom' && 
                  'Imposta coordinate personalizzate per l\'origine del percorso utensile.'}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render lathe specific settings
  const renderLatheSection = () => {
    if (settings.machineType !== 'lathe') return null;
    
    return (
      <div className="mb-6">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('lathe')}
        >
          <h3 className="text-lg font-medium text-gray-900">Parametri Tornio</h3>
          {expanded.lathe ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
        
        {expanded.lathe && (
          <div className="mt-3 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Diametro Grezzo (mm)
              </label>
              <input
                type="number"
                min="1"
                step="0.5"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={settings.stockDiameter}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value) && value > 0) {
                    updateSettings('stockDiameter', value);
                  }
                }}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lunghezza Grezzo (mm)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={settings.stockLength}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value) && value > 0) {
                    updateSettings('stockLength', value);
                  }
                }}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Direzione Mandrino
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={settings.spindleDirection}
                onChange={(e) => updateSettings('spindleDirection', e.target.value as 'cw' | 'ccw')}
              >
                <option value="cw">Senso orario (CW)</option>
                <option value="ccw">Senso antiorario (CCW)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo di Tornitura
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={settings.turningOperation}
                onChange={(e) => updateSettings('turningOperation', e.target.value as 'external' | 'internal' | 'face')}
              >
                <option value="external">Esterna</option>
                <option value="internal">Interna</option>
                <option value="face">Frontale</option>
              </select>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="toolCompensation"
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                checked={settings.applyToolCompensation}
                onChange={(e) => updateSettings('applyToolCompensation', e.target.checked)}
              />
              <label htmlFor="toolCompensation" className="ml-2 block text-sm text-gray-700">
                Applica compensazione raggio utensile
              </label>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // Render 3D printer specific settings
  const render3DPrinterSection = () => {
    if (settings.machineType !== '3dprinter') return null;
    
    return (
      <div className="mb-6">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('printer')}
        >
          <h3 className="text-lg font-medium text-gray-900">Parametri Stampante 3D</h3>
          {expanded.printer ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
        
        {expanded.printer && (
          <div className="mt-3 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Diametro Ugello (mm)
              </label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={settings.nozzleDiameter}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value) && value > 0) {
                    updateSettings('nozzleDiameter', value);
                  }
                }}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Diametro Filamento (mm)
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={settings.filamentDiameter}
                onChange={(e) => updateSettings('filamentDiameter', parseFloat(e.target.value))}
              >
                <option value="1.75">1.75 mm</option>
                <option value="2.85">2.85 mm</option>
                <option value="3.0">3.0 mm</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Altezza Layer (mm)
              </label>
              <input
                type="number"
                min="0.05"
                max="0.35"
                step="0.05"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={settings.layerHeight}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value) && value > 0) {
                    updateSettings('layerHeight', value);
                  }
                }}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Larghezza Estrusione (mm)
              </label>
              <input
                type="number"
                min="0.2"
                step="0.1"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={settings.extrusionWidth}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value) && value > 0) {
                    updateSettings('extrusionWidth', value);
                  }
                }}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Velocità di Stampa (mm/s)
              </label>
              <input
                type="number"
                min="10"
                max="150"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={settings.printSpeed}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value) && value > 0) {
                    updateSettings('printSpeed', value);
                  }
                }}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Temperatura Estrusore (°C)
                </label>
                <input
                  type="number"
                  min="150"
                  max="300"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={settings.printTemperature}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value)) {
                      updateSettings('printTemperature', value);
                    }
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Temperatura Piatto (°C)
                </label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={settings.bedTemperature}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value)) {
                      updateSettings('bedTemperature', value);
                    }
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Update operation section to be machine specific
  const renderOperationSection = () => {
    return (
      <div className="mb-6">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('operation')}
        >
          <h3 className="text-lg font-medium text-gray-900">Operazione</h3>
          {expanded.operation ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
        
        {expanded.operation && (
          <div className="mt-3 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo di Operazione
              </label>
              {settings.machineType === 'mill' && (
                <select
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={settings.operationType}
                  onChange={(e) => updateSettings('operationType', e.target.value)}
                >
                  <option value="contour">Contornatura</option>
                  <option value="pocket">Svuotamento Tasca</option>
                  <option value="drill">Foratura</option>
                  <option value="engrave">Incisione</option>
                  <option value="profile">Profilo 3D</option>
                  <option value="threading">Filettatura</option>
                  <option value="3d_surface">Superficie 3D</option>
                </select>
              )}
              
              {settings.machineType === 'lathe' && (
                <select
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={settings.operationType}
                  onChange={(e) => updateSettings('operationType', e.target.value)}
                >
                  <option value="turning">Tornitura</option>
                  <option value="facing">Sfacciatura</option>
                  <option value="boring">Alesatura</option>
                  <option value="threading">Filettatura</option>
                  <option value="grooving">Scanalatura</option>
                  <option value="parting">Troncatura</option>
                  <option value="knurling">Zigrinatura</option>
                </select>
              )}
              
              {settings.machineType === '3dprinter' && (
                <select
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={settings.operationType}
                  onChange={(e) => updateSettings('operationType', e.target.value)}
                >
                  <option value="standard">Stampa Standard</option>
                  <option value="vase">Vaso (Spirale)</option>
                  <option value="support">Strutture di Supporto</option>
                  <option value="infill">Riempimento</option>
                  <option value="raft">Base Raft</option>
                  <option value="brim">Bordo (Brim)</option>
                </select>
              )}
            </div>
            
            {/* Show geometry options only for mill operations */}
            {settings.machineType === 'mill' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo di Geometria
                  </label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    value={geometryType}
                    onChange={(e) => setGeometryType(e.target.value as any)}
                  >
                    <option value="rectangle">Rettangolo</option>
                    <option value="circle">Cerchio</option>
                    <option value="polygon">Poligono</option>
                    <option value="selected">Da elemento selezionato</option>
                    <option value="custom">Personalizzato</option>
                  </select>
                </div>
                
                {/* Selection state if "Da elemento selezionato" is chosen */}
                {geometryType === 'selected' && (
                  <div className={`p-3 ${selectedElement ? 'bg-green-50' : 'bg-yellow-50'} rounded-md`}>
                    {selectedElement ? (
                      <div>
                        <p className="text-sm text-green-700 font-medium mb-2">
                          Elemento selezionato: {selectedElement.type} (ID: {selectedElement.id.substring(0, 6)}...)
                        </p>
                        
                        {/* Display element dimensions based on type */}
                        <div className="mt-2 border-t border-green-200 pt-2">
                          <p className="text-sm font-medium text-gray-700 mb-1">Quote dell elemento:</p>
                          
                          {selectedElement.type === 'rectangle' && (
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Larghezza:</span>
                                <span className="font-medium">{selectedElement.width} mm</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Altezza:</span>
                                <span className="font-medium">{selectedElement.height} mm</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Posizione X:</span>
                                <span className="font-medium">{selectedElement.x} mm</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Posizione Y:</span>
                                <span className="font-medium">{selectedElement.y} mm</span>
                              </div>
                              {selectedElement.z !== undefined && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Posizione Z:</span>
                                  <span className="font-medium">{selectedElement.z} mm</span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {selectedElement.type === 'circle' && (
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Raggio:</span>
                                <span className="font-medium">{selectedElement.radius} mm</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Diametro:</span>
                                <span className="font-medium">{selectedElement.radius * 2} mm</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Centro X:</span>
                                <span className="font-medium">{selectedElement.x} mm</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Centro Y:</span>
                                <span className="font-medium">{selectedElement.y} mm</span>
                              </div>
                              {selectedElement.z !== undefined && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Centro Z:</span>
                                  <span className="font-medium">{selectedElement.z} mm</span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {selectedElement.type === 'line' && (
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Punto 1 X:</span>
                                <span className="font-medium">{selectedElement.x1} mm</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Punto 1 Y:</span>
                                <span className="font-medium">{selectedElement.y1} mm</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Punto 2 X:</span>
                                <span className="font-medium">{selectedElement.x2} mm</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Punto 2 Y:</span>
                                <span className="font-medium">{selectedElement.y2} mm</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Lunghezza:</span>
                                <span className="font-medium">
                                  {Math.sqrt(
                                    Math.pow(selectedElement.x2 - selectedElement.x1, 2) + 
                                    Math.pow(selectedElement.y2 - selectedElement.y1, 2)
                                  ).toFixed(2)} mm
                                </span>
                              </div>
                            </div>
                          )}
                          
                          {selectedElement.type === 'polygon' && (
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Lati:</span>
                                <span className="font-medium">{selectedElement.sides || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Raggio:</span>
                                <span className="font-medium">{selectedElement.radius || 'N/A'} mm</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Centro X:</span>
                                <span className="font-medium">{selectedElement.x} mm</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Centro Y:</span>
                                <span className="font-medium">{selectedElement.y} mm</span>
                              </div>
                            </div>
                          )}
                          
                          {selectedElement.type === 'cube' && (
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Larghezza:</span>
                                <span className="font-medium">{selectedElement.width} mm</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Altezza:</span>
                                <span className="font-medium">{selectedElement.height} mm</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Profondità:</span>
                                <span className="font-medium">{selectedElement.depth} mm</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Centro X:</span>
                                <span className="font-medium">{selectedElement.x} mm</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Centro Y:</span>
                                <span className="font-medium">{selectedElement.y} mm</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Centro Z:</span>
                                <span className="font-medium">{selectedElement.z} mm</span>
                              </div>
                            </div>
                          )}
                          
                          {selectedElement.type === 'sphere' && (
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Raggio:</span>
                                <span className="font-medium">{selectedElement.radius} mm</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Diametro:</span>
                                <span className="font-medium">{selectedElement.radius * 2} mm</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Centro X:</span>
                                <span className="font-medium">{selectedElement.x} mm</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Centro Y:</span>
                                <span className="font-medium">{selectedElement.y} mm</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Centro Z:</span>
                                <span className="font-medium">{selectedElement.z} mm</span>
                              </div>
                            </div>
                          )}
                          
                          {selectedElement.type === 'cylinder' && (
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Raggio:</span>
                                <span className="font-medium">{selectedElement.radius} mm</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Diametro:</span>
                                <span className="font-medium">{selectedElement.radius * 2} mm</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Altezza:</span>
                                <span className="font-medium">{selectedElement.height} mm</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Centro X:</span>
                                <span className="font-medium">{selectedElement.x} mm</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Centro Y:</span>
                                <span className="font-medium">{selectedElement.y} mm</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Centro Z:</span>
                                <span className="font-medium">{selectedElement.z} mm</span>
                              </div>
                            </div>
                          )}
                          
                          {selectedElement.type === 'cone' && (
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Raggio Base:</span>
                                <span className="font-medium">{selectedElement.radius} mm</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Altezza:</span>
                                <span className="font-medium">{selectedElement.height} mm</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Centro X:</span>
                                <span className="font-medium">{selectedElement.x} mm</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Centro Y:</span>
                                <span className="font-medium">{selectedElement.y} mm</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Centro Z:</span>
                                <span className="font-medium">{selectedElement.z} mm</span>
                              </div>
                            </div>
                          )}
                          
                          {(selectedElement.type !== 'rectangle' && 
                            selectedElement.type !== 'circle' && 
                            selectedElement.type !== 'line' && 
                            selectedElement.type !== 'polygon' &&
                            selectedElement.type !== 'cube' &&
                            selectedElement.type !== 'sphere' &&
                            selectedElement.type !== 'cylinder' &&
                            selectedElement.type !== 'cone') && (
                            <div className="text-sm text-gray-600">
                              Dettagli disponibili per questo elemento nel CAD Editor.
                            </div>
                          )}
                        </div>
                        
                        {/* Button to use these dimensions */}
                        <div className="mt-3">
                          <button
                            type="button"
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onClick={() => {
                              // Use the selected element dimensions based on type
                              if (selectedElement.type === 'rectangle') {
                                setRectangleWidth(selectedElement.width);
                                setRectangleHeight(selectedElement.height);
                              } else if (selectedElement.type === 'circle') {
                                setCircleRadius(selectedElement.radius);
                              } else if (selectedElement.type === 'polygon' && selectedElement.sides && selectedElement.radius) {
                                setPolygonSides(selectedElement.sides);
                                setPolygonRadius(selectedElement.radius);
                              }
                              
                              // Show success message
                              setSuccess('Dimensioni applicate dal CAD');
                              if (successTimerRef.current) {
                                clearTimeout(successTimerRef.current);
                              }
                              successTimerRef.current = setTimeout(() => {
                                setSuccess(null);
                              }, 3000);
                            }}
                          >
                            Usa queste dimensioni
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-yellow-700">
                        Nessun elemento selezionato. Seleziona un elemento nel CAD Editor.
                      </p>
                    )}
                  </div>
                )}
                
                {/* Geometry specific settings */}
                {geometryType === 'rectangle' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Width (mm)(X)
                      </label>
                      <input
                        type="number"
                        min="1"
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        value={rectangleWidth}
                        onChange={(e) => updateNumericValue(e, setRectangleWidth)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Height (mm)(Y)
                      </label>
                      <input
                        type="number"
                        min="1"
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        value={rectangleHeight}
                        onChange={(e) => updateNumericValue(e, setRectangleHeight)}
                      />
                    </div>
                  </div>
                )}
                
                {geometryType === 'circle' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Raggio (mm)
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      value={circleRadius}
                      onChange={(e) => updateNumericValue(e, setCircleRadius)}
                    />
                  </div>
                )}
                
                {geometryType === 'polygon' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Numero Lati
                      </label>
                      <input
                        type="number"
                        min="3"
                        max="20"
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        value={polygonSides}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (!isNaN(value) && value >= 3) {
                            setPolygonSides(value);
                          }
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Raggio (mm)
                      </label>
                      <input
                        type="number"
                        min="1"
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        value={polygonRadius}
                        onChange={(e) => updateNumericValue(e, setPolygonRadius)}
                      />
                    </div>
                  </div>
                )}
                
                {geometryType === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      G-code Personalizzato
                    </label>
                    <div className="relative">
                      <textarea
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono text-sm h-32"
                        value={customPath}
                        onChange={(e) => setCustomPath(e.target.value)}
                        placeholder="Inserisci G-code personalizzato qui..."
                      />
                      {settings.useAI && !isAIProcessing && (
                        <button
                          type="button"
                          className="absolute top-2 right-2 p-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          title="Genera G-code con AI"
                          onClick={() => {
                            // Simulate AI G-code generation
                            setIsAIProcessing(true);
                            setTimeout(() => {
                              setCustomPath(
                                `; G-code generato automaticamente da AI\n` +
                                `G0 Z10 ; Posizione sicura\n` +
                                `G0 X0 Y0 ; Posizione iniziale\n` +
                                `G1 Z-${settings.depth/2} F${settings.plungerate} ; Prima profondità\n` +
                                `G1 X10 Y10 F${settings.feedrate} ; Movimento lineare\n` +
                                `G2 X20 Y0 I0 J-10 F${settings.feedrate} ; Arco in senso orario\n` +
                                `G1 X0 Y0 F${settings.feedrate} ; Ritorno all'origine\n` +
                                `G0 Z10 ; Posizione sicura\n`
                              );
                              setIsAIProcessing(false);
                            }, 2000);
                          }}
                        >
                          <Cpu size={16} />
                        </button>
                      )}
                      {isAIProcessing && (
                        <div className="absolute top-2 right-2 p-1">
                          <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end mt-1">
                      <button
                        type="button"
                        className="text-xs text-blue-600 hover:text-blue-800"
                        onClick={() => {
                          const sampleCode = 
                            `; Esempio di G-code\n` +
                            `G0 Z5 ; Posizione sicura\n` +
                            `G0 X0 Y0 ; Vai all'origine\n` +
                            `G1 Z-1 F100 ; Scendi a profondità 1mm\n` +
                            `G1 X10 Y0 F200 ; Muovi a X=10mm\n` +
                            `G1 X10 Y10 F200 ; Muovi a Y=10mm\n` +
                            `G1 X0 Y10 F200 ; Muovi a X=0mm\n` +
                            `G1 X0 Y0 F200 ; Torna all'origine\n` +
                            `G0 Z5 ; Torna a posizione sicura\n`;
                          setCustomPath(sampleCode);
                        }}
                      >
                        Inserisci esempio
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  };
  // Render material section
  const renderMaterialSection = () => {
    return (
      <div className="mb-6">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('material')}
        >
          <h3 className="text-lg font-medium text-gray-900">Materiale</h3>
          {expanded.material ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
        
        {expanded.material && (
          <div className="mt-3 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo di Materiale
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={settings.material}
                onChange={(e) => updateSettings('material', e.target.value)}
              >
                <option value="aluminum">Alluminio</option>
                <option value="steel">Acciaio</option>
                <option value="wood">Legno</option>
                <option value="plastic">Plastica</option>
                <option value="brass">Ottone</option>
                <option value="titanium">Titanio</option>
                <option value="composite">Composito</option>
                <option value="other">Altro</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Spessore Materiale (mm)
              </label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={settings.depth}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value) && value > 0) {
                    updateSettings('depth', value);
                  }
                }}
              />
            </div>
            
            {/* Show workpiece config if available from workpiece store */}
            {workpiece && (
              <div className="mt-2 p-3 bg-blue-50 rounded-md">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-800">Dimensioni pezzo</span>
                  <button
                    type="button"
                    className="text-xs text-blue-600 hover:text-blue-800"
                    onClick={() => {
                      // Use dimensions from workpiece store
                      updateSettings('depth', Math.min(workpiece.depth, settings.depth));
                    }}
                  >
                    Usa configurazione pezzo
                  </button>
                </div>
                <div className="mt-1 text-xs text-blue-600">
                  {workpiece.width} x {workpiece.height} x {workpiece.depth} mm ({workpiece.material})
                </div>
              </div>
            )}
            
            {/* Library materials dropdown - new section */}
            <div className="mt-2 flex flex-col pt-2 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select from Materials Library
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                onChange={(e) => {
                  const materialId = e.target.value;
                  if (materialId) {
                    const material = predefinedMaterials.find(m => m.name === materialId || m.name === materialId);
                    if (material) {
                      // Map library material to our material types
                      let materialType: MaterialType = 'other';
                      
                      if (material.name.toLowerCase().includes('aluminum')) materialType = 'aluminum';
                      else if (material.name.toLowerCase().includes('steel')) materialType = 'steel';
                      else if (material.name.toLowerCase().includes('wood')) materialType = 'wood';
                      else if (material.name.toLowerCase().includes('plastic')) materialType = 'plastic';
                      else if (material.name.toLowerCase().includes('brass')) materialType = 'brass';
                      else if (material.name.toLowerCase().includes('titanium')) materialType = 'titanium';
                      
                      setSettings(prev => ({
                        ...prev,
                        material: materialType
                      }));
                      
                      setSuccess(`Material "${material.name}" loaded from library`);
                      successTimerRef.current = setTimeout(() => {
                        setSuccess(null);
                      }, 3000);
                    }
                  }
                }}
              >
                <option value="">Select a material</option>
                {predefinedMaterials.map((material, idx) => (
                  <option key={material.name || `material-${idx}`} value={material.name || material.name}>
                    {material.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Update tool section to be machine specific
  const renderToolSection = () => {
    return (
      <div className="mb-6">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('tool')}
        >
          <h3 className="text-lg font-medium text-gray-900">Utensile</h3>
          {expanded.tool ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
        
        {expanded.tool && (
          <div className="mt-3 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo di Utensile
              </label>
              
              {settings.machineType === 'mill' && (
                <select
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={settings.toolType}
                  onChange={(e) => updateSettings('toolType', e.target.value)}
                >
                  <option value="endmill">Fresa a candela</option>
                  <option value="ballnose">Fresa a sfera</option>
                  <option value="drill">Punta da trapano</option>
                  <option value="vbit">Fresa a V</option>
                  <option value="chamfer">Fresa per smussi</option>
                  <option value="threadmill">Fresa per filetti</option>
                  <option value="reamer">Alesatore</option>
                </select>
              )}
              
              {settings.machineType === 'lathe' && (
                <select
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={settings.toolType}
                  onChange={(e) => updateSettings('toolType', e.target.value)}
                >
                  <option value="turning">Utensile per tornitura</option>
                  <option value="facing">Utensile per sfacciatura</option>
                  <option value="boring">Utensile per alesatura</option>
                  <option value="threading">Utensile per filettatura</option>
                  <option value="grooving">Utensile per scanalatura</option>
                  <option value="parting">Utensile per troncatura</option>
                </select>
              )}
              
              {settings.machineType === '3dprinter' && (
                <select
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={settings.toolType}
                  onChange={(e) => updateSettings('toolType', e.target.value)}
                >
                  <option value="standard">Ugello standard</option>
                  <option value="brass">Ugello in ottone</option>
                  <option value="hardened">Ugello rinforzato</option>
                  <option value="ruby">Ugello con rubino</option>
                </select>
              )}
            </div>
            
            {settings.machineType !== '3dprinter' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Diametro Utensile (mm)
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    value={settings.toolDiameter}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value) && value > 0) {
                        updateSettings('toolDiameter', value);
                      }
                    }}
                  />
                </div>
                
                {settings.machineType === 'mill' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Numero di Taglienti
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      value={settings.flutes}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value) && value > 0) {
                          updateSettings('flutes', value);
                        }
                      }}
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Velocità Rotazione (RPM)
                  </label>
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    value={settings.rpm}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value) && value > 0) {
                        updateSettings('rpm', value);
                      }
                    }}
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="coolant"
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    checked={settings.coolant}
                    onChange={(e) => updateSettings('coolant', e.target.checked)}
                  />
                  <label htmlFor="coolant" className="ml-2 block text-sm text-gray-700">
                    Attiva Refrigerante
                  </label>
                </div>
              </>
            )}
            
            {/* Library tools dropdown - new section */}
            <div className="mt-2 flex flex-col pt-2 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Seleziona da Libreria
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                onChange={(e) => {
                  const toolId = e.target.value;
                  if (toolId) {
                    const tool = predefinedTools.find(t => t.name === toolId || t.name === toolId);
                    if (tool) {
                      setSelectedLibraryTool(tool);
                    }
                  }
                }}
                value={selectedLibraryTool?.id || ''}
              >
                <option value="">Seleziona un utensile</option>
                {predefinedTools
                  .filter(tool => {
                    // Filter tools by machine type
                    if (settings.machineType === 'mill') {
                      return ['endmill', 'ballnose', 'drill', 'vbit', 'chamfer', 'threadmill', 'reamer'].includes(tool.type);
                    } else if (settings.machineType === 'lathe') {
                      return ['turning', 'facing', 'boring', 'threading', 'grooving', 'parting'].includes(tool.type);
                    } else {
                      return true; // Show all for 3D printer
                    }
                  })
                  .map((tool, idx) => (
                    <option key={tool.name || `tool-${idx}`} value={tool.name || tool.name}>
                      {tool.name} - {tool.type} {tool.diameter}mm
                    </option>
                  ))}
              </select>
            </div>
            
            {/* Tool library management */}
            <div className="mt-2 flex justify-between items-center pt-2 border-t border-gray-200">
              <span className="text-sm text-gray-600">Carica dalla libreria</span>
              <button
                type="button"
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                onClick={() => {
                  // Simulate loading a tool from library
                  if (settings.machineType === 'mill') {
                    setSettings(prev => ({
                      ...prev,
                      toolType: 'endmill',
                      toolDiameter: 6,
                      flutes: 4,
                      rpm: 12000
                    }));
                  } else if (settings.machineType === 'lathe') {
                    setSettings(prev => ({
                      ...prev,
                      toolType: 'turning',
                      toolDiameter: 12,
                      rpm: 1500
                    }));
                  } else {
                    setSettings(prev => ({
                      ...prev,
                      toolType: 'standard',
                      nozzleDiameter: 0.4
                    }));
                  }
                  setSuccess('Utensile caricato dalla libreria!');
                  successTimerRef.current = setTimeout(() => {
                    setSuccess(null);
                  }, 3000);
                }}
              >
                <Upload size={14} className="mr-1" /> Carica
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render cutting parameters section
  const renderCuttingSection = () => {
    return (
      <div className="mb-6">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('cutting')}
        >
          <h3 className="text-lg font-medium text-gray-900">Parametri di Taglio</h3>
          {expanded.cutting ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
        
        {expanded.cutting && (
          <div className="mt-3 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Profondità di Passata (mm)
              </label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={settings.stepdown}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value) && value > 0) {
                    updateSettings('stepdown', value);
                  }
                }}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Avanzamento (mm/min)
              </label>
              <input
                type="number"
                min="1"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={settings.feedrate}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value > 0) {
                    updateSettings('feedrate', value);
                  }
                }}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Velocità Entrata (mm/min)
              </label>
              <input
                type="number"
                min="1"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={settings.plungerate}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value > 0) {
                    updateSettings('plungerate', value);
                  }
                }}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stepover (% del diametro)
              </label>
              <input
                type="number"
                min="10"
                max="90"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={settings.stepover}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value >= 10 && value <= 90) {
                    updateSettings('stepover', value);
                  }
                }}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Offset Utensile
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={settings.offset}
                onChange={(e) => updateSettings('offset', e.target.value)}
              >
                <option value="outside">Esterno</option>
                <option value="inside">Interno</option>
                <option value="center">Centro</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Direzione di Taglio
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={settings.direction}
                onChange={(e) => updateSettings('direction', e.target.value)}
              >
                <option value="climb">Concordante (Climb)</option>
                <option value="conventional">Discordante (Conventional)</option>
              </select>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="finishingPass"
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                checked={settings.finishingPass}
                onChange={(e) => updateSettings('finishingPass', e.target.checked)}
              />
              <label htmlFor="finishingPass" className="ml-2 block text-sm text-gray-700">
                Aggiungi Passaggio di Finitura
              </label>
            </div>
            
            {settings.finishingPass && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sovrametallo per Finitura (mm)
                </label>
                <input
                  type="number"
                  min="0.05"
                  max="1"
                  step="0.05"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={settings.finishingAllowance}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value) && value > 0) {
                      updateSettings('finishingAllowance', value);
                    }
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render advanced section
  const renderAdvancedSection = () => {
    return (
      <div className="mb-6">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('advanced')}
        >
          <h3 className="text-lg font-medium text-gray-900">Impostazioni Avanzate</h3>
          {expanded.advanced ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
        
        {expanded.advanced && (
          <div className="mt-3 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tolleranza (mm)
              </label>
              <input
                type="number"
                min="0.001"
                step="0.001"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={settings.tolerance}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value) && value > 0) {
                    updateSettings('tolerance', value);
                  }
                }}
              />
            </div>
            
            <div className="p-3 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-800">
                Le impostazioni avanzate permettono un controllo più preciso del percorso utensile, ma possono richiedere una regolazione manuale per risultati ottimali.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render AI section
  const renderAISection = () => {
    return (
      <div className="mb-6">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('ai')}
        >
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Cpu size={18} className="mr-2 text-blue-600" /> Assistenza AI
          </h3>
          {expanded.ai ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
        
        {expanded.ai && (
          <div className="mt-3 space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="useAI"
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                checked={settings.useAI}
                onChange={(e) => updateSettings('useAI', e.target.checked)}
              />
              <label htmlFor="useAI" className="ml-2 block text-sm text-gray-700">
                Attiva suggerimenti AI
              </label>
            </div>
            
            {settings.useAI && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Complessità del Progetto
                  </label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    value={settings.aiDifficulty}
                    onChange={(e) => updateSettings('aiDifficulty', e.target.value)}
                  >
                    <option value="simple">Semplice</option>
                    <option value="moderate">Moderata</option>
                    <option value="complex">Complessa</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ottimizza Per
                  </label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    value={settings.aiOptimize}
                    onChange={(e) => updateSettings('aiOptimize', e.target.value)}
                  >
                    <option value="speed">Velocità di Lavorazione</option>
                    <option value="quality">Qualità Superficiale</option>
                    <option value="balance">Bilanciato</option>
                  </select>
                </div>
                
                {/* Mostra suggerimenti AI se disponibili */}
                <div className="p-3 bg-blue-50 rounded-md">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">Suggerimenti AI</h4>
                  {isAIProcessing ? (
                    <div className="flex justify-center items-center py-4">
                      <svg className="animate-spin h-5 w-5 text-blue-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-sm text-blue-600">Analizzando parametri...</span>
                    </div>
                 ) : aiSuggestions.length > 0 ? (
                  <ul className="space-y-2">
                    {aiSuggestions.map((suggestion, index) => (
                      <li key={index} className="text-sm text-blue-700 flex items-start">
                        <Cpu size={14} className="mt-0.5 mr-2 flex-shrink-0" />
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-blue-600">
                    Attiva i suggerimenti AI per ricevere consigli basati sui tuoi parametri di lavorazione.
                  </p>
                )}
              </div>
              
              <div className="mt-2 p-3 bg-gray-50 rounded-md">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Chiedi all&apos;AI</h4>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full p-2 pr-10 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Fai una domanda sulla lavorazione..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.target as HTMLInputElement).value) {
                        const question = (e.target as HTMLInputElement).value;
                        // Simula risposta AI
                        setIsAIProcessing(true);
                        setTimeout(() => {
                          setAiSuggestions([
                            ...aiSuggestions,
                            `Sulla base della tua domanda "${question}", consiglio di utilizzare una velocità di avanzamento più bassa per il ${settings.material} quando si lavora con profondità superiori a ${settings.depth/2}mm.`
                          ]);
                          setIsAIProcessing(false);
                          (e.target as HTMLInputElement).value = '';
                        }, 1500);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-2 text-blue-600"
                    onClick={() => {
                      // Trigger per far capire all'utente che può fare domande
                      setAiSuggestions([
                        ...aiSuggestions,
                        `Posso aiutarti con consigli sulla lavorazione del ${settings.material}. Prova a chiedermi riguardo le velocità ottimali o le profondità di passata.`
                      ]);
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
  }
  return (
    <div className={`bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white p-4 rounded-md shadow-md ${showFullscreen ? "fixed inset-0 z-50 overflow-auto" : ""}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Generatore Percorso Utensile</h2>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowFullscreen(!showFullscreen)}
            className="p-1 rounded-md hover:bg-gray-100 text-gray-600"
            title={showFullscreen ? "Esci da schermo intero" : "Schermo intero"}
          >
            {showFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          <button
            type="button"
            className="p-1 rounded-md hover:bg-gray-100 text-gray-600"
            title="Aiuto"
            onClick={() => {
              alert("Questo è il generatore di percorsi utensile. Per iniziare, scegli un'operazione e configura i parametri di taglio.");
            }}
          >
            <HelpCircle size={18} />
          </button>
        </div>
      </div>
      {renderOriginSection()}
      {renderMachineSection()}
      {renderOperationSection()}
      {renderMaterialSection()}
      {renderToolSection()}
      {renderLatheSection()}
      {render3DPrinterSection()}
      {renderCuttingSection()}
      {renderAdvancedSection()}
      {renderAISection()}
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 rounded-md flex items-start">
          <AlertTriangle className="text-red-500 mr-2 flex-shrink-0 mt-0.5" size={18} />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-50 rounded-md flex items-start">
          <Check className="text-green-500 mr-2 flex-shrink-0 mt-0.5" size={18} />
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}
      
      <button
        onClick={generateGCode}
        disabled={isGenerating}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center"
      >
        {isGenerating ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generazione in corso...
          </>
        ) : (
          <>
            <Code size={18} className="mr-2" />
            Genera G-Code
          </>
        )}
      </button>
      
      
      
      {/* Aggiungere la possibilità di salvare/caricare configurazioni */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Configurazioni salvate</span>
          <div className="flex space-x-2">
            <button
              type="button"
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
              onClick={() => {
                // Simula il salvataggio della configurazione corrente
                localStorage.setItem('toolpath-config', JSON.stringify(settings));
                setSuccess('Configurazione salvata!');
                successTimerRef.current = setTimeout(() => {
                  setSuccess(null);
                }, 3000);
              }}
            >
              <Save size={14} className="mr-1" /> Salva
            </button>
            <button
              type="button"
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
              onClick={() => {
                // Simula il caricamento di una configurazione salvata
                const savedConfig = localStorage.getItem('toolpath-config');
                if (savedConfig) {
                  setSettings(JSON.parse(savedConfig));
                  setSuccess('Configurazione caricata!');
                  successTimerRef.current = setTimeout(() => {
                    setSuccess(null);
                  }, 3000);
                } else {
                  setError('Nessuna configurazione salvata trovata');
                  setTimeout(() => {
                    setError(null);
                  }, 3000);
                }
              }}
            >
              <Upload size={14} className="mr-1" /> Carica
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToolpathGenerator;