export interface GCodeCommand {
    command: string;
    parameters: Record<string, number>;
    comment?: string;
  }
  
  export interface GCodeValidationResult {
    isValid: boolean;
    errors: string[];
    warnings?: string[];
  }
  
  export interface GCodeMetrics {
    travelDistance: number;
    estimatedTime: number;
    rapidMoves: number;
    feedMoves: number;
    toolChanges: number;
    maxZ: number;
    minZ: number;
    boundingBox: {
      min: { x: number; y: number; z: number };
      max: { x: number; y: number; z: number };
    };
  }