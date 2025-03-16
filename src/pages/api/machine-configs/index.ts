// src/pages/api/machine-configs/index.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from 'src/lib/prisma';
import { 
  sendSuccessResponse, 
  sendErrorResponse, 
  handleApiError, 
  requireAuth 
} from 'src/lib/api/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const userId = await requireAuth(req, res);
    if (!userId) return;
    
    // Handle GET request - List machine configs
    if (req.method === 'GET') {
      // Extract query parameters
      const { type, search, public: isPublic } = req.query;
      
      // Build the query with proper Prisma structure
      const whereClause: any = {
        OR: [
          // User's own configs
          { ownerId: userId },
          // Public configs if requested
          ...(isPublic === 'true' ? [{ isPublic: true }] : [])
        ]
      };
      
      // Apply additional filters
      if (type) {
        whereClause.type = type;
      }
      
      if (search && typeof search === 'string') {
        whereClause.OR.push(
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        );
      }
      
      const machineConfigs = await prisma.machineConfig.findMany({
        where: whereClause,
        orderBy: { updatedAt: 'desc' }
      });
      
      return sendSuccessResponse(res, machineConfigs);
    } 
    // Handle POST request - Create machine config
    else if (req.method === 'POST') {
      const { name, description, type, config, isPublic } = req.body;
      
      // Validate required fields
      if (!name) {
        return sendErrorResponse(res, 'Machine configuration name is required', 400);
      }
      
      if (!type) {
        return sendErrorResponse(res, 'Machine type is required', 400);
      }
      
      if (!config) {
        return sendErrorResponse(res, 'Configuration data is required', 400);
      }
      
      // Create new machine config
      const machineConfig = await prisma.machineConfig.create({
        data: {
          name,
          description,
          type,
          config,
          ownerId: userId,
          isPublic: isPublic ?? false // Use false if isPublic is undefined (optional field)
        }
      });
      return sendSuccessResponse(res, machineConfig, 'Machine configuration created successfully');
    } else {
      return sendErrorResponse(res, 'Method not allowed', 405);
    }
  } catch (error) {
    return handleApiError(error, res);
  }
}