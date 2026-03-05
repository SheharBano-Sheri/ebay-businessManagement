import { Server } from 'socket.io';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

let io;

export function initSocketServer(httpServer) {
  if (io) {
    return io;
  }

  io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    },
    path: '/api/socket'
  });

  // Store user connections
  const userConnections = new Map();

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Authenticate user
    socket.on('authenticate', ({ userId }) => {
      if (userId) {
        socket.userId = userId;
        userConnections.set(userId, socket.id);
        console.log(`User ${userId} authenticated`);
      }
    });

    // Join conversation room
    socket.on('join-conversation', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
      console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
    });

    // Leave conversation room
    socket.on('leave-conversation', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
      console.log(`Socket ${socket.id} left conversation ${conversationId}`);
    });

    // Handle new message
    socket.on('new-message', (data) => {
      const { conversationId, message } = data;
      // Broadcast to all clients in the conversation room
      io.to(`conversation:${conversationId}`).emit('message-received', message);
    });

    // Handle typing indicator
    socket.on('typing-start', (data) => {
      const { conversationId, userName } = data;
      socket.to(`conversation:${conversationId}`).emit('user-typing', { userName });
    });

    socket.on('typing-stop', (data) => {
      const { conversationId } = data;
      socket.to(`conversation:${conversationId}`).emit('user-stopped-typing');
    });

    // Handle message read status
    socket.on('mark-read', (data) => {
      const { conversationId, userId } = data;
      io.to(`conversation:${conversationId}`).emit('messages-read', { userId });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      if (socket.userId) {
        userConnections.delete(socket.userId);
        console.log(`User ${socket.userId} disconnected`);
      }
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}

export function getSocketServer() {
  if (!io) {
    throw new Error('Socket server not initialized');
  }
  return io;
}

export function isUserOnline(userId) {
  return userConnections.has(userId);
}
