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
 * Analizza un componente per determinare le dimensioni complessive
 * @param component Il componente da analizzare
 * @returns Le dimensioni del componente
 */
export function calculateComponentDimensions(component: any): ElementDimensions {
  // Se il componente ha elementi, calcola le dimensioni di tutti gli elementi
  if (component.elements && Array.isArray(component.elements) && component.elements.length > 0) {
    const elementDimensions = component.elements.map((element: any) => calculateElementDimensions(element));
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
export function calculateElementDimensions(element: any): ElementDimensions {
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
          height: radius * 2,
          depth: radius,
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
          height: radius * 2,
          depth: radius,
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
          minZ: element.z - height / 2,
          maxZ: element.z + height / 2,
          width: radius * 2,
          height: height,
          depth: radius * 2,
          center: { x: element.x, y: element.y, z: element.z }
        };
      } else if (orientation === 'x') {
        bbox = {
          minX: element.x - height / 2,
          maxX: element.x + height / 2,
          minY: element.y - radius,
          maxY: element.y + radius,
          minZ: element.z - radius,
          maxZ: element.z + radius,
          width: height,
          height: radius * 2,
          depth: radius * 2,
          center: { x: element.x, y: element.y, z: element.z }
        };
      } else { // y orientation
        bbox = {
          minX: element.x - radius,
          maxX: element.x + radius,
          minY: element.y - height / 2,
          maxY: element.y + height / 2,
          minZ: element.z - radius,
          maxZ: element.z + radius,
          width: radius * 2,
          height: radius * 2,
          depth: height,
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
      const radiusX = element.radiusX || element.width / 2 || 0;
      const radiusY = element.radiusY || element.height / 2 || 0;
      const radiusZ = element.radiusZ || element.depth / 2 || 0;
      
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
export function calculateZLevels(elements: any[], settings: any): number[] {
  if (!elements || elements.length === 0) {
    return [];
  }
  
  // Calcola le dimensioni complessive
  const dimensions = combineElementDimensions(elements.map(e => calculateElementDimensions(e)));
  
  // Determina il range Z e il numero di livelli
  const topZ = dimensions.maxZ;
  const { depth, stepdown } = settings;
  const minTargetZ = Math.max(dimensions.minZ, topZ - depth);
  
  // Genera i livelli Z
  const zLevels: number[] = [];
  let currentZ = topZ;
  
  while (currentZ > minTargetZ) {
    zLevels.push(currentZ);
    currentZ = Math.max(minTargetZ, currentZ - stepdown);
    
    // Evita loop infiniti se currentZ non cambia
    if (Math.abs(currentZ - zLevels[zLevels.length - 1]) < 0.0001) {
      break;
    }
  }
  
  // Aggiungi l'ultimo livello se necessario
  if (zLevels.length === 0 || zLevels[zLevels.length - 1] > minTargetZ) {
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
export function calculateAllIntersections(elements: any[], zLevels: number[], settings: any): ZLevelIntersection[] {
  return zLevels.map(zLevel => calculateZLevelIntersection(elements, zLevel, settings));
}

/**
 * Calcola le intersezioni degli elementi a uno specifico livello Z
 * @param elements Array di elementi
 * @param zLevel Livello Z
 * @param settings Impostazioni del toolpath
 * @returns Intersezione al livello Z specificato
 */
export function calculateZLevelIntersection(elements: any[], zLevel: number, settings: any): ZLevelIntersection {
  // Array per memorizzare le intersezioni
  const elementIntersections: ElementIntersection[] = [];
  
  // Calcola l'intersezione per ogni elemento
  elements.forEach(element => {
    const intersection = calculateElementZLevelIntersection(element, zLevel);
    if (intersection) {
      elementIntersections.push(intersection);
    }
  });
  
  // Calcola il bounding box complessivo
  const boundingBox = {
    minX: Number.MAX_VALUE,
    maxX: Number.MIN_VALUE,
    minY: Number.MAX_VALUE,
    maxY: Number.MIN_VALUE
  };
  
  // Aggiorna il bounding box in base alle intersezioni
  elementIntersections.forEach(intersection => {
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
  
  // Genera i segmenti di toolpath ottimizzati
  const toolpath = generateOptimizedToolpath(elementIntersections, zLevel, settings);
  
  return {
    zLevel,
    elements: elementIntersections,
    boundingBox,
    toolpath
  };
}

/**
 * Calcola l'intersezione di un elemento a uno specifico livello Z
 * @param element Elemento da intersecare
 * @param zLevel Livello Z
 * @returns Intersezione dell'elemento (o null se non interseca)
 */
export function calculateElementZLevelIntersection(element: any, zLevel: number): ElementIntersection | null {
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
        const capsuleTopZ = element.z + height / 2;
        const capsuleBottomZ = element.z - height / 2;
        const cylinderTopZ = capsuleTopZ - radius;
        const cylinderBottomZ = capsuleBottomZ + radius;
        
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
      } else if (orientation === 'x' || orientation === 'y') {
        // Per capsules orientate in X o Y, utilizziamo un'approssimazione ellittica
        // Questo è semplificato - una vera implementazione richiederebbe calcoli più complessi
        const radiusX = orientation === 'x' ? height / 2 : radius;
        const radiusY = orientation === 'y' ? height / 2 : radius;
        
        // Verifica se il livello Z interseca la capsula
        if (zLevel >= element.z - radius && zLevel <= element.z + radius) {
          intersection = {
            elementId: element.id || '',
            elementType: element.type,
            center: { x: element.x, y: element.y },
            shape: 'ellipse',
            parameters: {
              radiusX,
              radiusY
            }
          };
        }
      }
      break;
    }
    
    // Aggiungere altri tipi di elementi secondo necessità
  }
  
  return intersection;
}

/**
 * Genera un toolpath ottimizzato dalle intersezioni degli elementi
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
  const { toolDiameter, feedrate, plungerate, offset, direction } = settings;
  const toolpath: ToolpathSegment[] = [];
  const safeHeight = 5; // Altezza di sicurezza sopra il livello di lavoro
  
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
          console.warn('Radius too small after offset, skipping element');
          return;
        }
        
        // Punto di inizio sul cerchio
        const startX = intersection.center.x + effectiveRadius;
        const startY = intersection.center.y;
        
        // Movimenti diversi a seconda che sia il primo elemento o no
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
            feedrate: plungerate // Specifica la velocità di plunge
          });
        } else {
          // Per elementi successivi, determina se è necessario un movimento di riposizionamento
          const lastPosition = toolpath[toolpath.length - 1].endPoint;
          const distance = Math.sqrt(
            Math.pow(startX - lastPosition.x, 2) + 
            Math.pow(startY - lastPosition.y, 2)
          );
          
          // Se la distanza è maggiore del raggio dell'utensile, effettua un movimento di collegamento
          if (distance > toolDiameter * 1.5) {
            // Solleva leggermente l'utensile per il movimento di riposizionamento
            toolpath.push({
              type: 'linear',
              startPoint: lastPosition,
              endPoint: { x: lastPosition.x, y: lastPosition.y, z: zLevel + 1 },
              feedrate: plungerate
            });
            
            // Movimento rapido al nuovo punto di inizio
            toolpath.push({
              type: 'rapid',
              startPoint: { x: lastPosition.x, y: lastPosition.y, z: zLevel + 1 },
              endPoint: { x: startX, y: startY, z: zLevel + 1 }
            });
            
            // Riscesa alla profondità di taglio
            toolpath.push({
              type: 'linear',
              startPoint: { x: startX, y: startY, z: zLevel + 1 },
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
        
        // Movimento circolare per il contorno
        toolpath.push({
          type: 'circular',
          startPoint: { x: startX, y: startY, z: zLevel },
          endPoint: { x: startX, y: startY, z: zLevel },
          center: { x: intersection.center.x, y: intersection.center.y },
          radius: effectiveRadius,
          clockwise: direction === 'climb',
          feedrate: feedrate // Sempre specificare il feedrate
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
        console.warn(`Unsupported shape type: ${intersection.shape}`);
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
 * @param toolpath Array di segmenti di toolpath
 * @param settings Impostazioni del toolpath
 * @returns Stringa G-code
 */
export function convertToolpathToGcode(toolpath: ToolpathSegment[], settings: any): string {
  const { feedrate: defaultFeedrate, plungerate: defaultPlungerate } = settings;
  let gcode = '';
  
  // Per ogni segmento di toolpath
  toolpath.forEach((segment, index) => {
    const isPlungeMove = 
      segment.type === 'linear' && 
      segment.startPoint.z !== segment.endPoint.z && 
      segment.startPoint.x === segment.endPoint.x && 
      segment.startPoint.y === segment.endPoint.y;
    
    // Determina il feedrate corretto da usare
    const feedrateToUse = segment.feedrate || 
      (isPlungeMove ? defaultPlungerate : 
       (segment.type === 'linear' || segment.type === 'circular') ? defaultFeedrate : undefined);
    
    switch (segment.type) {
      case 'rapid':
        gcode += `G0 X${segment.endPoint.x.toFixed(3)} Y${segment.endPoint.y.toFixed(3)} Z${segment.endPoint.z.toFixed(3)} ; Rapid move\n`;
        break;
        
      case 'linear':
        gcode += `G1 X${segment.endPoint.x.toFixed(3)} Y${segment.endPoint.y.toFixed(3)} Z${segment.endPoint.z.toFixed(3)}`;
        
        // Aggiungi il feedrate se necessario
        if (feedrateToUse !== undefined) {
          // Se è il primo movimento o il feedrate è cambiato dal segmento precedente, specificalo
          if (index === 0 || toolpath[index - 1].feedrate !== feedrateToUse) {
            gcode += ` F${feedrateToUse}`;
          }
        }
        
        // Aggiungi commento relativo al tipo di movimento
        if (isPlungeMove) {
          gcode += ` ; Plunge move\n`;
        } else {
          gcode += ` ; Linear move\n`;
        }
        break;
        
      case 'circular':
        if (segment.clockwise) {
          const i = segment.center!.x - segment.startPoint.x;
          const j = segment.center!.y - segment.startPoint.y;
          gcode += `G3 X${segment.endPoint.x.toFixed(3)} Y${segment.endPoint.y.toFixed(3)} I${i.toFixed(3)} J${j.toFixed(3)}`;
          
          // Aggiungi il feedrate se necessario
          if (feedrateToUse !== undefined) {
            // Se è il primo movimento o il feedrate è cambiato dal segmento precedente, specificalo
            if (index === 0 || toolpath[index - 1].feedrate !== feedrateToUse) {
              gcode += ` F${feedrateToUse}`;
            }
          }
          
          gcode += ` ; Clockwise circular move\n`;
        } else {
          const i = segment.center!.x - segment.startPoint.x;
          const j = segment.center!.y - segment.startPoint.y;
          gcode += `G2 X${segment.endPoint.x.toFixed(3)} Y${segment.endPoint.y.toFixed(3)} I${i.toFixed(3)} J${j.toFixed(3)}`;
          
          // Aggiungi il feedrate se necessario
          if (feedrateToUse !== undefined) {
            // Se è il primo movimento o il feedrate è cambiato dal segmento precedente, specificalo
            if (index === 0 || toolpath[index - 1].feedrate !== feedrateToUse) {
              gcode += ` F${feedrateToUse}`;
            }
          }
          
          gcode += ` ; Counter-clockwise circular move\n`;
        }
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
export function generateUnifiedGcode(elements: any[], settings: any): string {
  // Intestazione del G-code
  let gcode = `; Unified G-code for component with ${elements.length} elements\n`;
  
  // Calcola le dimensioni complessive del componente
  const dimensionsArray = elements.map(element => calculateElementDimensions(element));
  const dimensions = combineElementDimensions(dimensionsArray);
  
  gcode += `; Combined bounding box: width=${dimensions.width.toFixed(3)}, height=${dimensions.height.toFixed(3)}, depth=${dimensions.depth.toFixed(3)}\n`;
  gcode += `; Combined center: (${dimensions.center.x.toFixed(3)}, ${dimensions.center.y.toFixed(3)}, ${dimensions.center.z.toFixed(3)})\n`;
  
  // Calcola i livelli Z che intersecano gli elementi
  const zLevels = calculateZLevels(elements, settings);
  gcode += `; Processing ${zLevels.length} Z levels from ${zLevels[0].toFixed(3)} to ${zLevels[zLevels.length - 1].toFixed(3)}\n`;
  
  // Per ogni livello Z
  for (const zLevel of zLevels) {
    gcode += `\n; === Z Level: ${zLevel.toFixed(3)} ===\n`;
    
    // Calcola le intersezioni a questo livello Z
    const intersection = calculateZLevelIntersection(elements, zLevel, settings);
    
    // Se ci sono elementi che intersecano questo livello Z
    if (intersection.elements.length > 0) {
      gcode += `; Processing ${intersection.elements.length} intersecting elements\n`;
      
      // Converti i segmenti di toolpath in G-code
      gcode += convertToolpathToGcode(intersection.toolpath, settings);
    } else {
      gcode += `; No elements intersect at this Z level\n`;
    }
  }
  
  return gcode;
}

/**
 * Funzione principale per generare G-code per un componente
 * @param component Il componente da processare
 * @param settings Impostazioni del toolpath
 * @returns Stringa G-code
 */
export function generateComponentUnifiedGcode(component: any, settings: any): string {
  // Estrae gli elementi dal componente
  let elements: any[] = [];
  
  if (component.type === 'component' && component.elements && Array.isArray(component.elements)) {
    elements = component.elements.map((element: any) => {
      // Adjust position to be relative to the component
      return {
        ...element,
        x: (element.x || 0) + component.x,
        y: (element.y || 0) + component.y,
        z: (element.z || 0) + component.z
      };
    });
  } else {
    // Se non è un componente, trattalo come un singolo elemento
    elements = [component];
  }
  
  // Genera G-code per tutti gli elementi
  return generateUnifiedGcode(elements, settings);
} 