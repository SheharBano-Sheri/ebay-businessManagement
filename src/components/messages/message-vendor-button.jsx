'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function MessageVendorButton({ vendorId, vendorName, variant = 'default', size = 'default' }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleStartConversation() {
    setLoading(true);
    
    try {
      const response = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId })
      });

      const data = await response.json();

      if (data.success) {
        // Navigate to messages page with conversation selected
        router.push(`/dashboard/messages?conversation=${data.conversation._id}`);
      } else {
        toast.error(data.error || 'Failed to start conversation');
      }
    } catch (error) {
      console.error('Failed to start conversation:', error);
      toast.error('Failed to start conversation');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleStartConversation}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <MessageSquare className="w-4 h-4 mr-2" />
      )}
      Message Vendor
    </Button>
  );
}
