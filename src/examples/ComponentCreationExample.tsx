import React, { useState } from 'react';
import { useElementsStore } from 'src/store/elementsStore';
import { generateComponentToolpath } from 'src/lib/componentToolpathUtils';

/**
 * Esempio di creazione e generazione di toolpath per un componente 
 * che contiene più forme geometriche (cono e sfera)
 */
const ComponentCreationExample: React.FC = () => {
  const [gcode, setGcode] = useState<string>('');
  const [selectedOffset, setSelectedOffset] = useState<'inside' | 'outside' | 'center'>('center');
  const [selectedDirection, setSelectedDirection] = useState<'climb' | 'conventional'>('climb');
  const { addElement } = useElementsStore();

  // Impostazioni per la generazione del toolpath
  const toolpathSettings = {
    toolDiameter: 6, // mm
    depth: 10, // mm
    stepdown: 1, // mm
    feedrate: 1000, // mm/min
    plungerate: 300, // mm/min
    offset: selectedOffset,
    direction: selectedDirection,
  };

  // Crea un nuovo componente che contiene un cono e una sfera
  const createConeAndSphereComponent = () => {
    // Definisci la posizione del componente
    const componentX = 0;
    const componentY = 0;
    const componentZ = 0;

    // Crea gli elementi (un cono e una sfera)
    const cone = {
      type: 'cone',
      x: -20, // Posizione relativa al componente
      y: 0,
      z: 0,
      radius: 15,
      height: 30,
      color: '#ff5555',
      id: 'cone-' + Date.now()
    };

    const sphere = {
      type: 'sphere',
      x: 20, // Posizione relativa al componente
      y: 0,
      z: 0,
      radius: 15,
      color: '#5555ff',
      id: 'sphere-' + Date.now()
    };

    // Crea il componente completo
    const newComponent = {
      type: 'component',
      x: componentX,
      y: componentY,
      z: componentZ,
      name: 'Cono e Sfera',
      color: '#ffffff',
      id: 'component-' + Date.now(),
      elements: [cone, sphere]
    };

    // Aggiungi il componente alla scena
    addElement(newComponent);

    // Genera anche il G-code per il nuovo componente
    const generatedGCode = generateComponentToolpath(newComponent, toolpathSettings);
    setGcode(generatedGCode);

    return newComponent;
  };

  // Genera un toolpath per un componente esistente
  const generateToolpath = (component: any) => {
    const generatedGCode = generateComponentToolpath(component, {
      ...toolpathSettings,
      offset: selectedOffset,
      direction: selectedDirection
    });
    setGcode(generatedGCode);
  };

  return (
    <div className="p-4 border rounded-lg max-w-[800px] mx-auto my-4">
      <h2 className="text-2xl font-bold mb-4">Esempio di Creazione Componente e Generazione Toolpath</h2>
      
      <div className="flex mb-4">
        <div className="mr-4">
          <p className="mb-2">Offset:</p>
          <select 
            value={selectedOffset} 
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedOffset(e.target.value as any)}
            className="w-[150px] p-2 border rounded"
          >
            <option value="inside">Interno</option>
            <option value="outside">Esterno</option>
            <option value="center">Centro</option>
          </select>
        </div>
        
        <div>
          <p className="mb-2">Direzione:</p>
          <select 
            value={selectedDirection} 
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedDirection(e.target.value as any)}
            className="w-[150px] p-2 border rounded"
          >
            <option value="climb">Concordante</option>
            <option value="conventional">Discordante</option>
          </select>
        </div>
      </div>
      
      <button 
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4 hover:bg-blue-600"
        onClick={() => {
          const component = createConeAndSphereComponent();
          console.log('Componente creato:', component);
        }}
      >
        Crea Componente Cono e Sfera
      </button>
      
      <div className="mt-4">
        <h3 className="text-xl font-semibold mb-2">G-code generato:</h3>
        <div 
          className="border rounded p-3 bg-gray-50 font-mono text-sm max-h-[400px] overflow-y-auto whitespace-pre"
        >
          {gcode || 'Clicca su "Crea Componente Cono e Sfera" per generare il G-code'}
        </div>
      </div>
      
      <p className="mt-4 text-sm text-gray-600">
        Questo esempio mostra come creare un componente che contiene sia un cono che una sfera, 
        e come generare un unico toolpath che tratti entrambe le forme come un unico oggetto.
        Il componente viene aggiunto allo store degli elementi, quindi sarà visibile nel CAD
        se questo componente è integrato nell&apos;applicazione.
      </p>
    </div>
  );
};

export default ComponentCreationExample; 