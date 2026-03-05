'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  joinConversation,
  leaveConversation,
  sendMessage as sendSocketMessage,
  onMessageReceived,
  offMessageReceived,
  emitTypingStart,
  emitTypingStop,
  onUserTyping,
  offUserTyping,
  onUserStoppedTyping,
  offUserStoppedTyping,
  emitMarkRead
} from '@/lib/socket-client';
import { toast } from 'sonner';

export function ChatWindow({ conversationId, onConversationUpdate }) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [otherPartyTyping, setOtherPartyTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const isVendor = session?.user?.role === 'public_vendor';
  const userId = session?.user?.id;

  useEffect(() => {
    if (conversationId) {
      loadMessages();
      joinConversation(conversationId);
      markAsRead();

      // Socket event listeners
      onMessageReceived(handleNewMessage);
      onUserTyping(handleUserTyping);
      onUserStoppedTyping(handleUserStoppedTyping);

      return () => {
        leaveConversation(conversationId);
        offMessageReceived(handleNewMessage);
        offUserTyping(handleUserTyping);
        offUserStoppedTyping(handleUserStoppedTyping);
      };
    }
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, otherPartyTyping]);

  async function loadMessages() {
    try {
      setLoading(true);
      const response = await fetch(`/api/messages/${conversationId}`);
      const data = await response.json();

      if (data.success) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead() {
    try {
      await fetch('/api/messages/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId })
      });
      emitMarkRead(conversationId, userId);
      onConversationUpdate?.();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  }

  function handleNewMessage(message) {
    if (message.conversationId === conversationId) {
      setMessages((prev) => [...prev, message]);
      markAsRead();
      onConversationUpdate?.();
    }
  }

  function handleUserTyping({ userName }) {
    setOtherPartyTyping(true);
  }

  function handleUserStoppedTyping() {
    setOtherPartyTyping(false);
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  function handleTyping() {
    emitTypingStart(conversationId, session?.user?.name);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      emitTypingStop(conversationId);
    }, 2000);
  }

  async function handleSendMessage(e) {
    e.preventDefault();

    const trimmedMessage = messageText.trim();
    if (!trimmedMessage || sending) return;

    setSending(true);
    emitTypingStop(conversationId);

    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          content: trimmedMessage
        })
      });

      const data = await response.json();

      if (data.success) {
        // Send via socket for real-time update
        sendSocketMessage(conversationId, data.message);
        setMessages((prev) => [...prev, data.message]);
        setMessageText('');
        onConversationUpdate?.();
      } else {
        toast.error(data.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center text-muted-foreground">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <>
            {messages.map((message) => {
              const isOwnMessage = message.senderId._id === userId;
              
              return (
                <div
                  key={message._id}
                  className={cn(
                    'flex',
                    isOwnMessage ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[70%] rounded-lg px-4 py-2',
                      isOwnMessage
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    {!isOwnMessage && (
                      <p className="text-xs font-semibold mb-1">
                        {message.senderId.name}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                    <p
                      className={cn(
                        'text-xs mt-1',
                        isOwnMessage
                          ? 'text-primary-foreground/70'
                          : 'text-muted-foreground'
                      )}
                    >
                      {format(new Date(message.createdAt), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
              );
            })}
            
            {otherPartyTyping && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            value={messageText}
            onChange={(e) => {
              setMessageText(e.target.value);
              handleTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            placeholder="Type your message..."
            className="resize-none"
            rows={3}
            disabled={sending}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!messageText.trim() || sending}
            className="h-auto"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift + Enter for new line
        </p>
      </form>
    </div>
  );
}
