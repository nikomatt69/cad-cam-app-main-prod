// src/pages/api/components/[id]/versions/restore.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { prisma } from 'src/lib/prisma';
import { sendErrorResponse, sendSuccessResponse, handleApiError } from 'src/lib/api/helpers';
import { requireAuth } from '@/src/lib/api/auth';
import { Prisma } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Ensure user is authenticated
    const userId = await requireAuth(req, res);
    if (!userId) return;
    
    const { id, versionId } = req.body;
    
    if (!id || !versionId) {
      return res.status(400).json({ message: 'Component ID and Version ID are required' });
    }
    
    // Verify write access
    const component = await prisma.component.findFirst({
      where: {
        id,
        OR: [
          { project: { ownerId: userId } },
          { project: { organization: { users: { some: { userId } } } } }
        ]
      }
    });
    
    if (!component) {
      return sendErrorResponse(res, 'Component not found or access denied', 404);
    }
    
    // Handle POST request - Restore version
    if (req.method === 'POST') {
      // First, fetch the version to restore
      const versionToRestore = await prisma.componentVersion.findUnique({
        where: { id: versionId }
      });
      
      if (!versionToRestore || versionToRestore.componentId !== id) {
        return sendErrorResponse(res, 'Version not found', 404);
      }
      
      // Create a new version to represent the current state before restoring
      await prisma.componentVersion.create({
        data: {
          componentId: id,
          data: component.data as Prisma.InputJsonValue,
          changeMessage: 'Auto-saved before version restore',
          userId
        }
      });
      
      // Update the component with the restored data
      const updatedComponent = await prisma.component.update({
        where: { id },
        data: {
          data: versionToRestore.data as Prisma.InputJsonValue,
          updatedAt: new Date()
        }
      });
      
      return sendSuccessResponse(res, updatedComponent, 'Version restored successfully');
    }
    
    // Handle unsupported methods
    return sendErrorResponse(res, 'Method not allowed', 405);
  } catch (error) {
    return handleApiError(error, res);
  }
}