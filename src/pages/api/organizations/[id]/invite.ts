// src/pages/api/organizations/[id]/invite.ts
import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { prisma } from 'src/lib/prisma';
import { requireAuth } from 'src/lib/api/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await requireAuth(req, res);
  if (!userId) return;
  
  const { id: organizationId } = req.query;
  
  if (!organizationId || typeof organizationId !== 'string') {
    return res.status(400).json({ message: 'Organization ID is required' });
  }
  
  // Verify user has permission to invite members
  const userOrganization = await prisma.userOrganization.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId
      }
    }
  });
  
  if (!userOrganization || !['ADMIN', 'MANAGER'].includes(userOrganization.role)) {
    return res.status(403).json({ message: 'You do not have permission to invite members' });
  }
  
  // Only handle POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  try {
    const { email, role } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    // Managers can only invite members
    if (userOrganization.role === 'MANAGER' && role === 'ADMIN') {
      return res.status(403).json({ message: 'Managers cannot invite Admins' });
    }
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    // Check if user is already a member of the organization
    if (existingUser) {
      const existingMembership = await prisma.userOrganization.findUnique({
        where: {
          userId_organizationId: {
            userId: existingUser.id,
            organizationId
          }
        }
      });
      
      if (existingMembership) {
        return res.status(400).json({ message: 'User is already a member of this organization' });
      }
    }
    
    // Check if there's already a pending invitation
    const existingInvitation = await prisma.organizationInvitation.findFirst({
      where: {
        email,
        organizationId
      }
    });
    
    if (existingInvitation) {
      // Update the existing invitation
      const updatedInvitation = await prisma.organizationInvitation.update({
        where: { id: existingInvitation.id },
        data: {
          role: role || 'MEMBER',
          token: crypto.randomBytes(32).toString('hex'),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      });
      
      // Here you would send an email with the invitation link
      // For now, just return the invitation data
      
      return res.status(200).json({
        message: 'Invitation updated and sent',
        invitation: {
          id: updatedInvitation.id,
          email: updatedInvitation.email,
          role: updatedInvitation.role,
          expiresAt: updatedInvitation.expiresAt
        }
      });
    } else {
      // Create a new invitation
      const newInvitation = await prisma.organizationInvitation.create({
        data: {
          email,
          role: role || 'MEMBER',
          token: crypto.randomBytes(32).toString('hex'),
          organizationId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      });
      
      // Here you would send an email with the invitation link
      // For now, just return the invitation data
      
      return res.status(201).json({
        message: 'Invitation created and sent',
        invitation: {
          id: newInvitation.id,
          email: newInvitation.email,
          role: newInvitation.role,
          expiresAt: newInvitation.expiresAt
        }
      });
    }
  } catch (error) {
    console.error('Failed to send invitation:', error);
    return res.status(500).json({ message: 'Failed to send invitation' });
  }
}