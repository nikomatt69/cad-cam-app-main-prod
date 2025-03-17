// Crea un nuovo file: src/lib/ai/assemblyGenerator.ts

import { CADElement, CubeElement, CylinderElement, ExtrusionElement, GroupElement, Point3D, SphereElement, StandardComponentElement } from "@/src/types/AITypes";
import { StandardComponentsGenerator } from "../standardComponentsGenerator.ts";

export class AssemblyGenerator {
    // Genera un assemblaggio completo da componenti individuali
    static generateAssembly(components: CADElement[], name: string): GroupElement {
      const id = `assembly_${name.replace(/\s+/g, '_')}_${Date.now()}`;
      
      return {
        id,
        type: 'group',
        name,
        position: { x: 0, y: 0, z: 0 },
        children: components.map(c => c.id),
        material: {
          type: 'composite',
          name: 'Assembly',
          density: 0,  // Calcolato in base ai componenti
          color: '#CCCCCC'
        },
        color: '#CCCCCC',
        metadata: {
          componentCount: components.length,
          assemblyType: 'static',
          dateCreated: new Date().toISOString()
        }
      };
    }
    
    // Genera bulloni per fissare due componenti
    static generateFasteners(component1: CADElement, component2: CADElement, holePositions: Point3D[]): StandardComponentElement[] {
      const fasteners: StandardComponentElement[] = [];
      
      // Determina lo spessore combinato dei componenti per la lunghezza dei bulloni
      const thickness1 = this.getThickness(component1);
      const thickness2 = this.getThickness(component2);
      const totalThickness = thickness1 + thickness2;
      
      // Determina la dimensione appropriata del bullone in base alle dimensioni dei componenti
      const boltSize = this.determineBoltSize(component1, component2);
      
      // Calcola la lunghezza appropriata del bullone (spessore totale + 5mm per il dado)
      const boltLength = Math.ceil((totalThickness + 5) / 5) * 5; // Arrotonda al multiplo di 5mm superiore
      
      // Genera bulloni, dadi e rondelle per ogni posizione di foro
      for (const position of holePositions) {
        // Genera il bullone
        const bolt = StandardComponentsGenerator.generateBolt('ISO 4762', boltSize, boltLength, position);
        
        // Calcola la posizione del dado (offset della lunghezza del componente)
        const nutPosition = {
          x: position.x,
          y: position.y,
          z: position.z + totalThickness + 2 // +2mm di offset
        };
        
        // Genera il dado
        const nut = StandardComponentsGenerator.generateNut('ISO 4032', boltSize, nutPosition);
        
        // Calcola le posizioni delle rondelle
        const washerPos1 = { ...position, z: position.z - 1 }; // -1mm di offset
        const washerPos2 = { ...nutPosition, z: nutPosition.z - 1 }; // -1mm di offset
        
        // Genera le rondelle
        const washer1 = StandardComponentsGenerator.generateWasher('ISO 7089', boltSize, washerPos1);
        const washer2 = StandardComponentsGenerator.generateWasher('ISO 7089', boltSize, washerPos2);
        
        // Aggiungi i componenti all'array
        fasteners.push(bolt, nut, washer1, washer2);
      }
      
      return fasteners;
    }
    
    // Determina lo spessore di un componente
    private static getThickness(component: CADElement): number {
      switch (component.type) {
        case 'cube':
          return (component as CubeElement).height;
        case 'cylinder':
          return (component as CylinderElement).height;
        case 'extrusion':
          return (component as ExtrusionElement).depth;
        // Aggiungi casi per altri tipi
        default:
          return 10; // Valore di default se non determinabile
      }
    }
    
    // Determina la dimensione appropriata del bullone in base alle dimensioni dei componenti
    private static determineBoltSize(component1: CADElement, component2: CADElement): string {
      // Implementazione semplificata: dimensione del bullone proporzionale alla dimensione del componente
      const size1 = this.getCharacteristicSize(component1);
      const size2 = this.getCharacteristicSize(component2);
      
      const avgSize = (size1 + size2) / 2;
      
      // Seleziona la dimensione del bullone in base alla dimensione media
      if (avgSize < 30) return 'M3';
      if (avgSize < 50) return 'M4';
      if (avgSize < 100) return 'M5';
      if (avgSize < 200) return 'M6';
      if (avgSize < 300) return 'M8';
      return 'M10';
    }
    
    // Ottiene una dimensione caratteristica del componente
    private static getCharacteristicSize(component: CADElement): number {
      switch (component.type) {
        case 'cube':
          return Math.max(
            (component as CubeElement).width,
            (component as CubeElement).height,
            (component as CubeElement).depth
          );
        case 'sphere':
          return (component as SphereElement).radius * 2;
        case 'cylinder':
          return (component as CylinderElement).radius * 2;
        // Aggiungi casi per altri tipi
        default:
          return 50; // Valore di default se non determinabile
      }
    }
  }