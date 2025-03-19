import React from 'react';
import ComponentCreationExample from './ComponentCreationExample';

/**
 * Questo file mostra come integrare l'esempio di creazione componente 
 * all'interno dell'applicazione principale.
 */
const ComponentCreationExampleUsage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">CAD/CAM - Creazione di Componenti</h1>
      
      <div className="mb-6">
        <p className="mb-4">
          Questo esempio mostra come creare componenti personalizzati che combinano
          più forme geometriche e generare toolpath unificati per essi.
        </p>
        
        <p className="mb-4">
          Il sistema ora è in grado di:
        </p>
        
        <ul className="list-disc pl-6 mb-4">
          <li>Creare componenti composti da più elementi geometrici</li>
          <li>Trattare il componente come un unico oggetto durante la generazione del toolpath</li>
          <li>Ottimizzare il percorso utensile per minimizzare i movimenti rapidi</li>
          <li>Gestire correttamente diversi tipi di elementi allinterno dello stesso componente</li>
        </ul>
      </div>
      
      {/* Integrazione del componente di esempio */}
      <ComponentCreationExample />
      
      <div className="mt-10 p-4 bg-gray-50 rounded-md">
        <h2 className="text-xl font-semibold mb-3">Come integrare questo componente</h2>
        
        <p className="mb-2">Per utilizzare questa funzionalità nell applicazione principale:</p>
        
        <ol className="list-decimal pl-6">
          <li className="mb-2">
            Importa <code className="bg-gray-200 px-1 rounded">generateComponentToolpath</code> 
            da <code className="bg-gray-200 px-1 rounded">src/lib/componentToolpathUtils</code>
          </li>
          <li className="mb-2">
            Crea un componente con un array di elementi nel campo <code className="bg-gray-200 px-1 rounded">elements</code>
          </li>
          <li className="mb-2">
            Passa il componente e le impostazioni di toolpath alla funzione <code className="bg-gray-200 px-1 rounded">generateComponentToolpath</code>
          </li>
          <li>
            Il sistema genererà un G-code ottimizzato che tratta tutti gli elementi come ununica geometria
          </li>
        </ol>
      </div>
    </div>
  );
};

export default ComponentCreationExampleUsage; 