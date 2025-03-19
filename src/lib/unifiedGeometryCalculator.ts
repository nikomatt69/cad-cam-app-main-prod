import * as THREE from 'three';

/**
 * Funzioni di utilità per calcolare le quote della geometria unificata
 * di più elementi prima di generare G-code
 */

/**
 * Interfaccia per le dimensioni di un elemento
 */
export interface ElementDimensions {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  width: number;
  height: number;
  depth: number;
  center: { x: number, y: number, z: number };
}

/**
 * Interfaccia per le quote di un'intersezione a un dato livello Z
 */
export interface ZLevelIntersection {
  zLevel: number;
  elements: ElementIntersection[];
  boundingBox: { 
    minX: number; 
    maxX: number; 
    minY: number; 
    maxY: number;
  };
  toolpath: ToolpathSegment[];
}

/**
 * Interfaccia per l'intersezione di un elemento a uno specifico livello Z
 */
export interface ElementIntersection {
  elementId: string;
  elementType: string;
  center: { x: number, y: number };
  shape: 'circle' | 'ellipse' | 'rectangle' | 'polygon';
  parameters: any;  // Specifici per il tipo di forma (radiusX, radiusY, width, height, punti del poligono, ecc.)
  // Aggiunto per supportare le operazioni booleane
  operation?: 'union' | 'subtract' | 'intersect';
}

/**
 * Interfaccia per un segmento di toolpath
 */
export interface ToolpathSegment {
  type: 'linear' | 'circular' | 'rapid';
  startPoint: { x: number, y: number, z: number };
  endPoint: { x: number, y: number, z: number };
  // Per percorsi circolari
  center?: { x: number, y: number };
  radius?: number;
  clockwise?: boolean;
  // Aggiunto per supportare la velocità di avanzamento
  feedrate?: number;
}

/**
 * Interfaccia per un componente 3D
 */
export interface Component3D {
  id?: string;
  type: string;
  x: number;
  y: number;
  z: number;
  width?: number;
  height?: number;
  depth?: number;
  radius?: number;
  radiusX?: number;
  radiusY?: number;
  radiusZ?: number;
  direction?: 'up' | 'down';
  orientation?: 'x' | 'y' | 'z';
  elements?: Component3D[];
  operation?: 'union' | 'subtract' | 'intersect';
}

/**
 * Analizza un componente per determinare le dimensioni complessive
 * @param component Il componente da analizzare
 * @returns Le dimensioni del componente
 */
export function calculateComponentDimensions(component: Component3D): ElementDimensions {
  // Se il componente ha elementi, calcola le dimensioni di tutti gli elementi con operazioni booleane
  if (component.elements && Array.isArray(component.elements) && component.elements.length > 0) {
    // Per ogni elemento, calcola le dimensioni
    const elementDimensions = component.elements.map((element: Component3D) => {
      // Aggiungi la posizione del componente alla posizione dell'elemento
      const adjustedElement = {
        ...element,
        x: (element.x || 0) + (component.x || 0),
        y: (element.y || 0) + (component.y || 0),
        z: (element.z || 0) + (component.z || 0)
      };
      return calculateElementDimensions(adjustedElement);
    });
    
    // Combina le dimensioni degli elementi in base alle operazioni booleane
    return combineElementDimensions(elementDimensions);
  }
  
  // Se non ci sono elementi, calcola le dimensioni del componente stesso
  return calculateElementDimensions(component);
}

/**
 * Calcola le dimensioni di un singolo elemento
 * @param element L'elemento da analizzare
 * @returns Le dimensioni dell'elemento
 */
export function calculateElementDimensions(element: Component3D): ElementDimensions {
  if (!element) {
    throw new Error('Elemento non valido');
  }
  
  let bbox: ElementDimensions;
  
  switch (element.type) {
    case 'cube':
    case 'rectangle': {
      const width = element.width || 0;
      const height = element.height || 0;
      const depth = element.depth || height || 0;
      
      bbox = {
        minX: element.x - width / 2,
        maxX: element.x + width / 2,
        minY: element.y - (element.depth || height) / 2,
        maxY: element.y + (element.depth || height) / 2,
        minZ: element.z - height / 2,
        maxZ: element.z + height / 2,
        width: width,
        height: height,
        depth: depth,
        center: { x: element.x, y: element.y, z: element.z }
      };
      break;
    }
      
    case 'sphere': {
      const radius = element.radius || 0;
      
      bbox = {
        minX: element.x - radius,
        maxX: element.x + radius,
        minY: element.y - radius,
        maxY: element.y + radius,
        minZ: element.z - radius,
        maxZ: element.z + radius,
        width: radius * 2,
        height: radius * 2,
        depth: radius * 2,
        center: { x: element.x, y: element.y, z: element.z }
      };
      break;
    }
      
    case 'hemisphere': {
      const radius = element.radius || 0;
      const direction = element.direction || 'up';
      
      if (direction === 'up') {
        bbox = {
          minX: element.x - radius,
          maxX: element.x + radius,
          minY: element.y - radius,
          maxY: element.y + radius,
          minZ: element.z,
          maxZ: element.z + radius,
          width: radius * 2,
          height: radius,
          depth: radius * 2,
          center: { x: element.x, y: element.y, z: element.z + radius / 2 }
        };
      } else {
        bbox = {
          minX: element.x - radius,
          maxX: element.x + radius,
          minY: element.y - radius,
          maxY: element.y + radius,
          minZ: element.z - radius,
          maxZ: element.z,
          width: radius * 2,
          height: radius,
          depth: radius * 2,
          center: { x: element.x, y: element.y, z: element.z - radius / 2 }
        };
      }
      break;
    }
      
    case 'cylinder': {
      const radius = element.radius || 0;
      const height = element.height || 0;
      
      bbox = {
        minX: element.x - radius,
        maxX: element.x + radius,
        minY: element.y - radius,
        maxY: element.y + radius,
        minZ: element.z - height / 2,
        maxZ: element.z + height / 2,
        width: radius * 2,
        height: height,
        depth: radius * 2,
        center: { x: element.x, y: element.y, z: element.z }
      };
      break;
    }
    
    case 'capsule': {
      const radius = element.radius || 0;
      const height = element.height || 0;
      const orientation = element.orientation || 'z';
      
      if (orientation === 'z') {
        bbox = {
          minX: element.x - radius,
          maxX: element.x + radius,
          minY: element.y - radius,
          maxY: element.y + radius,
          minZ: element.z - height / 2 - radius,
          maxZ: element.z + height / 2 + radius,
          width: radius * 2,
          height: height + radius * 2, // Corrected to include hemispherical caps
          depth: radius * 2,
          center: { x: element.x, y: element.y, z: element.z }
        };
      } else if (orientation === 'x') {
        bbox = {
          minX: element.x - height / 2 - radius,
          maxX: element.x + height / 2 + radius,
          minY: element.y - radius,
          maxY: element.y + radius,
          minZ: element.z - radius,
          maxZ: element.z + radius,
          width: height + radius * 2, // Corrected to include hemispherical caps
          height: radius * 2,
          depth: radius * 2,
          center: { x: element.x, y: element.y, z: element.z }
        };
      } else { // y orientation
        bbox = {
          minX: element.x - radius,
          maxX: element.x + radius,
          minY: element.y - height / 2 - radius,
          maxY: element.y + height / 2 + radius,
          minZ: element.z - radius,
          maxZ: element.z + radius,
          width: radius * 2,
          height: radius * 2,
          depth: height + radius * 2, // Corrected to include hemispherical caps
          center: { x: element.x, y: element.y, z: element.z }
        };
      }
      break;
    }
    
    case 'cone': {
      const radius = element.radius || 0;
      const height = element.height || 0;
      
      bbox = {
        minX: element.x - radius,
        maxX: element.x + radius,
        minY: element.y - radius,
        maxY: element.y + radius,
        minZ: element.z - height / 2,
        maxZ: element.z + height / 2,
        width: radius * 2,
        height: height,
        depth: radius * 2,
        center: { x: element.x, y: element.y, z: element.z }
      };
      break;
    }
    
    case 'ellipsoid': {
      const radiusX = element.radiusX || (element.width ? element.width / 2 : 0);
      const radiusY = element.radiusY || (element.height ? element.height / 2 : 0);
      const radiusZ = element.radiusZ || (element.depth ? element.depth / 2 : 0);
      
      bbox = {
        minX: element.x - radiusX,
        maxX: element.x + radiusX,
        minY: element.y - radiusY,
        maxY: element.y + radiusY,
        minZ: element.z - radiusZ,
        maxZ: element.z + radiusZ,
        width: radiusX * 2,
        height: radiusZ * 2,
        depth: radiusY * 2,
        center: { x: element.x, y: element.y, z: element.z }
      };
      break;
    }
      
    // Aggiungere altri tipi di elementi secondo necessità
    
    default: {
      // Per tipi sconosciuti, creare un piccolo bbox attorno al centro
      bbox = {
        minX: element.x - 0.1,
        maxX: element.x + 0.1,
        minY: element.y - 0.1,
        maxY: element.y + 0.1,
        minZ: element.z - 0.1,
        maxZ: element.z + 0.1,
        width: 0.2,
        height: 0.2,
        depth: 0.2,
        center: { x: element.x, y: element.y, z: element.z }
      };
    }
  }
  
  return bbox;
}

/**
 * Combina più dimensioni di elementi in un'unica dimensione complessiva
 * tenendo conto delle operazioni booleane
 * @param dimensions Array di dimensioni da combinare
 * @returns Dimensioni combinate
 */
export function combineElementDimensions(dimensions: ElementDimensions[]): ElementDimensions {
  if (!dimensions || dimensions.length === 0) {
    throw new Error('Nessuna dimensione fornita');
  }
  
  // Inizializza con la prima dimensione
  const combined: ElementDimensions = { ...dimensions[0] };
  
  // Combina con le altre dimensioni
  for (let i = 1; i < dimensions.length; i++) {
    const dim = dimensions[i];
    
    // Operazione di unione (default)
    combined.minX = Math.min(combined.minX, dim.minX);
    combined.maxX = Math.max(combined.maxX, dim.maxX);
    combined.minY = Math.min(combined.minY, dim.minY);
    combined.maxY = Math.max(combined.maxY, dim.maxY);
    combined.minZ = Math.min(combined.minZ, dim.minZ);
    combined.maxZ = Math.max(combined.maxZ, dim.maxZ);
  }
  
  // Ricalcola le dimensioni
  combined.width = combined.maxX - combined.minX;
  combined.height = combined.maxZ - combined.minZ;
  combined.depth = combined.maxY - combined.minY;
  
  // Ricalcola il centro
  combined.center = {
    x: (combined.minX + combined.maxX) / 2,
    y: (combined.minY + combined.maxY) / 2,
    z: (combined.minZ + combined.maxZ) / 2
  };
  
  return combined;
}

/**
 * Calcola gli Z levels che intercettano tutti gli elementi
 * @param elements Array di elementi
 * @param settings Impostazioni del toolpath
 * @returns Array di livelli Z che intercettano gli elementi
 */
export function calculateZLevels(elements: Component3D[], settings: any): number[] {
  if (!elements || elements.length === 0) {
    return [];
  }
  
  // Calcola le dimensioni complessive
  const dimensions = combineElementDimensions(elements.map(e => calculateElementDimensions(e)));
  
  // Determina il range Z e il numero di livelli
  const topZ = dimensions.maxZ;
  const bottomZ = dimensions.minZ;
  
  // Se non sono specificate profondità e stepdown, utilizza l'intera altezza dell'oggetto
  const { depth: requestedDepth, stepdown } = settings;
  const depth = requestedDepth !== undefined ? Math.min(requestedDepth, topZ - bottomZ) : topZ - bottomZ;
  const actualStepdown = stepdown || 1.0; // Default di 1mm se non specificato
  
  // Calcola i limiti effettivi basati sulla profondità richiesta
  const minTargetZ = Math.max(bottomZ, topZ - depth);
  
  // Genera i livelli Z con maggiore precisione
  const zLevels: number[] = [];
  let currentZ = topZ;
  
  while (currentZ >= minTargetZ) {
    zLevels.push(currentZ);
    // Assicura che non si creino livelli troppo vicini tra loro
    const nextZ = Math.max(minTargetZ, currentZ - actualStepdown);
    
    // Se il prossimo livello è troppo vicino a quello corrente o abbiamo raggiunto il minimo, termina
    if (Math.abs(nextZ - currentZ) < 0.001 || nextZ >= currentZ) {
      break;
    }
    
    currentZ = nextZ;
  }
  
  // Aggiungi l'ultimo livello se necessario e non è già incluso
  if (zLevels.length === 0 || Math.abs(zLevels[zLevels.length - 1] - minTargetZ) > 0.001) {
    zLevels.push(minTargetZ);
  }
  
  return zLevels;
}

/**
 * Calcola le intersezioni di tutti gli elementi a ogni livello Z
 * @param elements Array di elementi
 * @param zLevels Array di livelli Z
 * @param settings Impostazioni del toolpath
 * @returns Array di intersezioni per ogni livello Z
 */
export function calculateAllIntersections(elements: Component3D[], zLevels: number[], settings: any): ZLevelIntersection[] {
  return zLevels.map(zLevel => calculateZLevelIntersection(elements, zLevel, settings));
}

/**
 * Calcola le intersezioni degli elementi a uno specifico livello Z
 * Migliorata per gestire forme composite e operazioni booleane
 * @param elements Array di elementi
 * @param zLevel Livello Z
 * @param settings Impostazioni del toolpath
 * @returns Intersezione al livello Z specificato
 */
export function calculateZLevelIntersection(elements: Component3D[], zLevel: number, settings: any): ZLevelIntersection {
  // Array per memorizzare le intersezioni
  const elementIntersections: ElementIntersection[] = [];
  
  // Elabora prima gli elementi base, poi applica le operazioni booleane
  elements.forEach(element => {
    processElementForZLevel(element, zLevel, elementIntersections);
  });
  
  // Applica operazioni booleane se necessario
  const processedIntersections = applyBooleanOperations(elementIntersections);
  
  // Calcola il bounding box complessivo
  const boundingBox = calculateIntersectionsBoundingBox(processedIntersections);
  
  // Genera i segmenti di toolpath ottimizzati
  const toolpath = generateOptimizedToolpath(processedIntersections, zLevel, settings);
  
  return {
    zLevel,
    elements: processedIntersections,
    boundingBox,
    toolpath
  };
}

/**
 * Elabora un elemento e le sue sottostrutture per un dato livello Z
 * @param element Elemento da processare
 * @param zLevel Livello Z
 * @param intersections Array di intersezioni da popolare
 */
function processElementForZLevel(element: Component3D, zLevel: number, intersections: ElementIntersection[]): void {
  // Se l'elemento ha sotto-elementi, processali ricorsivamente
  if (element.elements && element.elements.length > 0) {
    element.elements.forEach(subElement => {
      // Crea una copia dell'elemento con posizione relativa al padre
      const adjustedElement = {
        ...subElement,
        x: (subElement.x || 0) + (element.x || 0),
        y: (subElement.y || 0) + (element.y || 0),
        z: (subElement.z || 0) + (element.z || 0),
        // Mantieni l'operazione booleana se presente
        operation: subElement.operation || 'union'
      };
      
      processElementForZLevel(adjustedElement, zLevel, intersections);
    });
    return;
  }
  
  // Altrimenti calcola l'intersezione diretta
  const intersection = calculateElementZLevelIntersection(element, zLevel);
  if (intersection) {
    // Aggiungi l'operazione booleana se presente nell'elemento
    if (element.operation) {
      intersection.operation = element.operation;
    }
    intersections.push(intersection);
  }
}

/**
 * Applica operazioni booleane alle intersezioni
 * @param intersections Intersezioni da processare
 * @returns Intersezioni dopo le operazioni booleane
 */
function applyBooleanOperations(intersections: ElementIntersection[]): ElementIntersection[] {
  // Per implementazioni complete, qui si effettuerebbero le vere operazioni booleane
  // Questa è una versione semplificata che mantiene tutte le intersezioni
  // In una vera implementazione, bisognerebbe calcolare unioni, sottrazioni, ecc.
  
  return intersections;
}

/**
 * Calcola il bounding box complessivo delle intersezioni
 * @param intersections Intersezioni da analizzare
 * @returns Bounding box complessivo
 */
function calculateIntersectionsBoundingBox(intersections: ElementIntersection[]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  const boundingBox = {
    minX: Number.MAX_VALUE,
    maxX: Number.MIN_VALUE,
    minY: Number.MAX_VALUE,
    maxY: Number.MIN_VALUE
  };
  
  // Se non ci sono intersezioni, restituisci un bounding box vuoto
  if (intersections.length === 0) {
    return {
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0
    };
  }
  
  // Aggiorna il bounding box in base alle intersezioni
  intersections.forEach(intersection => {
    switch (intersection.shape) {
      case 'circle': {
        const radius = intersection.parameters.radius;
        boundingBox.minX = Math.min(boundingBox.minX, intersection.center.x - radius);
        boundingBox.maxX = Math.max(boundingBox.maxX, intersection.center.x + radius);
        boundingBox.minY = Math.min(boundingBox.minY, intersection.center.y - radius);
        boundingBox.maxY = Math.max(boundingBox.maxY, intersection.center.y + radius);
        break;
      }
      case 'ellipse': {
        const radiusX = intersection.parameters.radiusX;
        const radiusY = intersection.parameters.radiusY;
        boundingBox.minX = Math.min(boundingBox.minX, intersection.center.x - radiusX);
        boundingBox.maxX = Math.max(boundingBox.maxX, intersection.center.x + radiusX);
        boundingBox.minY = Math.min(boundingBox.minY, intersection.center.y - radiusY);
        boundingBox.maxY = Math.max(boundingBox.maxY, intersection.center.y + radiusY);
        break;
      }
      case 'rectangle': {
        const width = intersection.parameters.width;
        const height = intersection.parameters.height;
        boundingBox.minX = Math.min(boundingBox.minX, intersection.center.x - width / 2);
        boundingBox.maxX = Math.max(boundingBox.maxX, intersection.center.x + width / 2);
        boundingBox.minY = Math.min(boundingBox.minY, intersection.center.y - height / 2);
        boundingBox.maxY = Math.max(boundingBox.maxY, intersection.center.y + height / 2);
        break;
      }
      case 'polygon': {
        const points = intersection.parameters.points;
        points.forEach((point: number[]) => {
          boundingBox.minX = Math.min(boundingBox.minX, point[0]);
          boundingBox.maxX = Math.max(boundingBox.maxX, point[0]);
          boundingBox.minY = Math.min(boundingBox.minY, point[1]);
          boundingBox.maxY = Math.max(boundingBox.maxY, point[1]);
        });
        break;
      }
    }
  });
  
  return boundingBox;
}

/**
 * Calcola l'intersezione di un elemento a uno specifico livello Z
 * Migliorato per essere più preciso e gestire correttamente tutte le forme
 * @param element Elemento da intersecare
 * @param zLevel Livello Z
 * @returns Intersezione dell'elemento (o null se non interseca)
 */
export function calculateElementZLevelIntersection(element: Component3D, zLevel: number): ElementIntersection | null {
  if (!element) {
    return null;
  }
  
  let intersection: ElementIntersection | null = null;
  
  switch (element.type) {
    case 'cube':
    case 'rectangle': {
      const height = element.height || 0;
      // Verifica se il livello Z interseca il cubo/rettangolo
      if (zLevel >= element.z - height / 2 && zLevel <= element.z + height / 2) {
        const width = element.width || 0;
        const depth = element.depth || element.height || 0;
        
        intersection = {
          elementId: element.id || '',
          elementType: element.type,
          center: { x: element.x, y: element.y },
          shape: 'rectangle',
          parameters: {
            width,
            height: depth
          }
        };
      }
      break;
    }
      
    case 'sphere': {
      const radius = element.radius || 0;
      const distanceFromCenter = Math.abs(zLevel - element.z);
      
      // Verifica se il livello Z interseca la sfera
      if (distanceFromCenter <= radius) {
        // Calcola il raggio della sezione circolare a questo livello Z
        const radiusAtZ = Math.sqrt(Math.max(0, Math.pow(radius, 2) - Math.pow(distanceFromCenter, 2)));
        
        intersection = {
          elementId: element.id || '',
          elementType: element.type,
          center: { x: element.x, y: element.y },
          shape: 'circle',
          parameters: {
            radius: radiusAtZ
          }
        };
      }
      break;
    }
      
    case 'hemisphere': {
      const radius = element.radius || 0;
      const direction = element.direction || 'up';
      
      // Determina il centro e i limiti dell'emisfero
      const hemisphereCenter = direction === 'up' ? element.z : element.z - radius;
      const hemisphereTopZ = direction === 'up' ? element.z + radius : element.z;
      const hemisphereBottomZ = direction === 'up' ? element.z : element.z - radius;
      
      // Verifica se il livello Z interseca l'emisfero
      if (zLevel >= hemisphereBottomZ && zLevel <= hemisphereTopZ) {
        const distanceFromCenter = Math.abs(zLevel - hemisphereCenter);
        
        // Calcola il raggio della sezione circolare a questo livello Z
        const radiusAtZ = Math.sqrt(Math.max(0, Math.pow(radius, 2) - Math.pow(distanceFromCenter, 2)));
        
        intersection = {
          elementId: element.id || '',
          elementType: element.type,
          center: { x: element.x, y: element.y },
          shape: 'circle',
          parameters: {
            radius: radiusAtZ
          }
        };
      }
      break;
    }
      
    case 'cylinder': {
      const height = element.height || 0;
      const radius = element.radius || 0;
      
      // Verifica se il livello Z interseca il cilindro
      if (zLevel >= element.z - height / 2 && zLevel <= element.z + height / 2) {
        intersection = {
          elementId: element.id || '',
          elementType: element.type,
          center: { x: element.x, y: element.y },
          shape: 'circle',
          parameters: {
            radius
          }
        };
      }
      break;
    }
    
    case 'cone': {
      const height = element.height || 0;
      const radius = element.radius || 0;
      
      // Verifica se il livello Z interseca il cono
      if (zLevel >= element.z - height / 2 && zLevel <= element.z + height / 2) {
        // Calcola il raggio della sezione circolare a questo livello Z
        const topZ = element.z + height / 2;
        const ratio = (topZ - zLevel) / height;
        const radiusAtZ = radius * (1 - ratio);
        
        intersection = {
          elementId: element.id || '',
          elementType: element.type,
          center: { x: element.x, y: element.y },
          shape: 'circle',
          parameters: {
            radius: radiusAtZ
          }
        };
      }
      break;
    }
    
    case 'capsule': {
      const radius = element.radius || 0;
      const height = element.height || 0;
      const orientation = element.orientation || 'z';
      
      if (orientation === 'z') {
        // Capsule orientata in Z
        const capsuleTopZ = element.z + height / 2 + radius;
        const capsuleBottomZ = element.z - height / 2 - radius;
        const cylinderTopZ = element.z + height / 2;
        const cylinderBottomZ = element.z - height / 2;
        
        // Verifica se il livello Z interseca la capsula
        if (zLevel >= capsuleBottomZ && zLevel <= capsuleTopZ) {
          let radiusAtZ = radius;
          
          // Determina in quale parte della capsula si trova il livello Z
          if (zLevel > cylinderTopZ) {
            // Emisfero superiore
            const distFromTop = capsuleTopZ - zLevel;
            radiusAtZ = Math.sqrt(Math.max(0, Math.pow(radius, 2) - Math.pow(radius - distFromTop, 2)));
          } else if (zLevel < cylinderBottomZ) {
            // Emisfero inferiore
            const distFromBottom = zLevel - capsuleBottomZ;
            radiusAtZ = Math.sqrt(Math.max(0, Math.pow(radius, 2) - Math.pow(radius - distFromBottom, 2)));
          }
          
          intersection = {
            elementId: element.id || '',
            elementType: element.type,
            center: { x: element.x, y: element.y },
            shape: 'circle',
            parameters: {
              radius: radiusAtZ
            }
          };
        }
      } else if (orientation === 'x') {
        // Per capsules orientate in X, calcola l'ellisse di intersezione a questo livello Z
        // Solo se il livello Z è dentro il raggio della capsula
        if (zLevel >= element.z - radius && zLevel <= element.z + radius) {
          const distanceFromCenter = Math.abs(zLevel - element.z);
          const radiusY = Math.sqrt(Math.max(0, Math.pow(radius, 2) - Math.pow(distanceFromCenter, 2)));
          
          // Per una capsula in X, l'ellisse ha radiusX = height/2 + radius
          intersection = {
            elementId: element.id || '',
            elementType: element.type,
            center: { x: element.x, y: element.y },
            shape: 'ellipse',
            parameters: {
              radiusX: height / 2 + radius,
              radiusY: radiusY
            }
          };
        }
      } else { // orientation === 'y'
        // Per capsules orientate in Y, calcola l'ellisse di intersezione
        if (zLevel >= element.z - radius && zLevel <= element.z + radius) {
          const distanceFromCenter = Math.abs(zLevel - element.z);
          const radiusX = Math.sqrt(Math.max(0, Math.pow(radius, 2) - Math.pow(distanceFromCenter, 2)));
          
          // Per una capsula in Y, l'ellisse ha radiusY = height/2 + radius
          intersection = {
            elementId: element.id || '',
            elementType: element.type,
            center: { x: element.x, y: element.y },
            shape: 'ellipse',
            parameters: {
              radiusX: radiusX,
              radiusY: height / 2 + radius
            }
          };
        }
      }
      break;
    }
    
    case 'ellipsoid': {
      const radiusX = element.radiusX || (element.width ? element.width / 2 : 0);
      const radiusY = element.radiusY || (element.height ? element.height / 2 : 0);
      const radiusZ = element.radiusZ || (element.depth ? element.depth / 2 : 0);
      
      // Verifica se il livello Z interseca l'ellissoide
      if (zLevel >= element.z - radiusZ && zLevel <= element.z + radiusZ) {
        // Calcola il fattore di scala per l'ellisse a questo livello Z
        const zRatio = Math.abs(zLevel - element.z) / radiusZ;
        const ellipseScale = Math.sqrt(1 - Math.pow(zRatio, 2));
        
        // Calcola i raggi dell'ellisse di intersezione
        const intersectionRadiusX = radiusX * ellipseScale;
        const intersectionRadiusY = radiusY * ellipseScale;
        
        intersection = {
          elementId: element.id || '',
          elementType: element.type,
          center: { x: element.x, y: element.y },
          shape: 'ellipse',
          parameters: {
            radiusX: intersectionRadiusX,
            radiusY: intersectionRadiusY
          }
        };
      }
      break;
    }
    
    // Aggiungere altri tipi di elementi secondo necessità
    
    default: {
      console.warn(`Tipo di elemento non supportato: ${element.type}`);
    }
  }
  
  return intersection;
}

/**
 * Genera un toolpath ottimizzato dalle intersezioni degli elementi
 * Migliorato per supportare componenti unificati e ottimizzare i percorsi
 * @param elementIntersections Array di intersezioni di elementi
 * @param zLevel Livello Z
 * @param settings Impostazioni del toolpath
 * @returns Array di segmenti di toolpath ottimizzati
 */
export function generateOptimizedToolpath(
  elementIntersections: ElementIntersection[], 
  zLevel: number,
  settings: any
): ToolpathSegment[] {
  const { toolDiameter = 6, feedrate = 1000, plungerate = 500, offset = 'none', direction = 'climb', safeHeight = 5 } = settings;
  const toolpath: ToolpathSegment[] = [];
  
  // Se non ci sono intersezioni, restituisci un array vuoto
  if (elementIntersections.length === 0) {
    return toolpath;
  }
  
  // Ordina le intersezioni per ottimizzare il percorso (minimizzare i movimenti rapidi)
  const orderedIntersections = optimizeElementOrder(elementIntersections);
  
  // Per ogni intersezione di elemento
  orderedIntersections.forEach((intersection, index) => {
    const isFirstElement = index === 0;
    
    // Estrai i parametri corretti in base al tipo di forma
    switch (intersection.shape) {
      case 'circle': {
        // Usa il raggio effettivo dall'intersezione invece di un valore fisso
        let effectiveRadius = intersection.parameters.radius;
        
        // Applica l'offset al raggio
        if (offset === 'inside') {
          effectiveRadius = Math.max(0, effectiveRadius - toolDiameter / 2);
        } else if (offset === 'outside') {
          effectiveRadius += toolDiameter / 2;
        }
        
        // Ignora se il raggio è troppo piccolo
        if (effectiveRadius <= 0) {
          console.warn('Raggio troppo piccolo dopo l\'offset, elemento ignorato');
          return;
        }
        
        // Calcola il punto di partenza sul cerchio
        // Utilizza un angolo di partenza che dipende dall'indice per variare i punti di ingresso
        const startAngle = (index * 45) % 360; // Varia il punto di ingresso
        const startX = intersection.center.x + effectiveRadius * Math.cos(startAngle * Math.PI / 180);
        const startY = intersection.center.y + effectiveRadius * Math.sin(startAngle * Math.PI / 180);
        
        // Gestisci il primo elemento o elementi successivi
        if (isFirstElement) {
          // Movimento rapido al punto di inizio, con altezza di sicurezza
          toolpath.push({
            type: 'rapid',
            startPoint: { x: startX, y: startY, z: zLevel + safeHeight },
            endPoint: { x: startX, y: startY, z: zLevel + safeHeight }
          });
          
          // Movimento di plunge controllato
          toolpath.push({
            type: 'linear',
            startPoint: { x: startX, y: startY, z: zLevel + safeHeight },
            endPoint: { x: startX, y: startY, z: zLevel },
            feedrate: plungerate
          });
        } else {
          // Per elementi successivi, determina se è necessario un movimento di riposizionamento
          const lastPosition = toolpath[toolpath.length - 1].endPoint;
          const distance = Math.sqrt(
            Math.pow(startX - lastPosition.x, 2) + 
            Math.pow(startY - lastPosition.y, 2)
          );
          
          // Se la distanza è maggiore di una soglia, effettua un movimento di riposizionamento
          if (distance > toolDiameter * 1.5) {
            // Solleva l'utensile per il movimento di riposizionamento
            toolpath.push({
              type: 'linear',
              startPoint: lastPosition,
              endPoint: { x: lastPosition.x, y: lastPosition.y, z: zLevel + safeHeight / 2 },
              feedrate: plungerate
            });
            
            // Movimento rapido al nuovo punto di inizio
            toolpath.push({
              type: 'rapid',
              startPoint: { x: lastPosition.x, y: lastPosition.y, z: zLevel + safeHeight / 2 },
              endPoint: { x: startX, y: startY, z: zLevel + safeHeight / 2 }
            });
            
            // Riscesa alla profondità di taglio
            toolpath.push({
              type: 'linear',
              startPoint: { x: startX, y: startY, z: zLevel + safeHeight / 2 },
              endPoint: { x: startX, y: startY, z: zLevel },
              feedrate: plungerate
            });
          } else {
            // Se vicino, crea un movimento lineare diretto
            toolpath.push({
              type: 'linear',
              startPoint: lastPosition,
              endPoint: { x: startX, y: startY, z: zLevel },
              feedrate: feedrate
            });
          }
        }
        
        // Calcola l'angolo di fine basato sulla direzione di taglio
        const endAngle = direction === 'climb' ? startAngle + 360 : startAngle - 360;
        
        // Aggiungi movimento circolare per il contorno
        toolpath.push({
          type: 'circular',
          startPoint: { x: startX, y: startY, z: zLevel },
          endPoint: { x: startX, y: startY, z: zLevel },
          center: { x: intersection.center.x, y: intersection.center.y },
          radius: effectiveRadius,
          clockwise: direction === 'climb', // clockwise per climb, counter-clockwise per conventional
          feedrate: feedrate
        });
        break;
      }
      
      case 'ellipse': {
        let radiusX = intersection.parameters.radiusX;
        let radiusY = intersection.parameters.radiusY;
        
        // Applica l'offset ai raggi
        if (offset === 'inside') {
          radiusX = Math.max(0, radiusX - toolDiameter / 2);
          radiusY = Math.max(0, radiusY - toolDiameter / 2);
        } else if (offset === 'outside') {
          radiusX += toolDiameter / 2;
          radiusY += toolDiameter / 2;
        }
        
        // Ignora se i raggi sono troppo piccoli
        if (radiusX <= 0 || radiusY <= 0) {
          console.warn('Ellipse dimensions too small after offset, skipping element');
          return;
        }
        
        // Genera punti per l'ellisse con maggiore densità per maggiore precisione
        const numPoints = Math.max(72, Math.ceil(Math.PI * (radiusX + radiusY)));
        const points = [];
        
        for (let i = 0; i <= numPoints; i++) {
          const angle = (i / numPoints) * Math.PI * 2;
          const x = intersection.center.x + radiusX * Math.cos(angle);
          const y = intersection.center.y + radiusY * Math.sin(angle);
          points.push([x, y]);
        }
        
        // Inverti i punti per fresatura convenzionale se necessario
        if (direction === 'conventional') {
          points.reverse();
        }
        
        // Primo punto dell'ellisse
        const startX = points[0][0];
        const startY = points[0][1];
        
        // Gestione del movimento di avvicinamento
        if (isFirstElement) {
          // Movimento rapido al punto di inizio con altezza di sicurezza
          toolpath.push({
            type: 'rapid',
            startPoint: { x: startX, y: startY, z: zLevel + safeHeight },
            endPoint: { x: startX, y: startY, z: zLevel + safeHeight }
          });
          
          // Movimento di plunge controllato
          toolpath.push({
            type: 'linear',
            startPoint: { x: startX, y: startY, z: zLevel + safeHeight },
            endPoint: { x: startX, y: startY, z: zLevel },
            feedrate: plungerate
          });
        } else {
          // Per elementi successivi, ottimizza il percorso
          const lastPosition = toolpath[toolpath.length - 1].endPoint;
          const distance = Math.sqrt(
            Math.pow(startX - lastPosition.x, 2) + 
            Math.pow(startY - lastPosition.y, 2)
          );
          
          if (distance > toolDiameter * 1.5) {
            // Movimento di riposizionamento
            toolpath.push({
              type: 'linear',
              startPoint: lastPosition,
              endPoint: { x: lastPosition.x, y: lastPosition.y, z: zLevel + 1 },
              feedrate: plungerate
            });
            
            toolpath.push({
              type: 'rapid',
              startPoint: { x: lastPosition.x, y: lastPosition.y, z: zLevel + 1 },
              endPoint: { x: startX, y: startY, z: zLevel + 1 }
            });
            
            toolpath.push({
              type: 'linear',
              startPoint: { x: startX, y: startY, z: zLevel + 1 },
              endPoint: { x: startX, y: startY, z: zLevel },
              feedrate: plungerate
            });
          } else {
            // Movimento diretto se vicino
            toolpath.push({
              type: 'linear',
              startPoint: lastPosition,
              endPoint: { x: startX, y: startY, z: zLevel },
              feedrate: feedrate
            });
          }
        }
        
        // Segmenti di linea per tracciare l'ellisse
        for (let i = 1; i < points.length; i++) {
          toolpath.push({
            type: 'linear',
            startPoint: { 
              x: points[i - 1][0], 
              y: points[i - 1][1], 
              z: zLevel 
            },
            endPoint: { 
              x: points[i][0], 
              y: points[i][1], 
              z: zLevel 
            },
            feedrate: feedrate // Specifica sempre il feedrate
          });
        }
        break;
      }
      
      case 'rectangle': {
        const width = intersection.parameters.width;
        const height = intersection.parameters.height;
        
        // Applica l'offset alle dimensioni
        let offsetDistance = 0;
        if (offset === 'inside') {
          offsetDistance = -toolDiameter / 2;
        } else if (offset === 'outside') {
          offsetDistance = toolDiameter / 2;
        }
        
        const effectiveWidth = width + offsetDistance * 2 * (offset === 'outside' ? 1 : -1);
        const effectiveHeight = height + offsetDistance * 2 * (offset === 'outside' ? 1 : -1);
        
        // Ignora se le dimensioni sono troppo piccole
        if (effectiveWidth <= 0 || effectiveHeight <= 0) {
          console.warn('Rectangle dimensions too small after offset, skipping element');
          return;
        }
        
        // Calcola gli angoli del rettangolo
        const centerX = intersection.center.x;
        const centerY = intersection.center.y;
        const halfWidth = effectiveWidth / 2;
        const halfHeight = effectiveHeight / 2;
        
        const corners = [
          [centerX - halfWidth, centerY - halfHeight],
          [centerX + halfWidth, centerY - halfHeight],
          [centerX + halfWidth, centerY + halfHeight],
          [centerX - halfWidth, centerY + halfHeight],
          [centerX - halfWidth, centerY - halfHeight] // Chiude il loop
        ];
        
        // Inverti per fresatura convenzionale se necessario
        if (direction === 'conventional') {
          corners.reverse();
        }
        
        // Primo punto del rettangolo
        const startX = corners[0][0];
        const startY = corners[0][1];
        
        // Gestione del movimento di avvicinamento
        if (isFirstElement) {
          // Movimento rapido al punto di inizio
          toolpath.push({
            type: 'rapid',
            startPoint: { x: startX, y: startY, z: zLevel + safeHeight },
            endPoint: { x: startX, y: startY, z: zLevel + safeHeight }
          });
          
          // Movimento di plunge controllato
          toolpath.push({
            type: 'linear',
            startPoint: { x: startX, y: startY, z: zLevel + safeHeight },
            endPoint: { x: startX, y: startY, z: zLevel },
            feedrate: plungerate
          });
        } else {
          // Per elementi successivi, ottimizza il percorso
          const lastPosition = toolpath[toolpath.length - 1].endPoint;
          const distance = Math.sqrt(
            Math.pow(startX - lastPosition.x, 2) + 
            Math.pow(startY - lastPosition.y, 2)
          );
          
          if (distance > toolDiameter * 1.5) {
            // Movimento di riposizionamento
            toolpath.push({
              type: 'linear',
              startPoint: lastPosition,
              endPoint: { x: lastPosition.x, y: lastPosition.y, z: zLevel + 1 },
              feedrate: plungerate
            });
            
            toolpath.push({
              type: 'rapid',
              startPoint: { x: lastPosition.x, y: lastPosition.y, z: zLevel + 1 },
              endPoint: { x: startX, y: startY, z: zLevel + 1 }
            });
            
            toolpath.push({
              type: 'linear',
              startPoint: { x: startX, y: startY, z: zLevel + 1 },
              endPoint: { x: startX, y: startY, z: zLevel },
              feedrate: plungerate
            });
          } else {
            // Movimento diretto se vicino
            toolpath.push({
              type: 'linear',
              startPoint: lastPosition,
              endPoint: { x: startX, y: startY, z: zLevel },
              feedrate: feedrate
            });
          }
        }
        
        // Segmenti di linea per i lati del rettangolo
        for (let i = 1; i < corners.length; i++) {
          toolpath.push({
            type: 'linear',
            startPoint: { 
              x: corners[i - 1][0], 
              y: corners[i - 1][1], 
              z: zLevel 
            },
            endPoint: { 
              x: corners[i][0], 
              y: corners[i][1], 
              z: zLevel 
            },
            feedrate: feedrate
          });
        }
        break;
      }
      
      // Altri casi per forme aggiuntive...
      
      default:
        console.warn(`Forma non supportata per toolpath: ${intersection.shape}`);
    }
  });
  
  return toolpath;
}

/**
 * Ordina le intersezioni degli elementi per ottimizzare il percorso e minimizzare i movimenti rapidi
 * @param intersections Le intersezioni degli elementi
 * @returns Array ordinato di intersezioni
 */
function optimizeElementOrder(intersections: ElementIntersection[]): ElementIntersection[] {
  if (intersections.length <= 1) {
    return [...intersections];
  }
  
  // Inizia dal primo elemento
  const result: ElementIntersection[] = [intersections[0]];
  let remaining = intersections.slice(1);
  
  // Ultimo punto aggiunto al percorso
  let lastPoint = getElementCenter(intersections[0]);
  
  // Trova l'elemento più vicino a ogni passo
  while (remaining.length > 0) {
    let closestIndex = -1;
    let minDistance = Infinity;
    
    // Trova l'elemento più vicino all'ultimo punto
    for (let i = 0; i < remaining.length; i++) {
      const center = getElementCenter(remaining[i]);
      const distance = Math.sqrt(
        Math.pow(center.x - lastPoint.x, 2) + 
        Math.pow(center.y - lastPoint.y, 2)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }
    
    if (closestIndex >= 0) {
      // Aggiungi l'elemento più vicino al risultato
      const closestElement = remaining[closestIndex];
      result.push(closestElement);
      
      // Rimuovi l'elemento dall'array di quelli rimanenti
      remaining = remaining.filter((_, i) => i !== closestIndex);
      
      // Aggiorna l'ultimo punto
      lastPoint = getElementCenter(closestElement);
    } else {
      // Non dovrebbe mai accadere, ma per sicurezza
      break;
    }
  }
  
  return result;
}

/**
 * Ottiene il centro di un elemento
 * @param element Elemento
 * @returns Coordinate del centro {x, y}
 */
function getElementCenter(element: ElementIntersection): {x: number, y: number} {
  return element.center;
}

/**
 * Converte i segmenti di toolpath in G-code
 * Migliorato per supportare una generazione G-code più completa e precisa
 * @param toolpath Array di segmenti di toolpath
 * @param settings Impostazioni del toolpath
 * @returns Stringa G-code
 */
export function convertToolpathToGcode(toolpath: ToolpathSegment[], settings: any): string {
  const { 
    feedrate: defaultFeedrate = 1000, 
    plungerate: defaultPlungerate = 500, 
    safeHeight = 5,
    includeComments = true
  } = settings;
  
  let gcode = '';
  let lastFeedrate: number | undefined;
  
  // Per ogni segmento di toolpath
  toolpath.forEach((segment, index) => {
    const isPlungeMove = 
      segment.type === 'linear' && 
      segment.startPoint.z !== segment.endPoint.z && 
      Math.abs(segment.startPoint.x - segment.endPoint.x) < 0.001 && 
      Math.abs(segment.startPoint.y - segment.endPoint.y) < 0.001;
    
    // Determina il feedrate corretto da usare
    const feedrateToUse = segment.feedrate || 
      (isPlungeMove ? defaultPlungerate : 
       (segment.type === 'linear' || segment.type === 'circular') ? defaultFeedrate : undefined);
    
    // Arrotonda le coordinate a 3 decimali per maggior precisione
    const formatCoord = (val: number) => val.toFixed(3);
    
    let comment = '';
    if (includeComments) {
      switch (segment.type) {
        case 'rapid':
          comment = '; Movimento rapido';
          break;
        case 'linear':
          comment = isPlungeMove ? '; Movimento di plunge' : '; Movimento lineare';
          break;
        case 'circular':
          comment = segment.clockwise ? '; Movimento circolare orario' : '; Movimento circolare antiorario';
          break;
      }
    }
    
    switch (segment.type) {
      case 'rapid':
        gcode += `G0 X${formatCoord(segment.endPoint.x)} Y${formatCoord(segment.endPoint.y)} Z${formatCoord(segment.endPoint.z)}${comment ? ` ${comment}` : ''}\n`;
        break;
        
      case 'linear':
        gcode += `G1 X${formatCoord(segment.endPoint.x)} Y${formatCoord(segment.endPoint.y)} Z${formatCoord(segment.endPoint.z)}`;
        
        // Aggiungi il feedrate se necessario
        if (feedrateToUse !== undefined && feedrateToUse !== lastFeedrate) {
          gcode += ` F${feedrateToUse}`;
          lastFeedrate = feedrateToUse;
        }
        
        gcode += `${comment ? ` ${comment}` : ''}\n`;
        break;
        
      case 'circular':
        // Calcola i parametri I e J (distanza relativa dal punto di partenza al centro)
        const i = formatCoord(segment.center!.x - segment.startPoint.x);
        const j = formatCoord(segment.center!.y - segment.startPoint.y);
        
        // G2 per movimento orario (clockwise), G3 per movimento antiorario (counter-clockwise)
        const gCommand = segment.clockwise ? 'G2' : 'G3';
        
        gcode += `${gCommand} X${formatCoord(segment.endPoint.x)} Y${formatCoord(segment.endPoint.y)} Z${formatCoord(segment.endPoint.z)} I${i} J${j}`;
        
        // Aggiungi il feedrate se necessario
        if (feedrateToUse !== undefined && feedrateToUse !== lastFeedrate) {
          gcode += ` F${feedrateToUse}`;
          lastFeedrate = feedrateToUse;
        }
        
        gcode += `${comment ? ` ${comment}` : ''}\n`;
        break;
    }
  });
  
  return gcode;
}

/**
 * Genera G-code per un componente utilizzando la geometria unificata
 * @param elements Array di elementi
 * @param settings Impostazioni del toolpath
 * @returns Stringa G-code
 */
export function generateUnifiedGcode(elements: Component3D[], settings: any): string {
  // Impostazioni di default
  const defaults = {
    feedrate: 1000,
    plungerate: 500,
    stepdown: 1.0,
    safeHeight: 5,
    toolDiameter: 6,
    offset: 'none',
    direction: 'climb',
    includeComments: true
  };
  
  // Unisci le impostazioni fornite con i valori di default
  const mergedSettings = { ...defaults, ...settings };
  
  // Intestazione del G-code
  let gcode = '';
  
  if (mergedSettings.includeComments) {
    gcode += `; CAD/CAM SYSTEM - Generated Mill G-code\n`;
    gcode += `; Operation: contour\n`;
    gcode += `; Tool: endmill Ø${mergedSettings.toolDiameter}mm\n`;
    gcode += `; Date: ${new Date().toISOString()}\n\n`;
  }
  
  // Comandi di inizializzazione
  gcode += `G90 ; Absolute positioning\n`;
  gcode += `G21 ; Metric units\n`;
  gcode += `M3 S${mergedSettings.spindleSpeed || 12000} ; Start spindle\n`;
  gcode += `M8 ; Coolant on\n`;
  gcode += `G0 Z${mergedSettings.safeHeight} ; Move to safe height\n\n`;
  
  // Calcola le dimensioni complessive del componente
  const dimensionsArray = elements.map(element => calculateElementDimensions(element));
  const dimensions = combineElementDimensions(dimensionsArray);
  
  if (mergedSettings.includeComments) {
    gcode += `; Unified mesh toolpath\n`;
    gcode += `; Bounding box: width=${dimensions.width.toFixed(3)}, height=${dimensions.height.toFixed(3)}, depth=${dimensions.depth.toFixed(3)}\n`;
    gcode += `; Center: (${dimensions.center.x.toFixed(3)}, ${dimensions.center.y.toFixed(3)}, ${dimensions.center.z.toFixed(3)})\n\n`;
  }
  
  // Calcola i livelli Z che intersecano gli elementi
  const zLevels = calculateZLevels(elements, mergedSettings);
  
  // Per ogni livello Z
  for (const zLevel of zLevels) {
    if (mergedSettings.includeComments) {
      gcode += `; Z Level: ${zLevel.toFixed(3)}\n`;
    }
    
    // Calcola le intersezioni a questo livello Z
    const intersection = calculateZLevelIntersection(elements, zLevel, mergedSettings);
    
    // Se ci sono elementi che intersecano questo livello Z
    if (intersection.elements.length > 0) {
      // Converti i segmenti di toolpath in G-code
      gcode += convertToolpathToGcode(intersection.toolpath, mergedSettings);
      gcode += '\n';
    } else if (mergedSettings.includeComments) {
      gcode += `; No elements intersect at this Z level\n\n`;
    }
  }
  
  // Comandi di chiusura
  gcode += `; End of program\n`;
  gcode += `G0 Z${mergedSettings.safeHeight} ; Move to safe height\n`;
  gcode += `M9 ; Coolant off\n`;
  gcode += `M5 ; Stop spindle\n`;
  gcode += `M30 ; Program end\n`;
  
  return gcode;
}

/**
 * Funzione principale per generare G-code per un componente
 * Migliorata per gestire correttamente componenti composti e operazioni booleane
 * @param component Il componente da processare
 * @param settings Impostazioni del toolpath
 * @returns Stringa G-code
 */
export function generateComponentUnifiedGcode(component: Component3D, settings: any): string {
  // Estrae gli elementi dal componente
  let elements: Component3D[] = [];
  
  if (component.type === 'component' && component.elements && Array.isArray(component.elements)) {
    // Per componenti composti, aggiungi la posizione relativa del componente
    elements = component.elements.map((element: Component3D) => {
      // Aggiungi posizione relativa e mantieni le operazioni booleane
      return {
        ...element,
        x: (element.x || 0) + (component.x || 0),
        y: (element.y || 0) + (component.y || 0),
        z: (element.z || 0) + (component.z || 0),
        operation: element.operation || 'union'
      };
    });
  } else {
    // Se non è un componente composto, trattalo come un singolo elemento
    elements = [component];
  }
  
  // Genera G-code per tutti gli elementi
  return generateUnifiedGcode(elements, settings);
}

/**
 * Calcola le dimensioni 3D reali di un componente per visualizzazione e verifica
 * @param component Componente da analizzare
 * @returns Oggetto con dimensioni e informazioni sul volume
 */
export function calculate3DComponentDetails(component: Component3D): {
  dimensions: ElementDimensions;
  volume: number;
  surfaceArea: number;
  centerOfMass: { x: number, y: number, z: number };
} {
  // Ottieni le dimensioni di base
  const dimensions = calculateComponentDimensions(component);
  
  // Calcolo approssimato del volume (per forme semplici)
  let volume = 0;
  let surfaceArea = 0;
  
  // Estrai gli elementi
  const elements: Component3D[] = component.type === 'component' && component.elements 
    ? component.elements.map(e => ({
        ...e,
        x: (e.x || 0) + (component.x || 0),
        y: (e.y || 0) + (component.y || 0),
        z: (e.z || 0) + (component.z || 0)
      })) 
    : [component];
  
  // Calcola volume e area superficiale approssimati per ogni elemento
  elements.forEach(element => {
    const { elementVolume, elementSurfaceArea } = calculateElementVolumeAndSurface(element);
    volume += elementVolume;
    surfaceArea += elementSurfaceArea;
  });
  
  // Il centro di massa è approssimato al centro geometrico per semplicità
  const centerOfMass = { ...dimensions.center };
  
  return {
    dimensions,
    volume,
    surfaceArea,
    centerOfMass
  };
}

/**
 * Calcola volume e area superficiale di un elemento
 * @param element Elemento da analizzare
 * @returns Volume e area superficiale approssimati
 */
function calculateElementVolumeAndSurface(element: Component3D): { 
  elementVolume: number; 
  elementSurfaceArea: number 
} {
  let elementVolume = 0;
  let elementSurfaceArea = 0;
  
  switch (element.type) {
    case 'sphere': {
      const radius = element.radius || 0;
      elementVolume = (4/3) * Math.PI * Math.pow(radius, 3);
      elementSurfaceArea = 4 * Math.PI * Math.pow(radius, 2);
      break;
    }
    
    case 'cube':
    case 'rectangle': {
      const width = element.width || 0;
      const height = element.height || 0;
      const depth = element.depth || height || 0;
      elementVolume = width * height * depth;
      elementSurfaceArea = 2 * (width * height + width * depth + height * depth);
      break;
    }
    
    case 'cylinder': {
      const radius = element.radius || 0;
      const height = element.height || 0;
      elementVolume = Math.PI * Math.pow(radius, 2) * height;
      elementSurfaceArea = 2 * Math.PI * radius * (radius + height);
      break;
    }
    
    case 'capsule': {
      const radius = element.radius || 0;
      const height = element.height || 0;
      // Volume = cilindro + due semisfere
      elementVolume = Math.PI * Math.pow(radius, 2) * height + (4/3) * Math.PI * Math.pow(radius, 3);
      // Area = area laterale cilindro + area due semisfere
      elementSurfaceArea = 2 * Math.PI * radius * height + 4 * Math.PI * Math.pow(radius, 2);
      break;
    }
    
    // Aggiungere altri tipi secondo necessità
    
    default:
      // Approssimazione grossolana per tipi non implementati
      const dimensions = calculateElementDimensions(element);
      elementVolume = dimensions.width * dimensions.height * dimensions.depth;
      elementSurfaceArea = 2 * (
        dimensions.width * dimensions.height + 
        dimensions.width * dimensions.depth + 
        dimensions.height * dimensions.depth
      );
  }
  
  return { elementVolume, elementSurfaceArea };
} 