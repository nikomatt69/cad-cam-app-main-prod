// Crea un nuovo file: src/lib/ai/qualityValidator.ts

import { CADElement, CubeElement, CylinderElement, SphereElement } from "@/src/types/AITypes";

export class QualityValidator {
    // Valida tutti gli elementi e corregge errori o inconsistenze
    static validateAndImprove(elements: CADElement[]): { 
      elements: CADElement[],
      issues: string[],
      improvementsMade: string[]
    } {
      const issues: string[] = [];
      const improvementsMade: string[] = [];
      const validatedElements: CADElement[] = [];
      
      // Controlla ogni elemento
      for (const element of elements) {
        const result = this.validateElement(element);
        
        // Aggiungi problemi e miglioramenti identificati
        if (result.issues.length > 0) {
          issues.push(...result.issues.map(issue => `Elemento ${element.id}: ${issue}`));
        }
        
        if (result.improvementsMade.length > 0) {
          improvementsMade.push(...result.improvementsMade.map(imp => `Elemento ${element.id}: ${imp}`));
        }
        
        // Aggiungi l'elemento validato
        validatedElements.push(result.element);
      }
      
      // Controlla le relazioni tra elementi (distanze, intersezioni, ecc.)
      const relationshipChecks = this.validateRelationships(validatedElements);
      issues.push(...relationshipChecks.issues);
      improvementsMade.push(...relationshipChecks.improvementsMade);
      
      return {
        elements: relationshipChecks.elements,
        issues,
        improvementsMade
      };
    }
    
    // Valida un singolo elemento
    private static validateElement(element: CADElement): {
      element: CADElement,
      issues: string[],
      improvementsMade: string[]
    } {
      const issues: string[] = [];
      const improvementsMade: string[] = [];
      
      // Crea una copia dell'elemento da modificare
      let validatedElement = { ...element };
      
      // Controlla la presenza di proprietà richieste
      if (!validatedElement.id) {
        validatedElement.id = `auto_${validatedElement.type}_${Date.now()}`;
        issues.push('ID mancante');
        improvementsMade.push('Generato ID automatico');
      }
      
      if (!validatedElement.name) {
        validatedElement.name = `${validatedElement.type.charAt(0).toUpperCase() + validatedElement.type.slice(1)}`;
        issues.push('Nome mancante');
        improvementsMade.push('Aggiunto nome predefinito');
      }
      
      if (!validatedElement.material || !validatedElement.material.name) {
        validatedElement.material = {
          type: 'metal',
          name: 'Steel',
          density: 7850,
          color: '#CCCCCC'
        };
        issues.push('Materiale non specificato');
        improvementsMade.push('Aggiunto materiale predefinito (Steel)');
      }
      
      // Controlli specifici per tipo
      switch (validatedElement.type) {
        case 'cube':
          this.validateCube(validatedElement as CubeElement, issues, improvementsMade);
          break;
        case 'sphere':
          this.validateSphere(validatedElement as SphereElement, issues, improvementsMade);
          break;
        case 'cylinder':
          this.validateCylinder(validatedElement as CylinderElement, issues, improvementsMade);
          break;
        // Aggiungi controlli per altri tipi
      }
      
      return {
        element: validatedElement,
        issues,
        improvementsMade
      };
    }
    
    // Valida un cubo
    private static validateCube(cube: CubeElement, issues: string[], improvementsMade: string[]): void {
      // Controlla le dimensioni
      if (cube.width <= 0) {
        cube.width = 10;
        issues.push('Larghezza non valida');
        improvementsMade.push('Corretta larghezza a 10mm');
      }
      
      if (cube.height <= 0) {
        cube.height = 10;
        issues.push('Altezza non valida');
        improvementsMade.push('Corretta altezza a 10mm');
      }
      
      if (cube.depth <= 0) {
        cube.depth = 10;
        issues.push('Profondità non valida');
        improvementsMade.push('Corretta profondità a 10mm');
      }
      
      // Arrotonda le dimensioni a 2 decimali per precisione
      cube.width = parseFloat(cube.width.toFixed(2));
      cube.height = parseFloat(cube.height.toFixed(2));
      cube.depth = parseFloat(cube.depth.toFixed(2));
      improvementsMade.push('Arrotondate dimensioni a 2 decimali');
    }
    
    // Valida una sfera
    private static validateSphere(sphere: SphereElement, issues: string[], improvementsMade: string[]): void {
      // Controlla il raggio
      if (sphere.radius <= 0) {
        sphere.radius = 10;
        issues.push('Raggio non valido');
        improvementsMade.push('Corretto raggio a 10mm');
      }
      
      // Arrotonda il raggio a 2 decimali per precisione
      sphere.radius = parseFloat(sphere.radius.toFixed(2));
      improvementsMade.push('Arrotondato raggio a 2 decimali');
      
      // Aggiungi un numero appropriato di segmenti se non specificato
      if (!sphere.segments || sphere.segments < 8) {
        sphere.segments = Math.max(16, Math.ceil(sphere.radius * 2));
        improvementsMade.push(`Ottimizzato numero di segmenti a ${sphere.segments}`);
      }
    }
    
    // Valida un cilindro
    private static validateCylinder(cylinder: CylinderElement, issues: string[], improvementsMade: string[]): void {
      // Implementazione simile alla validazione della sfera
      // ...
    }
    
    // Valida le relazioni tra elementi
    private static validateRelationships(elements: CADElement[]): {
      elements: CADElement[],
      issues: string[],
      improvementsMade: string[]
    } {
      const issues: string[] = [];
      const improvementsMade: string[] = [];
      
      // Controlla se ci sono elementi sovrapposti o troppo vicini
      // ...
      
      // Controlla se i componenti standard hanno posizioni valide
      // ...
      
      // Verifica che gli elementi di un assemblaggio siano correttamente posizionati
      // ...
      
      return {
        elements,
        issues,
        improvementsMade
      };
    }
  }