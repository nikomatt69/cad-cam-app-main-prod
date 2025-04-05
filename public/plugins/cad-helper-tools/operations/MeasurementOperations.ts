/**
 * Measures the distance between two points or entities
 */
export async function measureDistance(
    p1: { x: number; y: number; z?: number } | string,
    p2: { x: number; y: number; z?: number } | string
  ): Promise<{ distance: number; unit: string }> {
    // Handle if entity IDs are provided instead of points
    if (typeof p1 === 'string' || typeof p2 === 'string') {
      // In a real implementation, you would get the entities and calculate based on them
      console.log('Measuring distance between entities', p1, p2);
      
      // For this example, we'll just return a random value
      return {
        distance: Math.random() * 100,
        unit: 'mm'
      };
    }
    
    // Ensure z values
    const z1 = p1.z || 0;
    const z2 = p2.z || 0;
    
    // Calculate 3D distance
    const distance = Math.sqrt(
      Math.pow(p2.x - p1.x, 2) + 
      Math.pow(p2.y - p1.y, 2) + 
      Math.pow(z2 - z1, 2)
    );
    
    console.log('Measured distance:', distance);
    
    return {
      distance,
      unit: 'mm'
    };
  }
  
  /**
   * Measures the angle between two lines or three points
   */
  export async function measureAngle(
    a: { x: number; y: number; z?: number } | string,
    b: { x: number; y: number; z?: number } | string,
    c?: { x: number; y: number; z?: number } | string
  ): Promise<{ angle: number; unit: string }> {
    // Handle if entity IDs are provided instead of points
    if (typeof a === 'string' || typeof b === 'string' || (c && typeof c === 'string')) {
      // In a real implementation, you would get the entities and calculate based on them
      console.log('Measuring angle between entities', a, b, c);
      
      // For this example, we'll just return a random value
      return {
        angle: Math.random() * 180,
        unit: 'degrees'
      };
    }
    
    let angle: number;
    
    if (c) {
      // Calculate angle between three points
      const pointA = a as { x: number; y: number; z?: number };
      const pointB = b as { x: number; y: number; z?: number };
      const pointC = c as { x: number; y: number; z?: number };

      const za = pointA.z || 0;
      const zb = pointB.z || 0;
      const zc = pointC.z || 0;
      
      // Vector BA
      const v1x = pointA.x - pointB.x;
      const v1y = pointA.y - pointB.y;
      const v1z = za - zb;
      // Vector BC
      const v2x = pointC.x - pointB.x;
      const v2y = pointC.y - pointB.y;
      const v2z = zc - zb;
      
      // Calculate dot product
      const dotProduct = v1x * v2x + v1y * v2y + v1z * v2z;
      
      // Calculate magnitudes
      const v1Mag = Math.sqrt(v1x * v1x + v1y * v1y + v1z * v1z);
      const v2Mag = Math.sqrt(v2x * v2x + v2y * v2y + v2z * v2z);
      
      // Calculate angle in radians
      const angleRad = Math.acos(dotProduct / (v1Mag * v2Mag));
      
      // Convert to degrees
      angle = angleRad * (180 / Math.PI);
    } else {
      // If only two points are provided, return 0 (or throw an error)
      angle = 0;
    }
    
    console.log('Measured angle:', angle);
    
    return {
      angle,
      unit: 'degrees'
    };
  }
  
  /**
   * Measures the area of a closed shape
   */
  export async function measureArea(
    shapeId: string | { points: { x: number; y: number; z?: number }[] }
  ): Promise<{ area: number; unit: string }> {
    // Handle if entity ID is provided
    if (typeof shapeId === 'string') {
      // In a real implementation, you would get the entity and calculate based on it
      console.log('Measuring area of entity', shapeId);
      
      // For this example, we'll just return a random value
      return {
        area: Math.random() * 1000,
        unit: 'mm²'
      };
    }
    
    // Calculate area of polygon using Shoelace formula (Gauss's area formula)
    const points = shapeId.points;
    
    if (points.length < 3) {
      throw new Error('At least 3 points are required to calculate area');
    }
    
    // Project to XY plane if 3D
    const xyPoints = points.map(p => ({ x: p.x, y: p.y }));
    
    // Apply Shoelace formula
    let area = 0;
    for (let i = 0; i < xyPoints.length; i++) {
      const j = (i + 1) % xyPoints.length;
      area += xyPoints[i].x * xyPoints[j].y;
      area -= xyPoints[j].x * xyPoints[i].y;
    }
    
    area = Math.abs(area) / 2;
    
    console.log('Measured area:', area);
    
    return {
      area,
      unit: 'mm²'
    };
  }