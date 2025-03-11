// src/pages/api/machine-configs/[id].ts
import { requireAuth, sendSuccessResponse } from '@/src/lib/api/auth';
import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { prisma } from 'src/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await requireAuth(req, res);
  if (!userId) return;
  
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'Drawing ID is required' });
  }
  
  // Set common headers

  
  try {
    // Get the machine config
    const machineConfig = await prisma.machineConfig.findUnique({
      where: { id },
      include: {
        toolPaths: {
          select: {
            id: true,
            drawing: {
              select: {
                project: {
                  select: {
                    ownerId: true,
                    organization: {
                      select: {
                        users: {
                          where: { userId },
                          select: { id: true }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
    
    if (!machineConfig) {
      return res.status(404).json({ message: 'Machine configuration not found' });
    }
    
    // Check if user has permission to access this config
    const hasAccess = machineConfig.toolPaths.some(tp => 
      tp.drawing?.project?.ownerId === userId || 
      (tp.drawing?.project?.organization?.users && tp.drawing?.project?.organization?.users.length > 0)
    );
    
    if (!hasAccess) {
      return res.status(403).json({ message: 'You do not have permission to access this machine configuration' });
    }
    
    // Handle different HTTP methods
    if (req.method === 'GET') {
      return res.status(200).json(machineConfig);
    } else if (req.method === 'PUT') {
      const { name, description, type, config } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: 'Machine configuration name is required' });
      }
      
      const updatedConfig = await prisma.machineConfig.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(config && { config }),
          ...(type && { type }),
          updatedAt: new Date()
        }
      });
      
      return sendSuccessResponse(res, updatedConfig, 'Machine configuration  updated successfully');
    } else if (req.method === 'DELETE') {
      // Check if the machine config is being used by any toolpaths
      if (machineConfig.toolPaths.length > 0) {
        return res.status(400).json({ 
          message: 'Cannot delete machine configuration as it is being used by toolpaths'
        });
      }
      
      await prisma.machineConfig.delete({
        where: { id }
      });
      
      return res.status(200).json({ message: 'Machine configuration deleted successfully' });
    } else {
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error(`Error handling machine config ${req.method} request:`, error);
    return res.status(500).json({ message: `Failed to ${req.method?.toLowerCase()} machine configuration` });
  }
}