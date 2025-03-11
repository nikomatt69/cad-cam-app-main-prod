import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { prisma } from 'src/lib/prisma';
import { sendErrorResponse, sendSuccessResponse, handleApiError } from 'src/lib/api/helpers';
import { requireAuth } from '@/src/lib/api/auth';

export async function handleComponentById(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Ensure user is authenticated
    const userId = await requireAuth(req, res);
    if (!userId) return;
    
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Drawing ID is required' });
    }
    
    
    // Fetch the component with access check
    const component = await prisma.component.findFirst({
      where: {
        id,
        OR: [
          // User's own components
          { project: { ownerId: userId } },
          // Components in organization projects
          {
            project: {
              organization: {
                users: {
                  some: {
                    userId
                  }
                }
              }
            }
          },
          // Public components
          { isPublic: true }
        ]
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            ownerId: true
          }
        }
      }
    });
    
    if (!component) {
      return sendErrorResponse(res, 'Component not found or access denied', 404);
    }
    
    // Handle GET request - Get component details
    if (req.method === 'GET') {
      return sendSuccessResponse(res, component);
    }
    
    // For modification operations, need to verify write access
    const hasWriteAccess = component.project.ownerId === userId;
    
    if (!hasWriteAccess) {
      return sendErrorResponse(res, 'You do not have permission to modify this component', 403);
    }
    
    // Handle PUT request - Update component
    if (req.method === 'PUT') {
      const { name, description, data, type, isPublic } = req.body;
      
      const updatedComponent = await prisma.component.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(data && { data }),
          ...(type && { type }),
          ...(isPublic !== undefined && { isPublic }),
          updatedAt: new Date()
        }
      });
      
      return sendSuccessResponse(res, updatedComponent, 'Component updated successfully');
    }
    
    // Handle DELETE request - Delete component
    if (req.method === 'DELETE') {
      await prisma.component.delete({
        where: { id }
      });
      
      return sendSuccessResponse(res, null, 'Component deleted successfully');
    }
    
    // Handle unsupported methods
    return sendErrorResponse(res, 'Method not allowed', 405);
  } catch (error) {
    return handleApiError(error, res);
  }
}
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return handleComponentById(req, res);
}

