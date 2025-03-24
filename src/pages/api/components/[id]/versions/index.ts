// src/pages/api/components/[id]/versions/index.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { prisma } from 'src/lib/prisma';
import { sendErrorResponse, sendSuccessResponse, handleApiError } from 'src/lib/api/helpers';
import { requireAuth } from '@/src/lib/api/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Ensure user is authenticated
    const userId = await requireAuth(req, res);
    if (!userId) return;
    
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Component ID is required' });
    }
    
    // Fetch component to ensure access
    const component = await prisma.component.findFirst({
      where: {
        id,
        OR: [
          { project: { ownerId: userId } },
          { project: { organization: { users: { some: { userId } } } } },
          { isPublic: true }
        ]
      }
    });
    
    if (!component) {
      return sendErrorResponse(res, 'Component not found or access denied', 404);
    }
    
    // Handle GET request - Get version history
    if (req.method === 'GET') {
      const versions = await prisma.componentVersion.findMany({
        where: { componentId: id },
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { name: true, email: true }
          }
        }
      });
      
      return sendSuccessResponse(res, versions);
    }
    
    // Handle POST request - Create new version
    if (req.method === 'POST') {
      const { data, changeMessage } = req.body;
      
      const newVersion = await prisma.componentVersion.create({
        data: {
          componentId: id,
          data,
          changeMessage: changeMessage || '',
          userId
        }
      });
      
      return sendSuccessResponse(res, newVersion, 'Version created successfully');
    }
    
    // Handle unsupported methods
    return sendErrorResponse(res, 'Method not allowed', 405);
  } catch (error) {
    return handleApiError(error, res);
  }
}