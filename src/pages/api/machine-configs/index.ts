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
      
      // Build the query
      const query: any = {
        where: {
          OR: [
            // User's own configs
            { ownerId: userId },
            // Configs in organizations where user is a member
            {
              organization: {
                users: {
                  some: { userId }
                }
              }
            },
            // Public configs if requested
            ...(isPublic === 'true' ? [{ isPublic: true }] : [])
          ]
        },
        orderBy: { updatedAt: 'desc' }
      };
      
      // Apply additional filters
      if (type) {
        query.where.type = type;
      }
      
      if (search && typeof search === 'string') {
        query.where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }
      
      const machineConfigs = await prisma.machineConfig.findMany(query);
      
      return sendSuccessResponse(res, machineConfigs);
    } 
    // Handle POST request - Create machine config
    else if (req.method === 'POST') {
      const { name, description, type, config, organizationId, isPublic } = req.body;
      
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
      
      // If organizationId is provided, verify membership
      if (organizationId) {
        const organizationMember = await prisma.userOrganization.findFirst({
          where: {
            userId,
            organizationId
          }
        });
        
        if (!organizationMember) {
          return sendErrorResponse(res, 'You are not a member of the specified organization', 403);
        }
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