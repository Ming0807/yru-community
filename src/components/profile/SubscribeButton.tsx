'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, UserCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface SubscribeButtonProps {
  targetUserId: string;
  initialIsFollowing: boolean;
}

export default function SubscribeButton({ targetUserId, initialIsFollowing }: SubscribeButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const toggleFollow = async () => {
    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('กรุณาเข้าสู่ระบบก่อนติดตามเนื้อหา');
        router.push('/login');
        return;
      }

      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId);
          
        if (error) throw error;
        setIsFollowing(false);
        toast.success('เลิกติดตามแล้ว');
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: targetUserId
          });
          
        if (error) throw error;
        setIsFollowing(true);
        toast.success('ติดตามเรียบร้อยแล้ว');
      }
      
      router.refresh(); // Refresh to update counts
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={toggleFollow} 
      disabled={isLoading}
      variant={isFollowing ? "outline" : "default"}
      className={isFollowing ? "rounded-full" : "rounded-full bg-(--color-yru-pink) hover:bg-(--color-yru-pink-dark) text-white"}
    >
      {isFollowing ? (
        <><UserCheck className="mr-2 h-4 w-4" /> กำลังติดตาม</>
      ) : (
        <><UserPlus className="mr-2 h-4 w-4" /> ติดตาม</>
      )}
    </Button>
  );
}
