// Crea un nuovo file: src/lib/ai/technicalDocGenerator.ts

import { CADElement, CubeElement, CylinderElement, SphereElement } from "@/src/types/AITypes";

export class TechnicalDocGenerator {
    // Genera una documentazione tecnica completa per tutti gli elementi
    static generateDocumentation(elements: CADElement[]): string {
      let documentation = `# Documentazione Tecnica\n\n`;
      
      // Aggiungi data e sommario
      documentation += `Data: ${new Date().toISOString().split('T')[0]}\n\n`;
      documentation += `## Sommario\n\n`;
      documentation += `- Componenti totali: ${elements.length}\n`;
      documentation += `- Tipi di elementi: ${this.getUniqueTypes(elements).join(', ')}\n`;
      documentation += `- Materiali utilizzati: ${this.getUniqueMaterials(elements).join(', ')}\n\n`;
      
      // Aggiungi elenco degli elementi
      documentation += `## Elementi\n\n`;
      
      elements.forEach(element => {
        documentation += `### ${element.name} (ID: ${element.id})\n\n`;
        documentation += `- Tipo: ${element.type}\n`;
        documentation += `- Materiale: ${element.material?.name || 'Non specificato'}\n`;
        documentation += `- Posizione: X=${element.position.x}mm, Y=${element.position.y}mm, Z=${element.position.z}mm\n`;
        
        // Aggiungi proprietà specifiche in base al tipo
        switch (element.type) {
          case 'cube':
            const cube = element as CubeElement;
            documentation += `- Dimensioni: ${cube.width}mm × ${cube.height}mm × ${cube.depth}mm\n`;
            break;
          case 'sphere':
            const sphere = element as SphereElement;
            documentation += `- Raggio: ${sphere.radius}mm\n`;
            break;
          case 'cylinder':
            const cylinder = element as CylinderElement;
            documentation += `- Raggio: ${cylinder.radius}mm\n`;
            documentation += `- Altezza: ${cylinder.height}mm\n`;
            break;
          // Aggiungi casi per altri tipi
        }
        
        // Aggiungi tolleranze e finiture
        if (element.tolerance) {
          documentation += `- Tolleranza: ±${element.tolerance}mm\n`;
        }
        
        if (element.surfaceFinish) {
          documentation += `- Finitura superficiale: ${element.surfaceFinish}\n`;
        }
        
        // Aggiungi metadati
        if (element.metadata && Object.keys(element.metadata).length > 0) {
          documentation += `- Metadati: \n`;
          for (const [key, value] of Object.entries(element.metadata)) {
            documentation += `  - ${key}: ${value}\n`;
          }
        }
        
        documentation += `\n`;
      });
      
      // Aggiungi note di produzione
      documentation += `## Note di Produzione\n\n`;
      documentation += `- Tutte le dimensioni sono in millimetri\n`;
      documentation += `- Tolleranze generali: ±0.1mm se non diversamente specificato\n`;
      documentation += `- Finitura superficiale: Ra 3.2 se non diversamente specificato\n\n`;
      
      return documentation;
    }
    
    // Ottiene i tipi unici di elementi
    private static getUniqueTypes(elements: CADElement[]): string[] {
      return Array.from(new Set(elements.map(el => el.type)));
    }
    
    // Ottiene i materiali unici
    private static getUniqueMaterials(elements: CADElement[]): string[] {
      const materials = elements.map(el => el.material?.name).filter(Boolean) as string[];
      return Array.from(new Set(materials));
    }
  }