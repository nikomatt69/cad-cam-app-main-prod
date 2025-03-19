import {
  Component3D,
  calculateComponentDimensions,
  calculateZLevels,
  calculateZLevelIntersection,
  convertToolpathToGcode,
  calculate3DComponentDetails,
  ElementDimensions
} from './unifiedGeometryCalculator';

/**
 * Integra le funzionalità di unifiedGeometryCalculator.ts nel processo di generazione
 * di toolpath per componenti CAD/CAM.
 * 
 * Questa libreria risolve la discrepanza tra la visualizzazione 3D degli oggetti 
 * e il G-code generato, garantendo che le dimensioni siano calcolate correttamente
 * specialmente per forme composte e componenti con operazioni booleane.
 */

/**
 * Converte un elemento generico nel formato Component3D richiesto da unifiedGeometryCalculator
 * @param element Elemento da convertire
 * @param parentPosition Posizione del genitore (opzionale)
 * @returns L'elemento convertito in formato Component3D
 */
export function convertToComponent3D(
  element: any, 
  parentPosition = { x: 0, y: 0, z: 0 }
): Component3D {
  if (!element) {
    throw new Error('Elemento non valido');
  }
  
  // Applica offset del componente genitore
  const position = {
    x: (element.x || 0) + parentPosition.x,
    y: (element.y || 0) + parentPosition.y,
    z: (element.z || 0) + parentPosition.z
  };
  
  // Crea la struttura base Component3D
  const component3D: Component3D = {
    id: element.id || '',
    type: element.type,
    x: position.x,
    y: position.y,
    z: position.z,
    operation: element.operation || 'union'
  };
  
  // Aggiungi proprietà specifiche in base al tipo
  switch (element.type) {
    case 'cube':
    case 'rectangle':
      component3D.width = element.width || 0;
      component3D.height = element.height || 0;
      component3D.depth = element.depth || element.height || 0;
      break;
      
    case 'sphere':
      component3D.radius = element.radius || 0;
      break;
      
    case 'hemisphere':
      component3D.radius = element.radius || 0;
      component3D.direction = element.direction || 'up';
      break;
      
    case 'cylinder':
      component3D.radius = element.radius || 0;
      component3D.height = element.height || 0;
      break;
      
    case 'capsule':
      component3D.radius = element.radius || 0;
      component3D.height = element.height || 0;
      component3D.orientation = element.orientation || 'z';
      break;
      
    case 'cone':
      component3D.radius = element.radius || 0;
      component3D.height = element.height || 0;
      break;
      
    case 'ellipsoid':
      component3D.radiusX = element.radiusX || (element.width ? element.width / 2 : 0);
      component3D.radiusY = element.radiusY || (element.height ? element.height / 2 : 0);
      component3D.radiusZ = element.radiusZ || (element.depth ? element.depth / 2 : 0);
      break;
      
    case 'component':
    case 'group':
      // Gestisce ricorsivamente gli elementi figli
      if (element.elements && Array.isArray(element.elements)) {
        component3D.elements = element.elements.map((child: any) => 
          convertToComponent3D(child, position)
        );
      }
      break;
      
    default:
      // Per tipi sconosciuti, mantieni solo le coordinate di base
      console.warn(`Tipo di elemento non completamente supportato: ${element.type}`);
  }
  
  return component3D;
}

/**
 * Estrae tutti gli elementi da un componente principale
 * @param component Il componente da processare
 * @returns Array di Component3D con posizione relativa al componente
 */
export function extractComponentElements(component: any): Component3D[] {
  if (!component) {
    return [];
  }
  
  // Se è un componente principale, estrai i suoi elementi
  if ((component.type === 'component' || component.type === 'group') && 
      component.elements && Array.isArray(component.elements)) {
    // Converti ogni elemento al formato Component3D
    return component.elements.map((element: any) => 
      convertToComponent3D(element, { 
        x: component.x || 0, 
        y: component.y || 0, 
        z: component.z || 0 
      })
    );
  }
  
  // Se è un elemento singolo, convertilo direttamente
  return [convertToComponent3D(component)];
}

/**
 * Genera un riepilogo delle dimensioni di un componente
 * @param component Componente da analizzare
 * @returns Stringa con le informazioni sul componente
 */
export function generateComponentSummary(component: any): string {
  try {
    // Converti al formato Component3D
    const component3D = convertToComponent3D(component);
    
    // Ottieni i dettagli 3D completi
    const details = calculate3DComponentDetails(component3D);
    
    // Genera il riepilogo come testo
    let summary = `Componente: ${component.name || component.id || 'Senza nome'}\n`;
    summary += `Posizione: (${component.x || 0}, ${component.y || 0}, ${component.z || 0})\n`;
    summary += `Dimensioni: ${details.dimensions.width.toFixed(2)} x ${details.dimensions.depth.toFixed(2)} x ${details.dimensions.height.toFixed(2)} mm\n`;
    summary += `Centro: (${details.dimensions.center.x.toFixed(2)}, ${details.dimensions.center.y.toFixed(2)}, ${details.dimensions.center.z.toFixed(2)})\n`;
    summary += `Volume: ${details.volume.toFixed(2)} cm³\n`;
    summary += `Area superficiale: ${details.surfaceArea.toFixed(2)} cm²\n`;
    
    // Aggiunge elementi contenuti nel componente
    if (component.elements && Array.isArray(component.elements)) {
      summary += `Elementi: ${component.elements.length}\n`;
      
      component.elements.forEach((element: any, index: number) => {
        summary += `  ${index+1}. ${element.type}`;
        if (element.name || element.id) {
          summary += ` (${element.name || element.id})`;
        }
        summary += `\n`;
      });
    }
    
    return summary;
  } catch (error) {
    return `Errore nell'analisi del componente: ${error}`;
  }
}

/**
 * Genera G-code per un componente usando la geometria unificata
 * @param component Componente da processare
 * @param settings Impostazioni di generazione toolpath
 * @returns G-code generato
 */
export function generateUnifiedComponentGcode(component: any, settings: any): string {
  if (!component) {
    return '; Componente non valido\n';
  }
  
  try {
    // Intestazione iniziale del G-code
    let gcode = `; CAD/CAM SYSTEM - Generated Mill G-code\n`;
    gcode += `; Operation: ${settings.operation || 'contour'}\n`;
    gcode += `; Material: ${settings.material || 'aluminum'}\n`;
    gcode += `; Tool: endmill Ø${settings.toolDiameter || 6}mm\n`;
    gcode += `; Date: ${new Date().toISOString()}\n\n`;
    
    // Estrai i dettagli del componente
    const componentName = component.name || component.id || 'Unnamed';
    gcode += `; Toolpath from selected element (component)\n`;
    gcode += `; Component: ${componentName}\n`;
    gcode += `; Position: (${component.x || 0}, ${component.y || 0}, ${component.z || 0})\n`;
    
    // Converti al formato Component3D
    const component3D = convertToComponent3D(component);
    
    // Estrai gli elementi dal componente
    const elements = component3D.elements || [component3D];
    
    if (elements.length === 0) {
      return gcode + '; Nessun elemento trovato nel componente\n';
    }
    
    // Aggiunta per il debug delle dimensioni
    const details = calculate3DComponentDetails(component3D);
    gcode += `; Performing boolean union on ${elements.length} ${elements.length === 1 ? 'mesh' : 'meshes'}\n\n`;
    gcode += `; Unified mesh toolpath\n`;
    gcode += `; Bounding box: width=${details.dimensions.width.toFixed(3)}, height=${details.dimensions.height.toFixed(3)}, depth=${details.dimensions.depth.toFixed(3)}\n`;
    gcode += `; Center: (${details.dimensions.center.x.toFixed(3)}, ${details.dimensions.center.y.toFixed(3)}, ${details.dimensions.center.z.toFixed(3)})\n\n`;
    
    // Preparazione dei parametri per il calcolo toolpath
    const mergedSettings = {
      toolDiameter: settings.toolDiameter || 6,
      feedrate: settings.feedrate || 1000,
      plungerate: settings.plungerate || 500,
      depth: settings.depth || 10,
      stepdown: settings.stepdown || 1.0,
      offset: settings.offset || 'none',
      direction: settings.direction || 'climb',
      safeHeight: settings.safeHeight || 5,
      spindleSpeed: settings.spindleSpeed || 12000,
      includeComments: true
    };
    
    // Calcola i livelli Z per il componente
    const zLevels = calculateZLevels(elements, mergedSettings);
    
    if (zLevels.length === 0) {
      return gcode + '; Nessun livello Z valido trovato per questo componente\n';
    }
    
    // Genera G-code header
    gcode += `G90 ; Absolute positioning\n`;
    gcode += `G21 ; Metric units\n`;
    gcode += `M3 S${mergedSettings.spindleSpeed} ; Start spindle\n`;
    gcode += `M8 ; Coolant on\n`;
    gcode += `G0 Z${mergedSettings.safeHeight} ; Move to safe height\n\n`;
    
    // Genera G-code per ogni livello Z
    for (const zLevel of zLevels) {
      gcode += `; Z Level: ${zLevel.toFixed(3)}\n`;
      
      // Calcola le intersezioni a questo livello Z
      const intersection = calculateZLevelIntersection(elements, zLevel, mergedSettings);
      
      // Se ci sono elementi che intersecano questo livello Z
      if (intersection.elements.length > 0) {
        // Converti il toolpath in G-code
        gcode += convertToolpathToGcode(intersection.toolpath, mergedSettings);
        gcode += '\n';
      } else {
        gcode += `; No elements intersect at this Z level\n\n`;
      }
    }
    
    // Genera G-code footer
    gcode += `; End of program\n`;
    gcode += `G0 Z${mergedSettings.safeHeight} ; Move to safe height\n`;
    gcode += `M9 ; Coolant off\n`;
    gcode += `M5 ; Stop spindle\n`;
    gcode += `M30 ; Program end\n`;
    
    return gcode;
  } catch (error) {
    return `; Errore nella generazione del G-code: ${error}\n`;
  }
}

/**
 * Visualizza il percorso dell'utensile a uno specifico livello Z
 * @param component Componente da analizzare
 * @param zLevel Livello Z specifico
 * @param settings Impostazioni di generazione toolpath
 * @returns Dati dell'intersezione a quel livello Z
 */
export function visualizeToolpathAtZLevel(
  component: any, 
  zLevel: number, 
  settings: any
): any {
  // Converti al formato Component3D
  const component3D = convertToComponent3D(component);
  
  // Estrai gli elementi dal componente
  const elements = component3D.elements || [component3D];
  
  // Preparazione dei parametri per il calcolo toolpath
  const mergedSettings = {
    toolDiameter: settings.toolDiameter || 6,
    feedrate: settings.feedrate || 1000,
    plungerate: settings.plungerate || 500,
    depth: settings.depth || 10,
    stepdown: settings.stepdown || 1.0,
    offset: settings.offset || 'none',
    direction: settings.direction || 'climb',
    safeHeight: settings.safeHeight || 5
  };
  
  // Calcola le intersezioni a questo livello Z
  const intersection = calculateZLevelIntersection(elements, zLevel, mergedSettings);
  
  // Restituisci i dati dell'intersezione per la visualizzazione
  return {
    zLevel,
    elements: intersection.elements,
    boundingBox: intersection.boundingBox,
    toolpath: intersection.toolpath
  };
}

/**
 * Verifica che il toolpath sia coerente con la geometria 3D
 * Utile per debug e controllo qualità
 * @param component Componente da validare
 * @param settings Impostazioni di generazione toolpath
 * @returns Risultati della validazione
 */
export function validateGeometryToolpath(component: any, settings: any): any {
  try {
    // Converti al formato Component3D
    const component3D = convertToComponent3D(component);
    
    // Ottieni i dettagli 3D
    const details = calculate3DComponentDetails(component3D);
    
    // Estrai gli elementi dal componente
    const elements = component3D.elements || [component3D];
    
    // Preparazione dei parametri per il calcolo toolpath
    const mergedSettings = {
      toolDiameter: settings.toolDiameter || 6,
      depth: settings.depth || 10,
      stepdown: settings.stepdown || 1.0
    };
    
    // Calcola i livelli Z per il componente
    const zLevels = calculateZLevels(elements, mergedSettings);
    
    // Verifica che ci siano livelli Z validi
    if (zLevels.length === 0) {
      return {
        valid: false,
        errors: ['Nessun livello Z valido trovato per questo componente'],
        dimensions: details.dimensions
      };
    }
    
    // Verifica che le dimensioni siano corrette
    const dimensions = details.dimensions;
    const expectedHeight = dimensions.maxZ - dimensions.minZ;
    const expectedWidth = dimensions.maxX - dimensions.minX;
    const expectedDepth = dimensions.maxY - dimensions.minY;
    
    // Verifica se le dimensioni calcolate sono coerenti
    const errors = [];
    
    if (Math.abs(expectedHeight - dimensions.height) > 0.001) {
      errors.push(`Altezza non coerente: attesa ${expectedHeight.toFixed(3)}, calcolata ${dimensions.height.toFixed(3)}`);
    }
    
    if (Math.abs(expectedWidth - dimensions.width) > 0.001) {
      errors.push(`Larghezza non coerente: attesa ${expectedWidth.toFixed(3)}, calcolata ${dimensions.width.toFixed(3)}`);
    }
    
    if (Math.abs(expectedDepth - dimensions.depth) > 0.001) {
      errors.push(`Profondità non coerente: attesa ${expectedDepth.toFixed(3)}, calcolata ${dimensions.depth.toFixed(3)}`);
    }
    
    // Verifica le intersezioni ai livelli Z
    const intersectionSummary = zLevels.map(zLevel => {
      const intersection = calculateZLevelIntersection(elements, zLevel, mergedSettings);
      return {
        zLevel,
        elementsCount: intersection.elements.length,
        hasToolpath: intersection.toolpath.length > 0
      };
    });
    
    return {
      valid: errors.length === 0,
      errors,
      dimensions,
      zLevelCount: zLevels.length,
      intersectionSummary,
      volumeCm3: details.volume,
      surfaceAreaCm2: details.surfaceArea
    };
  } catch (error) {
    return {
      valid: false,
      errors: [`Errore nella validazione: ${error}`]
    };
  }
}
