// src/pages/api/toolpaths/[id].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from 'src/lib/prisma';
import { requireAuth } from 'src/lib/api/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await requireAuth(req, res);
  if (!userId) return;
  
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'Toolpath ID is required' });
  }
  
  // Get the toolpath with related data
  const toolpath = await prisma.toolPath.findUnique({
    where: { id },
    include: {
      drawing: {
        select: {
          id: true,
          name: true,
          project: {
            select: {
              id: true,
              ownerId: true,
              organization: {
                select: {
                  id: true,
                  users: {
                    where: { userId },
                    select: { role: true }
                  }
                }
              }
            }
          }
        }
      },
      material: {
        select: {
          id: true,
          name: true
        }
      },
      machineConfig: {
        select: {
          id: true,
          name: true,
          type: true
        }
      },
      tool: {
        select: {
          id: true,
          name: true,
          type: true
        }
      }
    }
  });
  
  if (!toolpath) {
    return res.status(404).json({ message: 'Toolpath not found' });
  }
  
  // Verify user has access to this toolpath
  const hasAccess = 
    toolpath.drawing.project.ownerId === userId || 
    (toolpath.drawing.project.organization && 
      toolpath.drawing.project.organization.users.length > 0);
  
  if (!hasAccess) {
    return res.status(403).json({ message: 'You do not have permission to access this toolpath' });
  }
  
  // Handle different HTTP methods
  if (req.method === 'GET') {
    return res.status(200).json(toolpath);
  } else if (req.method === 'PUT') {
    try {
      const { 
        name, 
        description, 
        data, 
        gcode, 
        materialId, 
        machineConfigId, 
        toolId,
        simulation 
      } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: 'Toolpath name is required' });
      }
      
      const updatedToolpath = await prisma.toolPath.update({
        where: { id },
        data: {
          name,
          description,
          ...(data && { data }),
          ...(gcode && { gcode }),
          ...(simulation && { simulation }),
          materialId,
          machineConfigId,
          toolId,
          updatedAt: new Date()
        }
      });
      
      return res.status(200).json(updatedToolpath);
    } catch (error) {
      console.error('Failed to update toolpath:', error);
      return res.status(500).json({ message: 'Failed to update toolpath' });
    }
  } else if (req.method === 'DELETE') {
    try {
      await prisma.toolPath.delete({
        where: { id }
      });
      
      return res.status(200).json({ message: 'Toolpath deleted successfully' });
    } catch (error) {
      console.error('Failed to delete toolpath:', error);
      return res.status(500).json({ message: 'Failed to delete toolpath' });
    }
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}