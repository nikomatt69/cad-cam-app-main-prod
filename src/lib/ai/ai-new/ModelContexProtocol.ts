// src/lib/ai/ModelContextProtocol.ts

import { AIModelType, AIRequest, AIResponse } from '@/src/types/AITypes';
import { Element } from '@/src/store/elementsStore';
import { useCADStore } from '@/src/store/cadStore';

/**
 * Model Context Protocol (MCP) for enhancing CAD element generation
 * This protocol adds context awareness and design intent understanding
 * to the text-to-CAD conversion process
 */
export class ModelContextProtocol {
  private contextHistory: Array<{
    query: string;
    result: any;
    timestamp: number;
    designIntent: string;
  }> = [];
  
  private cadElementTemplates: Record<string, any> = {};
  private currentDesignContext: string = '';
  private defaultTolerance: number = 0.1; // mm
  private defaultSurfaceFinish: string = 'Ra 3.2';
  private defaultMaterial: any = {
    type: 'metal',
    name: 'Aluminum 6061',
    density: 2700,
    color: '#A9A9A9',
    youngsModulus: 69e9,
    tensileStrength: 310e6,
    thermalConductivity: 167
  };

  constructor() {
    // Load predefined element templates
    this.loadElementTemplates();
  }

  /**
   * Process a text-to-CAD request with enhanced context awareness
   */
  async processRequest(description: string, options: {
    preserveContext?: boolean;
    designIntent?: string;
    preferredElementTypes?: string[];
    precisionLevel?: 'low' | 'standard' | 'high' | 'ultra';
    constraintRules?: Record<string, any>;
    referenceElements?: Element[];
    workspaceContext?: string;
  } = {}): Promise<AIResponse<Element[]>> {
    // Analyze design intent from the description
    const designIntent = options.designIntent || this.analyzeDesignIntent(description);
    
    // Build the enhanced prompt
    const enhancedPrompt = this.buildEnhancedPrompt(description, designIntent, options);
    
    // Call the AI service with the enhanced prompt
    const result = await this.callAIService(enhancedPrompt);
    
    // Post-process the generated elements to ensure quality
    const processedElements = this.postProcessElements(result.data || [], options);
    
    // Update context history if needed
    if (options.preserveContext !== false) {
      this.updateContextHistory(description, processedElements, designIntent);
    }
    
    return {
      ...result,
      data: processedElements
    };
  }

  /**
   * Build an enhanced prompt with context and design intent
   */
  private buildEnhancedPrompt(description: string, designIntent: string, options: any): string {
    const systemPrompt = `You are an expert CAD engineer specializing in precision mechanical, industrial, and architectural design. Your task is to convert text descriptions into detailed 3D CAD elements.

OUTPUT FORMAT: Return ONLY a valid JSON array of CAD elements with precise engineering specifications without any explanations or comments.

DESIGN CONTEXT: ${this.currentDesignContext || 'Creating new design elements'}
DESIGN INTENT: ${designIntent}
PRECISION LEVEL: ${options.precisionLevel || 'standard'}

AVAILABLE ELEMENT TYPES:

1. BASIC PRIMITIVES:
- cube: width, height, depth, position{x,y,z}, roundedCorners(bool), cornerRadius
- sphere: radius, position{x,y,z}, segments
- cylinder: radius, height, position{x,y,z}, segments, capped(bool)
- cone: radiusBottom, radiusTop, height, position{x,y,z}, segments
- torus: radius, tubeRadius, position{x,y,z}, tubularSegments, radialSegments

2. ADVANCED PRIMITIVES:
- pyramid: baseWidth, baseDepth, height, position{x,y,z}, sides
- prism: radius, height, position{x,y,z}, sides
- hemisphere: radius, position{x,y,z}, segments, direction("up"/"down")
- ellipsoid: radiusX, radiusY, radiusZ, position{x,y,z}
- capsule: radius, height, position{x,y,z}, direction("x"/"y"/"z")

3. TRANSFORMATION OPERATIONS:
- extrusion: profile(array of Point2D), depth, position{x,y,z}, taper, bevel
- revolution: profile(array of Point2D), angle, axis, position{x,y,z}
- sweep: profile(array of Point2D), path(array of Point3D), position{x,y,z}
- loft: profiles(array of array of Point2D), positions(array of Point3D)

4. BOOLEAN OPERATIONS:
- boolean-union: operands(array of element IDs)
- boolean-subtract: operands(array of element IDs)
- boolean-intersect: operands(array of element IDs)

5. SPECIALIZED ELEMENTS:
- gear: moduleValue, teeth, pressureAngle, thickness, position{x,y,z}
- thread: diameter, pitch, length, handedness, position{x,y,z}
- fillet: radius, edges(array of edge IDs)
- chamfer: distance, angle, edges(array of edge IDs)
- text3d: text, height, depth, position{x,y,z}, font

6. STANDARD COMPONENTS:
- screw: standard, size, length, grade, position{x,y,z}, rotation{x,y,z}
- nut: standard, size, grade, position{x,y,z}, rotation{x,y,z}
- bolt: standard, size, length, grade, position{x,y,z}, rotation{x,y,z}
- washer: standard, size, position{x,y,z}, rotation{x,y,z}
- rivet: standard, size, length, position{x,y,z}, rotation{x,y,z}

7. ARCHITECTURAL ELEMENTS:
- wall: length, height, thickness, position{x,y,z}, openings(array)
- floor: width, length, thickness, position{x,y,z}
- roof: width, length, height, style, position{x,y,z}
- window: width, height, thickness, style, position{x,y,z}
- door: width, height, thickness, style, position{x,y,z}

REQUIRED PROPERTIES FOR ALL ELEMENTS:
- id: unique identifier describing the element's function (e.g., "base_plate_01")
- name: descriptive name for the element
- material: {type, name, density, color, ...material-specific properties}
- color: hex color code or name
- surfaceFinish: surface finish specification (Ra, Rz, etc.)
- tolerance: tolerance in mm (appropriate for element function)
- metadata: additional properties as key-value pairs

MATERIAL PROPERTIES:
- type: material category (metal, plastic, wood, ceramic, composite)
- name: specific material name (e.g., "AISI 304", "ABS", "Oak")
- density: density in kg/m³
- color: hex color code
- Metal specific: youngsModulus, tensileStrength, thermalConductivity
- Plastic specific: melting_point, flexural_modulus
- Wood specific: grain_direction, moisture_content
- Ceramic specific: compressive_strength, thermal_expansion

PRECISION AND QUALITY GUIDELINES:
- All dimensions must be in millimeters with 2 decimal precision
- Assign appropriate tolerances based on element function and precision level
- Surface finishes should follow ISO standards
- Position elements in 3D space relative to a common origin
- Ensure proper material properties for each element type
- Use standardized components (screws, bolts) where appropriate
- Create manufacturable designs that follow industry best practices

${options.constraintRules ? `CONSTRAINT RULES: ${JSON.stringify(options.constraintRules, null, 2)}` : ''}

${options.preferredElementTypes?.length ? `PREFERRED ELEMENT TYPES: ${options.preferredElementTypes.join(', ')}` : ''}

Now, create a comprehensive 3D CAD model based on this description:
${description}

The response must be ONLY a valid JSON array of elements with no additional text.`;

    return systemPrompt;
  }

  /**
   * Analyze the design intent from the description
   */
  private analyzeDesignIntent(description: string): string {
    const lowercasedDesc = description.toLowerCase();
    
    // Detect domain
    let domain = 'mechanical';
    if (lowercasedDesc.includes('building') || lowercasedDesc.includes('house') || lowercasedDesc.includes('architecture')) {
      domain = 'architectural';
    } else if (lowercasedDesc.includes('circuit') || lowercasedDesc.includes('pcb') || lowercasedDesc.includes('electronic')) {
      domain = 'electronic';
    } else if (lowercasedDesc.includes('art') || lowercasedDesc.includes('sculpture')) {
      domain = 'artistic';
    }
    
    // Detect complexity
    let complexity = 'moderate';
    if (lowercasedDesc.includes('simple') || lowercasedDesc.includes('basic')) {
      complexity = 'simple';
    } else if (lowercasedDesc.includes('complex') || lowercasedDesc.includes('detailed')) {
      complexity = 'complex';
    } else if (lowercasedDesc.includes('precision') || lowercasedDesc.includes('engineering')) {
      complexity = 'engineering';
    }
    
    // Detect purpose
    let purpose = 'functional';
    if (lowercasedDesc.includes('concept') || lowercasedDesc.includes('idea')) {
      purpose = 'conceptual';
    } else if (lowercasedDesc.includes('manufacturing') || lowercasedDesc.includes('production')) {
      purpose = 'production';
    } else if (lowercasedDesc.includes('assembly') || lowercasedDesc.includes('component')) {
      purpose = 'assembly';
    }
    
    return `${domain} design with ${complexity} complexity for ${purpose} purpose`;
  }

  /**
   * Call the AI service with the enhanced prompt
   */
  private async callAIService(prompt: string): Promise<AIResponse<Element[]>> {
    // Use Claude 3 Opus for high precision CAD generation
    const model: AIModelType = 'claude-3-opus-20240229';
    
    try {
      // Make API request to generate CAD elements
      const response = await fetch('/api/ai/textToCad', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt,
          model,
          temperature: 0.3, // Low temperature for precision
          maxTokens: 4000,
          systemPrompt: "You are a CAD design expert. Generate ONLY valid JSON arrays of CAD elements."
        })
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const result = await response.json();
      
      // Parse the response
      let elements: Element[] = [];
      try {
        // Handle various response formats
        if (typeof result.data === 'string') {
          // Extract JSON from string if needed
          const jsonMatch = result.data.match(/\[\s*\{[\s\S]*\}\s*\]/);
          if (jsonMatch) {
            elements = JSON.parse(jsonMatch[0]);
          }
        } else if (Array.isArray(result.data)) {
          elements = result.data;
        }
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        return {
          rawResponse: result.rawResponse || null,
          data: null,
          error: 'Failed to parse CAD elements from AI response',
          success: false
        };
      }
      
      return {
        rawResponse: result.rawResponse || null,
        data: elements,
        success: true
      };
    } catch (error) {
      console.error('Error calling AI service:', error);
      return {
        rawResponse: null,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      };
    }
  }

  /**
   * Post-process the generated elements to ensure quality
   */
  private postProcessElements(elements: Element[], options: any): Element[] {
    const { originOffset } = useCADStore.getState();
    
    return elements.map(element => {
      // Ensure all required properties exist
      const processedElement = {
        ...element,
        id: element.id || `element_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        name: element.name || `${element.type || 'element'}_${Date.now()}`,
        tolerance: element.tolerance || this.getAppropiateTolerance(element.type, options.precisionLevel),
        surfaceFinish: element.surfaceFinish || this.defaultSurfaceFinish,
        // Ensure proper material properties
        material: this.ensureMaterialProperties(element.material || this.defaultMaterial),
        // Add layerId if missing
        layerId: element.layerId || 'default',
        // Ensure position has all coordinates
        x: (element.x || element.position?.x || 0) + originOffset.x,
        y: (element.y || element.position?.y || 0) + originOffset.y,
        z: (element.z || element.position?.z || 0) + originOffset.z,
      };
      
      // Apply type-specific validations
      return this.validateElementByType(processedElement);
    });
  }

  /**
   * Get appropriate tolerance based on element type and precision level
   */
  private getAppropiateTolerance(elementType: string, precisionLevel: string = 'standard'): number {
    // Define tolerance tiers based on precision level
    const toleranceTiers = {
      'ultra': {
        precision: 0.005,
        standard: 0.01,
        rough: 0.05
      },
      'high': {
        precision: 0.01,
        standard: 0.05,
        rough: 0.1
      },
      'standard': {
        precision: 0.05,
        standard: 0.1,
        rough: 0.2
      },
      'low': {
        precision: 0.1,
        standard: 0.2,
        rough: 0.5
      }
    };
    
    // Select tier based on precision level
    const tier = toleranceTiers[precisionLevel as keyof typeof toleranceTiers] || toleranceTiers.standard;
    
    // Categorize element types
    const precisionElements = ['gear', 'thread', 'bolt', 'bearing', 'shaft'];
    const roughElements = ['wall', 'floor', 'roof'];
    
    if (precisionElements.includes(elementType)) {
      return tier.precision;
    } else if (roughElements.includes(elementType)) {
      return tier.rough;
    } else {
      return tier.standard;
    }
  }

  /**
   * Ensure material has all required properties
   */
  private ensureMaterialProperties(material: any): any {
    if (!material) return this.defaultMaterial;
    
    const result = { ...material };
    
    // Ensure basic properties
    result.type = result.type || 'metal';
    result.name = result.name || 'Aluminum 6061';
    result.density = result.density || 2700;
    result.color = result.color || '#A9A9A9';
    
    // Add type-specific properties
    if (result.type === 'metal') {
      result.youngsModulus = result.youngsModulus || 69e9;
      result.tensileStrength = result.tensileStrength || 310e6;
      result.thermalConductivity = result.thermalConductivity || 167;
    } else if (result.type === 'plastic') {
      result.melting_point = result.melting_point || 200;
      result.flexural_modulus = result.flexural_modulus || 2400e6;
    } else if (result.type === 'wood') {
      result.grain_direction = result.grain_direction || 'longitudinal';
      result.moisture_content = result.moisture_content || 12;
    } else if (result.type === 'ceramic') {
      result.compressive_strength = result.compressive_strength || 1000e6;
      result.thermal_expansion = result.thermal_expansion || 8e-6;
    }
    
    return result;
  }

  /**
   * Validate and fix element-specific properties
   */
  private validateElementByType(element: any): Element {
    switch (element.type) {
      case 'cube':
        return {
          ...element,
          width: element.width || 50,
          height: element.height || 50,
          depth: element.depth || 50
        };
      case 'sphere':
        return {
          ...element,
          radius: element.radius || 25,
          segments: element.segments || 32
        };
      case 'cylinder':
        return {
          ...element,
          radius: element.radius || 25,
          height: element.height || 100,
          segments: element.segments || 32,
          capped: element.capped !== undefined ? element.capped : true
        };
      case 'cone':
        return {
          ...element,
          radiusBottom: element.radiusBottom || 25,
          radiusTop: element.radiusTop || 0,
          height: element.height || 100,
          segments: element.segments || 32
        };
      case 'torus':
        return {
          ...element,
          radius: element.radius || 30,
          tubeRadius: element.tubeRadius || 10,
          tubularSegments: element.tubularSegments || 32,
          radialSegments: element.radialSegments || 16
        };
      case 'extrusion':
        return {
          ...element,
          depth: element.depth || 20,
          profile: element.profile || this.getDefaultProfile(),
          shape: element.shape || 'custom'
        };
      // Add similar validation for other element types
      default:
        return element;
    }
  }
  
  /**
   * Get a default 2D profile for extrusions
   */
  private getDefaultProfile(): { x: number, y: number }[] {
    return [
      { x: -25, y: -25 },
      { x: 25, y: -25 },
      { x: 25, y: 25 },
      { x: -25, y: 25 }
    ];
  }

  /**
   * Update context history with the latest request and result
   */
  private updateContextHistory(query: string, result: Element[], designIntent: string): void {
    // Add to history
    this.contextHistory.push({
      query,
      result,
      timestamp: Date.now(),
      designIntent
    });
    
    // Limit history size
    if (this.contextHistory.length > 10) {
      this.contextHistory = this.contextHistory.slice(-10);
    }
    
    // Update current design context based on history
    this.updateDesignContext();
  }

  /**
   * Update current design context based on history
   */
  private updateDesignContext(): void {
    if (this.contextHistory.length === 0) {
      this.currentDesignContext = '';
      return;
    }
    
    // Extract key information from history
    const elementTypes = new Set<string>();
    const materials = new Set<string>();
    const designIntents = new Set<string>();
    let totalElements = 0;
    this.contextHistory.forEach(item => {
      item.result.forEach((element: { type: string; material?: { name: string } }) => {
        elementTypes.add(element.type);
        if (element.material?.name) materials.add(element.material.name);
      });
      designIntents.add(item.designIntent);
      totalElements += item.result.length;
    });
    
    // Build context summary
    this.currentDesignContext = `Current design with ${totalElements} elements ` +
      `using ${Array.from(elementTypes).join(', ')} types ` +
      `and ${Array.from(materials).join(', ')} materials. ` +
      `Design intents: ${Array.from(designIntents).join(', ')}.`;
  }

  /**
   * Load predefined element templates for common parts
   */
  private loadElementTemplates(): void {
    // These templates can speed up generation of common elements
    this.cadElementTemplates = {
      'standard_bolt': {
        type: 'bolt',
        standard: 'ISO 4762',
        material: {
          type: 'metal',
          name: 'Steel',
          density: 7850,
          color: '#666666',
          youngsModulus: 200e9,
          tensileStrength: 500e6,
          thermalConductivity: 50.2
        },
        tolerance: 0.01,
        surfaceFinish: 'Ra 1.6',
      },
      'aluminum_plate': {
        type: 'cube',
        material: {
          type: 'metal',
          name: 'Aluminum 6061',
          density: 2700,
          color: '#A9A9A9',
          youngsModulus: 69e9,
          tensileStrength: 310e6,
          thermalConductivity: 167
        },
        tolerance: 0.1,
        surfaceFinish: 'Ra 3.2',
      },
      // Add more templates as needed
    };
  }
}

// Export singleton instance
export const modelContextProtocol = new ModelContextProtocol();