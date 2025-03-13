import { NextApiRequest, NextApiResponse } from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { getToken } from 'next-auth/jwt';

// Store active connections
const connectedUsers: Map<string, string[]> = new Map();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check if WebSocket server is already running
  if (res.socket && (res.socket as any).server.io) {
    console.log('WebSocket server already running');
    res.end();
    return;
  }

  console.log('Setting up WebSocket server...');

  // Create a new Socket.io server
  const io = new SocketIOServer((res.socket as any).server, {
    path: '/api/websocket',
    cors: {
      origin: process.env.NEXTAUTH_URL ,
      methods: ['GET', 'POST'],
      credentials: true
    }
  });
  (res.socket as any).server.io = io;

  // Configure the Socket.io server
  io.use(async (socket, next) => {
    try {
      // Get token from socket handshake
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      // Verify token using NextAuth
      const secret = process.env.NEXTAUTH_SECRET;
      if (!secret) {
        return next(new Error('Server configuration error: Missing NEXTAUTH_SECRET'));
      }

      // Parse and validate token (different approach than in example because we're using the actual token string)
      const decoded = await getToken({ 
        req: { headers: { authorization: `Bearer ${token}` } } as any,
        secret
      });

      if (!decoded || !decoded.sub) {
        return next(new Error('Authentication error: Invalid token'));
      }

      // Attach user ID to socket data
      socket.data.userId = decoded.sub;
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.data.userId;
    console.log(`User ${userId} connected with socket ${socket.id}`);

    // Store socket connection
    if (!connectedUsers.has(userId)) {
      connectedUsers.set(userId, []);
    }
    connectedUsers.get(userId)?.push(socket.id);

    // Handle organization room membership
    socket.on('joinOrganization', (organizationId) => {
      socket.join(`org:${organizationId}`);
      console.log(`User ${userId} joined room for organization ${organizationId}`);
    });

    socket.on('leaveOrganization', (organizationId) => {
      socket.leave(`org:${organizationId}`);
      console.log(`User ${userId} left room for organization ${organizationId}`);
    });

    // Handle admin channel
    socket.on('joinAdminChannel', () => {
      socket.join('admin');
      console.log(`User ${userId} joined admin channel`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      const userSockets = connectedUsers.get(userId) || [];
      const updatedSockets = userSockets.filter(id => id !== socket.id);
      
      if (updatedSockets.length === 0) {
        connectedUsers.delete(userId);
      } else {
        connectedUsers.set(userId, updatedSockets);
      }
      
      console.log(`User ${userId} disconnected from socket ${socket.id}`);
    });
  });

  console.log('WebSocket server started');
  res.end();
}

// Utility function to send notification to a specific user
export const sendNotificationToUser = (userId: string, notification: any) => {
  const io = (global as any).io;
  if (!io) return;

  const userSockets = connectedUsers.get(userId);
  if (userSockets && userSockets.length > 0) {
    userSockets.forEach(socketId => {
      io.to(socketId).emit('notification', notification);
    });
    console.log(`Notification sent to user ${userId}`);
  }
};

// Utility function to send notification to all members of an organization
export const sendNotificationToOrganization = (organizationId: string, notification: any, excludeUserId?: string) => {
  const io = (global as any).io;
  if (!io) return;

  if (excludeUserId) {
    io.to(`org:${organizationId}`).except(connectedUsers.get(excludeUserId) || []).emit('notification', notification);
  } else {
    io.to(`org:${organizationId}`).emit('notification', notification);
  }
  
  console.log(`Notification sent to organization ${organizationId}`);
};