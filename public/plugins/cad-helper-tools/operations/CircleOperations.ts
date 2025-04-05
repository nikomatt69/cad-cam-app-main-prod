/**
 * Creates a circle that passes through three points
 */
export async function createCircleBy3Points(
    p1: { x: number; y: number; z?: number }, 
    p2: { x: number; y: number; z?: number }, 
    p3: { x: number; y: number; z?: number }
  ): Promise<string> {
    // Ensure z values
    const z1 = p1.z || 0;
    const z2 = p2.z || 0;
    const z3 = p3.z || 0;
    
    // If the points are not coplanar, use the XY projection
    if (Math.abs(z1 - z2) > 0.001 || Math.abs(z2 - z3) > 0.001 || Math.abs(z1 - z3) > 0.001) {
      console.warn('Points are not coplanar, using XY projection');
    }
    
    // Function to calculate determinant for circle center calculation
    function det(
      a: number, b: number, c: number,
      d: number, e: number, f: number,
      g: number, h: number, i: number
    ): number {
      return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
    }
    
    // Calculate circle center
    const A = det(
      p1.x, p1.y, 1,
      p2.x, p2.y, 1,
      p3.x, p3.y, 1
    );
    
    const Bx = -det(
      p1.x * p1.x + p1.y * p1.y, p1.y, 1,
      p2.x * p2.x + p2.y * p2.y, p2.y, 1,
      p3.x * p3.x + p3.y * p3.y, p3.y, 1
    );
    
    const By = det(
      p1.x * p1.x + p1.y * p1.y, p1.x, 1,
      p2.x * p2.x + p2.y * p2.y, p2.x, 1,
      p3.x * p3.x + p3.y * p3.y, p3.x, 1
    );
    
    const C = -det(
      p1.x * p1.x + p1.y * p1.y, p1.x, p1.y,
      p2.x * p2.x + p2.y * p2.y, p2.x, p2.y,
      p3.x * p3.x + p3.y * p3.y, p3.x, p3.y
    );
    
    // Check if points are collinear (A would be 0 or very close to 0)
    if (Math.abs(A) < 0.000001) {
      throw new Error('Points are collinear, cannot create a circle');
    }
    
    const centerX = -Bx / (2 * A);
    const centerY = -By / (2 * A);
    const centerZ = (z1 + z2 + z3) / 3; // Use average z as center z
    
    // Calculate radius
    const radius = Math.sqrt(
      Math.pow(centerX - p1.x, 2) + 
      Math.pow(centerY - p1.y, 2) + 
      Math.pow(centerZ - z1, 2)
    );
    
    // In a real implementation, you would call an API to create the circle
    // For this example, we just return a mock ID
    console.log('Creating circle by 3 points:', {
      center: { x: centerX, y: centerY, z: centerZ },
      radius,
      points: [p1, p2, p3]
    });
    
    return `circle-${Date.now()}`;
  }
  
  /**
   * Creates a circle by defining diameter points
   */
  export async function createCircleByDiameter(
    p1: { x: number; y: number; z?: number }, 
    p2: { x: number; y: number; z?: number }
  ): Promise<string> {
    // Ensure z values
    const z1 = p1.z || 0;
    const z2 = p2.z || 0;
    
    // Calculate center point
    const centerX = (p1.x + p2.x) / 2;
    const centerY = (p1.y + p2.y) / 2;
    const centerZ = (z1 + z2) / 2;
    
    // Calculate radius
    const radius = Math.sqrt(
      Math.pow(p2.x - p1.x, 2) + 
      Math.pow(p2.y - p1.y, 2) + 
      Math.pow(z2 - z1, 2)
    ) / 2;
    
    // In a real implementation, you would call an API to create the circle
    // For this example, we just return a mock ID
    console.log('Creating circle by diameter:', {
      center: { x: centerX, y: centerY, z: centerZ },
      radius,
      points: [p1, p2]
    });
    
    return `circle-${Date.now()}`;
  }