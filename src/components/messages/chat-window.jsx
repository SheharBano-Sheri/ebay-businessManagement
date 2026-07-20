"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function ChatWindow({ conversationId, onConversationUpdate }) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef(null);

  const userId = session?.user?.id;

  useEffect(() => {
    if (conversationId) {
      loadMessages(true);
      markAsRead();

      // Poll for new messages every 3 seconds silently
      const pollInterval = setInterval(() => {
        loadMessages(false);
      }, 3000);

      return () => clearInterval(pollInterval);
    }
  }, [conversationId]);

  // Only scroll to bottom when the number of messages changes
  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  async function loadMessages(showLoader = false) {
    if (showLoader) setLoading(true);
    try {
      const response = await fetch(`/api/messages/${conversationId}`);
      const data = await response.json();

      if (data.success) {
        // Only update state if we have new messages to prevent unnecessary re-renders
        setMessages((prev) => {
          if (prev.length !== data.messages.length) {
            if (!showLoader) markAsRead(); // mark as read if new messages arrived in background
            return data.messages;
          }
          return prev;
        });
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
      if (showLoader) toast.error("Failed to load messages");
    } finally {
      if (showLoader) setLoading(false);
    }
  }

  async function markAsRead() {
    try {
      await fetch("/api/messages/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId }),
      });
      onConversationUpdate?.();
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  async function handleSendMessage(e) {
    e.preventDefault();

    const trimmedMessage = messageText.trim();
    if (!trimmedMessage || sending) return;

    setSending(true);

    try {
      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          content: trimmedMessage,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessages((prev) => [...prev, data.message]);
        setMessageText("");
        onConversationUpdate?.();
      } else {
        toast.error(data.error || "Failed to send message");
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message");
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
                    "flex",
                    isOwnMessage ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[70%] rounded-lg px-4 py-2",
                      isOwnMessage
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted",
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
                        "text-xs mt-1",
                        isOwnMessage
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground",
                      )}
                    >
                      {format(new Date(message.createdAt), "MMM d, h:mm a")}
                    </p>
                  </div>
                </div>
              );
            })}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
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
