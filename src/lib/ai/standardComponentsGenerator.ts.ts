// Crea un nuovo file: src/lib/ai/standardComponentsGenerator.ts

import { Point3D, StandardComponentElement } from "@/src/types/AITypes";

export class StandardComponentsGenerator {
    // Genera un bullone standard basato su parametri
    static generateBolt(standard: string, size: string, length: number, position: Point3D): StandardComponentElement {
      const id = `bolt_${standard.replace(/\s+/g, '_')}_${size}_${length}_${Date.now()}`;
      
      const boltSizes = this.getBoltSizes(standard);
      const sizeData = boltSizes[size] || { 
        headDiameter: parseFloat(size.replace('M', '')) * 1.5,
        headHeight: parseFloat(size.replace('M', '')) * 0.6,
        threadDiameter: parseFloat(size.replace('M', '')),
        pitch: parseFloat(size.replace('M', '')) * 0.18 // Approssimazione del passo standard
      };
      
      return {
        id,
        type: 'bolt',
        name: `${standard} ${size}x${length}mm Bolt`,
        position,
        standard,
        size,
        length,
        grade: '8.8', // Default a meno che non specificato diversamente
        material: {
          type: 'metal',
          name: 'Steel',
          density: 7850, // kg/m³
          color: '#777777'
        },
        color: '#777777',
        surfaceFinish: 'Ra 1.6',
        tolerance: 0.1,
        metadata: {
          headDiameter: sizeData.headDiameter,
          headHeight: sizeData.headHeight,
          threadDiameter: sizeData.threadDiameter,
          pitch: sizeData.pitch
        }
      };
    }
    
    // Genera una vite standard
    static generateScrew(standard: string, size: string, length: number, position: Point3D): StandardComponentElement {
      const id = `screw_${standard.replace(/\s+/g, '_')}_${size}_${length}_${Date.now()}`;
      
      // Simile a generateBolt, ma con valori specifici per le viti
      // ...implementazione
      
      return {
        id,
        type: 'screw',
        name: `${standard} ${size}x${length}mm Screw`,
        position,
        standard,
        size,
        length,
        material: {
          type: 'metal',
          name: 'Steel',
          density: 7850,
          color: '#555555'
        },
        color: '#555555',
        // ... altre proprietà
      };
    }
    
    // Genera un dado standard
    static generateNut(standard: string, size: string, position: Point3D): StandardComponentElement {
      const id = `nut_${standard.replace(/\s+/g, '_')}_${size}_${Date.now()}`;
      
      return {
        id,
        type: 'nut',
        name: `${standard} ${size} Nut`,
        position,
        standard,
        size,
        material: {
          type: 'metal',
          name: 'Steel', 
          density: 7850,
          color: '#555555'
        },
        color: '#555555',
        surfaceFinish: 'Ra 1.6',
        tolerance: 0.1,
        metadata: {
          thickness: 0, // Add actual nut dimensions
          width: 0,
          threadDiameter: 0
        }
      };
    }
    
    // Genera una rondella standard
    static generateWasher(standard: string, size: string, position: Point3D): StandardComponentElement {
      const id = `washer_${standard.replace(/\s+/g, '_')}_${size}_${Date.now()}`;
      
      return {
        id,
        type: 'washer',
        name: `${standard} ${size} Washer`,
        position,
        standard,
        size,
        material: {
          type: 'metal', 
          name: 'Steel',
          density: 7850,
          color: '#555555'
        },
        color: '#555555',
        surfaceFinish: 'Ra 1.6',
        tolerance: 0.1,
        metadata: {
          innerDiameter: 0, // Add actual washer dimensions
          outerDiameter: 0,
          thickness: 0
        }
      };
    }
    
    // Database di dimensioni standard per bulloni
    private static getBoltSizes(standard: string): Record<string, any> {
      // Dimensioni basate su ISO 4762 (viti a testa cilindrica con esagono incassato)
      const isoBoltSizes = {
        'M3': { headDiameter: 5.5, headHeight: 3.0, threadDiameter: 3.0, pitch: 0.5 },
        'M4': { headDiameter: 7.0, headHeight: 4.0, threadDiameter: 4.0, pitch: 0.7 },
        'M5': { headDiameter: 8.5, headHeight: 5.0, threadDiameter: 5.0, pitch: 0.8 },
        'M6': { headDiameter: 10.0, headHeight: 6.0, threadDiameter: 6.0, pitch: 1.0 },
        'M8': { headDiameter: 13.0, headHeight: 8.0, threadDiameter: 8.0, pitch: 1.25 },
        'M10': { headDiameter: 16.0, headHeight: 10.0, threadDiameter: 10.0, pitch: 1.5 },
        'M12': { headDiameter: 18.0, headHeight: 12.0, threadDiameter: 12.0, pitch: 1.75 },
        'M16': { headDiameter: 24.0, headHeight: 16.0, threadDiameter: 16.0, pitch: 2.0 },
        'M20': { headDiameter: 30.0, headHeight: 20.0, threadDiameter: 20.0, pitch: 2.5 },
        // Aggiungi altri formati standard secondo necessità
      };
      
      // Restituisci le dimensioni appropriate in base allo standard specificato
      switch (standard) {
        case 'ISO 4762':
        case 'DIN 912':
          return isoBoltSizes;
        // Aggiungi altri standard secondo necessità
        default:
          return isoBoltSizes; // Default: ISO 4762
      }
    }
    
    // ... altri metodi helper e database di dimensioni standard
  }