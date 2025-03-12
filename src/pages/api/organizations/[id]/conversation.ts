// src/pages/api/organizations/[id]/conversations.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from 'src/lib/prisma';
import { requireAuth } from 'src/lib/api/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await requireAuth(req, res);
  if (!userId) return;
  
  const { id: organizationId } = req.query;
  
  if (!organizationId || typeof organizationId !== 'string') {
    return res.status(400).json({ message: 'Organization ID is required' });
  }
  
  // Verify user has access to this organization
  const userOrganization = await prisma.userOrganization.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId
      }
    }
  });
  
  if (!userOrganization) {
    return res.status(403).json({ message: 'You are not a member of this organization' });
  }
  
  // GET request to list conversations
  if (req.method === 'GET') {
    try {
      // Get all conversations for the organization where the user is a participant
      const conversations = await prisma.conversation.findMany({
        where: {
          organizationId,
          participants: {
            some: {
              userId
            }
          }
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true
                }
              }
            }
          },
          messages: {
            orderBy: {
              createdAt: 'desc'
            },
            take: 1
          },
          _count: {
            select: {
              messages: true
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });
      
      // Format conversations for response
      const formattedConversations = conversations.map(conv => {
        const otherParticipants = conv.participants
          .filter(p => p.userId !== userId)
          .map(p => p.user);
          
        const userParticipant = conv.participants.find(p => p.userId === userId);
        
        return {
          id: conv.id,
          name: conv.name || (otherParticipants.length === 1 
            ? otherParticipants[0].name 
            : otherParticipants.map(p => p.name).join(', ')),
          isGroupChat: conv.isGroupChat,
          lastMessage: conv.messages[0] || null,
          messageCount: conv._count.messages,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          participants: conv.participants.map(p => ({
            id: p.user.id,
            name: p.user.name,
            image: p.user.image,
            joinedAt: p.joinedAt
          })),
          lastReadAt: userParticipant?.lastReadAt || null
        };
      });
      
      return res.status(200).json(formattedConversations);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      return res.status(500).json({ message: 'Failed to fetch conversations' });
    }
  }
  
  // POST request to create a new conversation
  else if (req.method === 'POST') {
    try {
      const { name, participantIds, isGroupChat = false } = req.body;
      
      if (!participantIds || !Array.isArray(participantIds)) {
        return res.status(400).json({ message: 'Participant IDs are required' });
      }
      
      // Ensure all participants are in the organization
      const orgMembers = await prisma.userOrganization.findMany({
        where: {
          organizationId,
          userId: {
            in: [...participantIds, userId]
          }
        }
      });
      
      const validParticipantIds = orgMembers.map(member => member.userId);
      
      // Check if we're creating a duplicate direct message conversation
      if (!isGroupChat && participantIds.length === 1) {
        const existingConversation = await prisma.conversation.findFirst({
          where: {
            organizationId,
            isGroupChat: false,
            participants: {
              every: {
                userId: {
                  in: [userId, participantIds[0]]
                }
              }
            },
            AND: [
              {
                participants: {
                  some: {
                    userId
                  }
                }
              },
              {
                participants: {
                  some: {
                    userId: participantIds[0]
                  }
                }
              }
            ]
          },
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    image: true
                  }
                }
              }
            }
          }
        });
        
        if (existingConversation) {
          return res.status(200).json(existingConversation);
        }
      }
      
      // Create the new conversation
      const conversation = await prisma.conversation.create({
        data: {
          name: isGroupChat ? name : null,
          isGroupChat,
          organizationId,
          participants: {
            create: [
              { userId },
              ...validParticipantIds
                .filter(id => id !== userId)
                .map(id => ({ userId: id }))
            ]
          }
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true
                }
              }
            }
          }
        }
      });
      
      return res.status(201).json(conversation);
    } catch (error) {
      console.error('Failed to create conversation:', error);
      return res.status(500).json({ message: 'Failed to create conversation' });
    }
  }
  
  else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}