import React, { useState } from 'react';

export interface CycleParameter {
  name: string;
  label: string;
  type: 'number' | 'select' | 'checkbox';
  defaultValue: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
  unit?: string;
  description?: string;
}

export interface CycleTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  controllerTypes: ('fanuc' | 'heidenhain')[];
  parameters: CycleParameter[];
  generateCode: (params: Record<string, any>, controllerType: 'fanuc' | 'heidenhain') => string;
}

interface MachineCyclesProps {
  controllerType: 'fanuc' | 'heidenhain';
  onCycleCodeGenerated: (code: string) => void;
}

const MachineCycles: React.FC<MachineCyclesProps> = ({ controllerType, onCycleCodeGenerated }) => {
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [cycleParams, setCycleParams] = useState<Record<string, any>>({});
  const [previewCode, setPreviewCode] = useState<string>('');

  // Collezione di cicli predefiniti
  const cycleTemplates: CycleTemplate[] = [
    // Ciclo di foratura semplice
    {
      id: 'simple-drilling',
      name: 'Foratura Semplice',
      description: 'Ciclo di foratura base con profondità e avanzamento',
      icon: <DrillIcon />,
      controllerTypes: ['fanuc', 'heidenhain'],
      parameters: [
        {
          name: 'drillDiameter',
          label: 'Diametro Punta',
          type: 'number',
          defaultValue: 8,
          min: 0.1,
          max: 100,
          step: 0.1,
          unit: 'mm',
          description: 'Diametro della punta da utilizzare'
        },
        {
          name: 'depth',
          label: 'Profondità',
          type: 'number',
          defaultValue: 20,
          min: 0.1,
          max: 1000,
          step: 0.1,
          unit: 'mm',
          description: 'Profondità totale di foratura'
        },
        {
          name: 'feedrate',
          label: 'Avanzamento',
          type: 'number',
          defaultValue: 100,
          min: 1,
          max: 10000,
          step: 1,
          unit: 'mm/min',
          description: 'Velocità di avanzamento per la foratura'
        },
        {
          name: 'spindleSpeed',
          label: 'Velocità Mandrino',
          type: 'number',
          defaultValue: 1000,
          min: 1,
          max: 24000,
          step: 100,
          unit: 'RPM',
          description: 'Velocità di rotazione del mandrino'
        },
        {
          name: 'retractHeight',
          label: 'Altezza di Ritorno',
          type: 'number',
          defaultValue: 5,
          min: 0.1,
          max: 100,
          step: 0.1,
          unit: 'mm',
          description: 'Altezza di ritorno della punta dopo la foratura'
        },
        {
          name: 'dwellTime',
          label: 'Tempo di Sosta',
          type: 'number',
          defaultValue: 0,
          min: 0,
          max: 100,
          step: 0.1,
          unit: 'sec',
          description: 'Tempo di sosta sul fondo (0 per nessuna sosta)'
        }
      ],
      generateCode: (params, controllerType) => {
        if (controllerType === 'fanuc') {
          return `(CICLO DI FORATURA SEMPLICE)
(DIAMETRO: ${params.drillDiameter}mm, PROFONDITA: ${params.depth}mm)
G90 G54
G00 X0 Y0
G43 Z${params.retractHeight} H1
S${params.spindleSpeed} M3
G00 X0 Y0
G99 G81 R${params.retractHeight} Z-${params.depth} F${params.feedrate} P${params.dwellTime * 1000}
X10 Y10
X20 Y10
X30 Y10
G80
G00 Z${params.retractHeight}
M5`;
        } else {
          return `; CICLO DI FORATURA SEMPLICE
; DIAMETRO: ${params.drillDiameter}mm, PROFONDITA: ${params.depth}mm
TOOL CALL 1 Z S${params.spindleSpeed}
L Z+${params.retractHeight} R0 FMAX
CYCL DEF 200 FORATURA
  Q200=${params.retractHeight}  ; DISTANZA SICUREZZA
  Q201=-${params.depth}         ; PROFONDITA
  Q206=${params.feedrate}       ; AVANZ. INCREMENTO
  Q202=${params.depth}          ; PROF. INCREMENTO
  Q210=0                        ; TEMPO ATTESA SOPRA
  Q203=+0                       ; COORD. SUPERFICIE
  Q204=50                       ; 2. DIST. SICUREZZA
  Q211=${params.dwellTime}      ; TEMPO ATTESA SOTTO
L X+0 Y+0 R0 FMAX M99
L X+10 Y+10 R0 FMAX M99
L X+20 Y+10 R0 FMAX M99
L X+30 Y+10 R0 FMAX M99
L Z+${params.retractHeight} FMAX
M5`;
        }
      }
    },
    
    // Ciclo di tasca rettangolare
    {
      id: 'rectangular-pocket',
      name: 'Tasca Rettangolare',
      description: 'Ciclo per la fresatura di una tasca rettangolare',
      icon: <PocketIcon />,
      controllerTypes: ['fanuc', 'heidenhain'],
      parameters: [
        {
          name: 'toolDiameter',
          label: 'Diametro Utensile',
          type: 'number',
          defaultValue: 10,
          min: 0.1,
          max: 100,
          step: 0.1,
          unit: 'mm',
          description: 'Diametro della fresa da utilizzare'
        },
        {
          name: 'pocketWidth',
          label: 'Larghezza Tasca',
          type: 'number',
          defaultValue: 50,
          min: 1,
          max: 1000,
          step: 0.1,
          unit: 'mm',
          description: 'Larghezza della tasca lungo l\'asse X'
        },
        {
          name: 'pocketLength',
          label: 'Lunghezza Tasca',
          type: 'number',
          defaultValue: 80,
          min: 1,
          max: 1000,
          step: 0.1,
          unit: 'mm',
          description: 'Lunghezza della tasca lungo l\'asse Y'
        },
        {
          name: 'depth',
          label: 'Profondità',
          type: 'number',
          defaultValue: 15,
          min: 0.1,
          max: 1000,
          step: 0.1,
          unit: 'mm',
          description: 'Profondità totale della tasca'
        },
        {
          name: 'stepdown',
          label: 'Incremento Z',
          type: 'number',
          defaultValue: 5,
          min: 0.1,
          max: 100,
          step: 0.1,
          unit: 'mm',
          description: 'Profondità di passata per ogni incremento'
        },
        {
          name: 'feedrate',
          label: 'Avanzamento',
          type: 'number',
          defaultValue: 800,
          min: 1,
          max: 10000,
          step: 1,
          unit: 'mm/min',
          description: 'Velocità di avanzamento per la fresatura'
        },
        {
          name: 'plungeFeedrate',
          label: 'Avanzamento Entrata',
          type: 'number',
          defaultValue: 300,
          min: 1,
          max: 10000,
          step: 1,
          unit: 'mm/min',
          description: 'Velocità di avanzamento per l\'entrata in Z'
        },
        {
          name: 'spindleSpeed',
          label: 'Velocità Mandrino',
          type: 'number',
          defaultValue: 3000,
          min: 1,
          max: 24000,
          step: 100,
          unit: 'RPM',
          description: 'Velocità di rotazione del mandrino'
        },
        {
          name: 'cornerRadius',
          label: 'Raggio Angoli',
          type: 'number',
          defaultValue: 5,
          min: 0,
          max: 100,
          step: 0.1,
          unit: 'mm',
          description: 'Raggio degli angoli della tasca (0 per angoli vivi)'
        },
        {
          name: 'finishAllowance',
          label: 'Sovrametallo Finitura',
          type: 'number',
          defaultValue: 0.2,
          min: 0,
          max: 10,
          step: 0.05,
          unit: 'mm',
          description: 'Sovrametallo lasciato per la finitura'
        }
      ],
      generateCode: (params, controllerType) => {
        if (controllerType === 'fanuc') {
          return `(CICLO DI TASCA RETTANGOLARE)
(DIMENSIONI: ${params.pocketWidth}x${params.pocketLength}mm, PROFONDITA: ${params.depth}mm)
G90 G54
G00 X0 Y0
G43 Z50 H1
S${params.spindleSpeed} M3
M8
G00 X${-params.pocketWidth/2 + params.toolDiameter/2 + params.finishAllowance} Y${-params.pocketLength/2 + params.toolDiameter/2 + params.finishAllowance}
${Array.from({ length: Math.ceil(params.depth / params.stepdown) }).map((_, i) => {
  const currentDepth = Math.min((i + 1) * params.stepdown, params.depth);
  return `
(PASSATA ${i + 1} - PROFONDITA: ${currentDepth}mm)
G01 Z-${currentDepth} F${params.plungeFeedrate}
G01 X${params.pocketWidth/2 - params.toolDiameter/2 - params.finishAllowance} F${params.feedrate}
G01 Y${params.pocketLength/2 - params.toolDiameter/2 - params.finishAllowance}
G01 X${-params.pocketWidth/2 + params.toolDiameter/2 + params.finishAllowance}
G01 Y${-params.pocketLength/2 + params.toolDiameter/2 + params.finishAllowance}`;
}).join('')}
G00 Z50
M9
M5`;
        } else {
          return `; CICLO DI TASCA RETTANGOLARE
; DIMENSIONI: ${params.pocketWidth}x${params.pocketLength}mm, PROFONDITA: ${params.depth}mm
TOOL CALL 1 Z S${params.spindleSpeed}
L Z+50 R0 FMAX
CYCL DEF 251 TASCA RETTANGOLARE
  Q215=0                        ; TIPO LAVORAZIONE
  Q218=${params.pocketWidth}    ; LUNGHEZZA LATO 1
  Q219=${params.pocketLength}   ; LUNGHEZZA LATO 2
  Q220=${params.cornerRadius}   ; RAGGIO SPIGOLO
  Q368=${params.finishAllowance}; QUOTA LATERALE CONS.
  Q224=0                        ; ROTAZIONE
  Q201=-${params.depth}         ; PROFONDITA
  Q367=0                        ; POSIZIONE TASCA
  Q202=${params.stepdown}       ; PROF. INCREMENTO
  Q207=${params.feedrate}       ; AVANZ. FRESATURA
  Q206=${params.plungeFeedrate} ; AVANZ. INCREMENTO
  Q385=${params.feedrate}       ; AVANZAMENTO FINITURA
  Q200=2                        ; DISTANZA SICUREZZA
  Q203=+0                       ; COORD. SUPERFICIE
  Q204=50                       ; 2. DIST. SICUREZZA
  Q351=+1                       ; MODO FRESATURA
  Q370=1                        ; SOVRAPP. TRAIETT.
L X+0 Y+0 R0 FMAX M3
CYCL CALL
L Z+50 R0 FMAX
M5`;
        }
      }
    },
    
    // Ciclo di contornatura
    {
      id: 'contour-milling',
      name: 'Contornatura',
      description: 'Ciclo per la fresatura di un profilo esterno o interno',
      icon: <ContourIcon />,
      controllerTypes: ['fanuc', 'heidenhain'],
      parameters: [
        {
          name: 'toolDiameter',
          label: 'Diametro Utensile',
          type: 'number',
          defaultValue: 10,
          min: 0.1,
          max: 100,
          step: 0.1,
          unit: 'mm',
          description: 'Diametro della fresa da utilizzare'
        },
        {
          name: 'contourType',
          label: 'Tipo Contorno',
          type: 'select',
          defaultValue: 'external',
          options: [
            { value: 'external', label: 'Esterno (a destra)' },
            { value: 'internal', label: 'Interno (a sinistra)' }
          ],
          description: 'Tipo di contorno: esterno o interno'
        },
        {
          name: 'depth',
          label: 'Profondità',
          type: 'number',
          defaultValue: 10,
          min: 0.1,
          max: 1000,
          step: 0.1,
          unit: 'mm',
          description: 'Profondità totale del contorno'
        },
        {
          name: 'stepdown',
          label: 'Incremento Z',
          type: 'number',
          defaultValue: 5,
          min: 0.1,
          max: 100,
          step: 0.1,
          unit: 'mm',
          description: 'Profondità di passata per ogni incremento'
        },
        {
          name: 'feedrate',
          label: 'Avanzamento',
          type: 'number',
          defaultValue: 800,
          min: 1,
          max: 10000,
          step: 1,
          unit: 'mm/min',
          description: 'Velocità di avanzamento per la fresatura'
        },
        {
          name: 'plungeFeedrate',
          label: 'Avanzamento Entrata',
          type: 'number',
          defaultValue: 300,
          min: 1,
          max: 10000,
          step: 1,
          unit: 'mm/min',
          description: 'Velocità di avanzamento per l\'entrata in Z'
        },
        {
          name: 'spindleSpeed',
          label: 'Velocità Mandrino',
          type: 'number',
          defaultValue: 3000,
          min: 1,
          max: 24000,
          step: 100,
          unit: 'RPM',
          description: 'Velocità di rotazione del mandrino'
        },
        {
          name: 'approachDistance',
          label: 'Distanza Approccio',
          type: 'number',
          defaultValue: 5,
          min: 0,
          max: 100,
          step: 0.1,
          unit: 'mm',
          description: 'Distanza di approccio al contorno'
        },
        {
          name: 'useToolCompensation',
          label: 'Usa Compensazione Utensile',
          type: 'checkbox',
          defaultValue: true,
          description: 'Attiva la compensazione del raggio utensile'
        }
      ],
      generateCode: (params, controllerType) => {
        const compensationCode = params.contourType === 'external' 
          ? (controllerType === 'fanuc' ? 'G42' : 'RR')
          : (controllerType === 'fanuc' ? 'G41' : 'RL');
        
        if (controllerType === 'fanuc') {
          return `(CICLO DI CONTORNATURA ${params.contourType === 'external' ? 'ESTERNA' : 'INTERNA'})
(PROFONDITA: ${params.depth}mm, PASSATE: ${Math.ceil(params.depth / params.stepdown)})
G90 G54
G00 X0 Y0
G43 Z50 H1
S${params.spindleSpeed} M3
M8
${Array.from({ length: Math.ceil(params.depth / params.stepdown) }).map((_, i) => {
  const currentDepth = Math.min((i + 1) * params.stepdown, params.depth);
  return `
(PASSATA ${i + 1} - PROFONDITA: ${currentDepth}mm)
G00 X${-params.approachDistance} Y0
G00 Z5
G01 Z-${currentDepth} F${params.plungeFeedrate}
${params.useToolCompensation ? `${compensationCode} D1` : ''}
G01 X0 Y0 F${params.feedrate}
G01 X50
G01 Y50
G01 X0
G01 Y0
${params.useToolCompensation ? 'G40' : ''}
G00 Z5`;
}).join('')}
G00 Z50
M9
M5`;
        } else {
          return `; CICLO DI CONTORNATURA ${params.contourType === 'external' ? 'ESTERNA' : 'INTERNA'}
; PROFONDITA: ${params.depth}mm, PASSATE: ${Math.ceil(params.depth / params.stepdown)}
TOOL CALL 1 Z S${params.spindleSpeed}
L Z+50 R0 FMAX
${Array.from({ length: Math.ceil(params.depth / params.stepdown) }).map((_, i) => {
  const currentDepth = Math.min((i + 1) * params.stepdown, params.depth);
  return `
; PASSATA ${i + 1} - PROFONDITA: ${currentDepth}mm
L X-${params.approachDistance} Y+0 R0 FMAX
L Z+5 R0 FMAX
L Z-${currentDepth} F${params.plungeFeedrate}
${params.useToolCompensation ? `L ${compensationCode} R${params.toolDiameter/2}` : ''}
L X+0 Y+0 F${params.feedrate}
L X+50
L Y+50
L X+0
L Y+0
${params.useToolCompensation ? 'L R0' : ''}
L Z+5 FMAX`;
}).join('')}
L Z+50 R0 FMAX
M5`;
        }
      }
    },
    
    // Ciclo di filettatura
    {
      id: 'tapping-cycle',
      name: 'Maschiatura',
      description: 'Ciclo di maschiatura per filettature metriche',
      icon: <TapIcon />,
      controllerTypes: ['fanuc', 'heidenhain'],
      parameters: [
        {
          name: 'threadSize',
          label: 'Dimensione Filetto',
          type: 'select',
          defaultValue: 'M8',
          options: [
            { value: 'M3', label: 'M3 (passo 0.5mm)' },
            { value: 'M4', label: 'M4 (passo 0.7mm)' },
            { value: 'M5', label: 'M5 (passo 0.8mm)' },
            { value: 'M6', label: 'M6 (passo 1.0mm)' },
            { value: 'M8', label: 'M8 (passo 1.25mm)' },
            { value: 'M10', label: 'M10 (passo 1.5mm)' },
            { value: 'M12', label: 'M12 (passo 1.75mm)' }
          ],
          description: 'Dimensione della filettatura metrica'
        },
        {
          name: 'depth',
          label: 'Profondità',
          type: 'number',
          defaultValue: 20,
          min: 0.1,
          max: 1000,
          step: 0.1,
          unit: 'mm',
          description: 'Profondità totale della filettatura'
        },
        {
          name: 'spindleSpeed',
          label: 'Velocità Mandrino',
          type: 'number',
          defaultValue: 500,
          min: 1,
          max: 10000,
          step: 10,
          unit: 'RPM',
          description: 'Velocità di rotazione del mandrino'
        },
        {
          name: 'rigidTapping',
          label: 'Maschiatura Rigida',
          type: 'checkbox',
          defaultValue: true,
          description: 'Utilizza la modalità di maschiatura rigida (sincronizzata)'
        },
        {
          name: 'chamferDepth',
          label: 'Profondità Smusso',
          type: 'number',
          defaultValue: 1,
          min: 0,
          max: 10,
          step: 0.1,
          unit: 'mm',
          description: 'Profondità dello smusso all\'imbocco del filetto'
        }
      ],
      generateCode: (params, controllerType) => {
        // Determina il passo in base alla dimensione del filetto
        const threadPitchMap: Record<string, number> = {
          'M3': 0.5,
          'M4': 0.7,
          'M5': 0.8,
          'M6': 1.0,
          'M8': 1.25,
          'M10': 1.5,
          'M12': 1.75
        };
        const pitch = threadPitchMap[params.threadSize];
        const feedrate = params.spindleSpeed * pitch; // Feedrate per maschiatura
        
        if (controllerType === 'fanuc') {
          return `(CICLO DI MASCHIATURA ${params.threadSize})
(PROFONDITA: ${params.depth}mm, PASSO: ${pitch}mm)
G90 G54
G00 X0 Y0
G43 Z50 H1
${params.rigidTapping ? 'M29 S' + params.spindleSpeed + ' (MASCHIATURA RIGIDA)' : 'S' + params.spindleSpeed + ' M3'}
G00 X0 Y0
G00 Z5
G84 R5 Z-${params.depth} F${feedrate} ${params.rigidTapping ? '' : 'P100'}
X10 Y10
X20 Y10
X30 Y10
G80
G00 Z50
M5`;
        } else {
          return `; CICLO DI MASCHIATURA ${params.threadSize}
; PROFONDITA: ${params.depth}mm, PASSO: ${pitch}mm
TOOL CALL 1 Z S${params.spindleSpeed}
L Z+50 R0 FMAX
CYCL DEF 207 MASCHIATURA RIGID
  Q200=2                        ; DISTANZA SICUREZZA
  Q201=-${params.depth}         ; PROFONDITA FILETTO
  Q239=${pitch}                 ; PASSO FILETTATURA
  Q203=+0                       ; COORD. SUPERFICIE
  Q204=50                       ; 2. DIST. SICUREZZA
L X+0 Y+0 R0 FMAX M3
CYCL CALL
L X+10 Y+10 R0 FMAX M99
L X+20 Y+10 R0 FMAX M99
L X+30 Y+10 R0 FMAX M99
L Z+50 R0 FMAX
M5`;
        }
      }
    }
  ];

  // Filtra i cicli in base al tipo di controller
  const availableCycles = cycleTemplates.filter(cycle => 
    cycle.controllerTypes.includes(controllerType)
  );

  // Inizializza i parametri quando viene selezionato un nuovo ciclo
  const handleCycleSelection = (cycleId: string) => {
    setSelectedCycleId(cycleId);
    
    const selectedCycle = cycleTemplates.find(c => c.id === cycleId);
    if (selectedCycle) {
      // Inizializza i parametri con i valori predefiniti
      const initialParams: Record<string, any> = {};
      selectedCycle.parameters.forEach(param => {
        initialParams[param.name] = param.defaultValue;
      });
      setCycleParams(initialParams);
      
      // Genera il codice di anteprima
      const code = selectedCycle.generateCode(initialParams, controllerType);
      setPreviewCode(code);
    }
  };

  // Aggiorna i parametri e rigenera il codice
  const handleParamChange = (paramName: string, value: any) => {
    const newParams = { ...cycleParams, [paramName]: value };
    setCycleParams(newParams);
    
    // Rigenera il codice di anteprima
    const selectedCycle = cycleTemplates.find(c => c.id === selectedCycleId);
    if (selectedCycle) {
      const code = selectedCycle.generateCode(newParams, controllerType);
      setPreviewCode(code);
    }
  };

  // Gestisce l'inserimento del ciclo
  const handleInsertCycle = () => {
    if (previewCode) {
      onCycleCodeGenerated(previewCode);
    }
  };

  return (
    <div className="bg-[#F8FBFF]  dark:bg-gray-600 dark:text-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-200 p-4">
        <h2 className="text-lg font-medium text-gray-900">Cicli di Lavorazione</h2>
        <p className="text-sm text-gray-500">
          Seleziona e configura cicli predefiniti per {controllerType === 'fanuc' ? 'Fanuc' : 'Heidenhain'}
        </p>
      </div>
      
      <div className="list md:grid-cols-2 gap-4 p-4">
        {/* Pannello di selezione dei cicli */}
        <div className="border rounded-md overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b">
            <h3 className="text-md font-medium text-gray-900">Cicli Disponibili</h3>
          </div>
          <div className="p-2 max-h-72 overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {availableCycles.map((cycle) => (
                <button
                  key={cycle.id}
                  className={`p-3 rounded-md text-center hover:bg-gray-50 transition-colors flex flex-col items-center ${
                    selectedCycleId === cycle.id ? 'bg-blue-50 border border-blue-200' : 'border border-gray-200'
                  }`}
                  onClick={() => handleCycleSelection(cycle.id)}
                >
                  <div className="w-10 h-10 flex items-center justify-center mb-2 text-gray-600">
                    {cycle.icon}
                  </div>
                  <span className="text-sm font-medium block">{cycle.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Pannello configurazione e anteprima */}
        <div className="border rounded-md overflow-hidden">
          {selectedCycleId ? (
            <>
              <div className="bg-gray-50 px-4 py-2 border-b">
                <h3 className="text-md font-medium text-gray-900">
                  {cycleTemplates.find(c => c.id === selectedCycleId)?.name || 'Configurazione Ciclo'}
                </h3>
              </div>
              <div className="p-4 max-h-72 overflow-y-auto">
                {cycleTemplates.find(c => c.id === selectedCycleId)?.parameters.map((param) => (
                  <div key={param.name} className="mb-3">
                    <label htmlFor={param.name} className="block text-sm font-medium text-gray-700">
                      {param.label}
                      {param.unit && <span className="text-gray-500 ml-1">({param.unit})</span>}
                    </label>
                    
                    {param.type === 'number' && (
                      <div className="mt-1 flex rounded-md shadow-sm">
                        <input
                          type="number"
                          id={param.name}
                          min={param.min}
                          max={param.max}
                          step={param.step}
                          value={cycleParams[param.name]}
                          onChange={(e) => handleParamChange(param.name, parseFloat(e.target.value))}
                          className="flex-1 min-w-0 block w-full px-3 py-2 rounded-md sm:text-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    )}
                    
                    {param.type === 'select' && (
                      <select
                        id={param.name}
                        value={cycleParams[param.name]}
                        onChange={(e) => handleParamChange(param.name, e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                      >
                        {param.options?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    )}
                    
                    {param.type === 'checkbox' && (
                      <div className="mt-1 flex items-center">
                        <input
                          type="checkbox"
                          id={param.name}
                          checked={cycleParams[param.name]}
                          onChange={(e) => handleParamChange(param.name, e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor={param.name} className="ml-2 block text-sm text-gray-500">
                          {param.description}
                        </label>
                      </div>
                    )}
                    
                    {param.type !== 'checkbox' && param.description && (
                      <p className="mt-1 text-xs text-gray-500">{param.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="p-4 text-center text-gray-500">
              <div className="my-4">
                <CycleIcon className="mx-auto mb-2 h-12 w-12 text-gray-400" />
                <p>Seleziona un ciclo per configurarlo</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Anteprima del codice */}
      {selectedCycleId && (
        <div className="p-4 border-t border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-md font-medium text-gray-900">Anteprima Codice</h3>
            <button
              onClick={handleInsertCycle}
              className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              Inserisci Ciclo
            </button>
          </div>
          <pre className="bg-gray-50 p-3 rounded-md text-sm font-mono overflow-x-auto max-h-60">
            {previewCode}
          </pre>
        </div>
      )}
    </div>
  );
};

// Componenti icona per i cicli
const DrillIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M14 4V20M8 4V7M8 12V15M4 4H20M4 20H20M12 12V15" />
  </svg>
);

const PocketIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <rect x="8" y="8" width="8" height="8" rx="1" />
  </svg>
);

const ContourIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M4 4v16M4 4h16M20 4v8a8 8 0 0 1-8 8H4" />
  </svg>
);

const TapIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <line x1="12" y1="2" x2="12" y2="22" />
    <path d="M8 6h8M8 10h8M10 14h4M7 18h10" />
  </svg>
);

const CycleIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="8" />
    <line x1="12" y1="4" x2="12" y2="12" />
    <line x1="12" y1="12" x2="16" y2="16" />
  </svg>
);

export default MachineCycles;