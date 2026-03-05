'use client';

import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';

export function ConversationList({
  conversations,
  selectedConversationId,
  onConversationSelect,
}) {
  const { data: session } = useSession();
  const isVendor = session?.user?.role === 'public_vendor';

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <MessageSquare className="w-12 h-12 mb-4 text-muted-foreground" />
        <h3 className="font-semibold mb-2">No conversations yet</h3>
        <p className="text-sm text-muted-foreground">
          {isVendor 
            ? 'Your clients will appear here when they message you'
            : 'Start messaging your vendors from their profile page'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg">Conversations</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conversation) => {
          const otherParty = isVendor 
            ? conversation.ownerId 
            : conversation.vendorUserId;
          
          const unreadCount = isVendor 
            ? conversation.vendorUnreadCount 
            : conversation.ownerUnreadCount;

          const isSelected = conversation._id === selectedConversationId;

          return (
            <button
              key={conversation._id}
              onClick={() => onConversationSelect(conversation._id)}
              className={cn(
                'w-full p-4 border-b hover:bg-muted/50 transition-colors text-left',
                isSelected && 'bg-muted'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">
                      {otherParty?.name || 'Unknown'}
                    </h3>
                    {unreadCount > 0 && (
                      <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-primary rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {conversation.lastMessagePreview || 'No messages yet'}
                  </p>
                </div>
                <div className="flex flex-col items-end ml-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {conversation.lastMessageAt && formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: true })}
                  </span>
                  {unreadCount > 0 && (
                    <Circle className="w-2 h-2 mt-2 fill-primary text-primary" />
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
