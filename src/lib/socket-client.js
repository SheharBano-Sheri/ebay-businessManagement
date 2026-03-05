'use client';

import { io } from 'socket.io-client';

let socket = null;

export function initSocket(userId) {
  if (socket?.connected) {
    return socket;
  }

  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
  
  socket = io(socketUrl, {
    path: '/api/socket',
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
    if (userId) {
      socket.emit('authenticate', { userId });
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinConversation(conversationId) {
  if (socket?.connected) {
    socket.emit('join-conversation', conversationId);
  }
}

export function leaveConversation(conversationId) {
  if (socket?.connected) {
    socket.emit('leave-conversation', conversationId);
  }
}

export function sendMessage(conversationId, message) {
  if (socket?.connected) {
    socket.emit('new-message', { conversationId, message });
  }
}

export function emitTypingStart(conversationId, userName) {
  if (socket?.connected) {
    socket.emit('typing-start', { conversationId, userName });
  }
}

export function emitTypingStop(conversationId) {
  if (socket?.connected) {
    socket.emit('typing-stop', { conversationId });
  }
}

export function emitMarkRead(conversationId, userId) {
  if (socket?.connected) {
    socket.emit('mark-read', { conversationId, userId });
  }
}

export function onMessageReceived(callback) {
  if (socket) {
    socket.on('message-received', callback);
  }
}

export function onUserTyping(callback) {
  if (socket) {
    socket.on('user-typing', callback);
  }
}

export function onUserStoppedTyping(callback) {
  if (socket) {
    socket.on('user-stopped-typing', callback);
  }
}

export function onMessagesRead(callback) {
  if (socket) {
    socket.on('messages-read', callback);
  }
}

export function offMessageReceived(callback) {
  if (socket) {
    socket.off('message-received', callback);
  }
}

export function offUserTyping(callback) {
  if (socket) {
    socket.off('user-typing', callback);
  }
}

export function offUserStoppedTyping(callback) {
  if (socket) {
    socket.off('user-stopped-typing', callback);
  }
}

export function offMessagesRead(callback) {
  if (socket) {
    socket.off('messages-read', callback);
  }
}
