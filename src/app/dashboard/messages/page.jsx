'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { ConversationList } from '@/components/messages/conversation-list';
import { ChatWindow } from '@/components/messages/chat-window';
import { initSocket, disconnectSocket } from '@/lib/socket-client';
import { MessageSquare } from 'lucide-react';

export default function MessagesPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.id) {
      // Initialize socket connection
      initSocket(session.user.id);

      // Load conversations
      fetchConversations();

      // Check if there's a conversation in URL
      const conversationFromUrl = searchParams.get('conversation');
      if (conversationFromUrl) {
        setSelectedConversationId(conversationFromUrl);
      }

      return () => {
        disconnectSocket();
      };
    }
  }, [session, searchParams]);

  async function fetchConversations() {
    try {
      const response = await fetch('/api/messages/conversations');
      const data = await response.json();
      
      if (data.success) {
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleConversationSelect(conversationId) {
    setSelectedConversationId(conversationId);
  }

  function handleConversationUpdate() {
    fetchConversations();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Messages</h1>
        <p className="text-muted-foreground">
          Communicate directly with your {session?.user?.role === 'public_vendor' ? 'clients' : 'vendors'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-250px)]">
        <div className="lg:col-span-1 border rounded-lg overflow-hidden">
          <ConversationList
            conversations={conversations}
            selectedConversationId={selectedConversationId}
            onConversationSelect={handleConversationSelect}
            onConversationUpdate={handleConversationUpdate}
          />
        </div>

        <div className="lg:col-span-2 border rounded-lg overflow-hidden">
          {selectedConversationId ? (
            <ChatWindow
              conversationId={selectedConversationId}
              onConversationUpdate={handleConversationUpdate}
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-muted/10">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold mb-2">No conversation selected</h3>
                <p className="text-muted-foreground">
                  Select a conversation from the list to start messaging
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
