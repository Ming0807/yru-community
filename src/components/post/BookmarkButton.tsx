'use client';

import { useState, useTransition } from 'react';
import { Bookmark } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface BookmarkButtonProps {
  postId: string;
  initialBookmarked: boolean;
  userId?: string;
}

export default function BookmarkButton({
  postId,
  initialBookmarked,
  userId,
}: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [isPending, startTransition] = useTransition();
  const supabase = createClient();

  const handleBookmark = () => {
    if (!userId) {
      toast.error('กรุณาเข้าสู่ระบบก่อนบันทึก');
      return;
    }

    const newBookmarked = !bookmarked;
    setBookmarked(newBookmarked);

    startTransition(async () => {
      try {
        if (newBookmarked) {
          const { error } = await supabase
            .from('bookmarks')
            .insert({ user_id: userId, post_id: postId });
          if (error) throw error;
          toast.success('บันทึกกระทู้แล้ว');
        } else {
          const { error } = await supabase
            .from('bookmarks')
            .delete()
            .eq('user_id', userId)
            .eq('post_id', postId);
          if (error) throw error;
          toast.success('ยกเลิกการบันทึกแล้ว');
        }
      } catch {
        setBookmarked(!newBookmarked);
        toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
      }
    });
  };

  return (
    <button
      onClick={handleBookmark}
      disabled={isPending}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all active:scale-95 ${
        bookmarked
          ? 'bg-[var(--color-yru-green)] text-white shadow-md'
          : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
      aria-label={bookmarked ? 'ยกเลิกบันทึก' : 'บันทึกกระทู้'}
    >
      <Bookmark
        className={`h-4 w-4 transition-transform ${
          bookmarked ? 'fill-white scale-110' : ''
        }`}
      />
      {bookmarked ? 'บันทึกแล้ว' : 'บันทึก'}
    </button>
  );
}
