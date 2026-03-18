'use client';

import { useState, useTransition } from 'react';
import { ArrowBigUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface VoteButtonProps {
  postId: string;
  initialVoteCount: number;
  initialHasVoted: boolean;
  userId?: string;
}

export default function VoteButton({
  postId,
  initialVoteCount,
  initialHasVoted,
  userId,
}: VoteButtonProps) {
  const [hasVoted, setHasVoted] = useState(initialHasVoted);
  const [voteCount, setVoteCount] = useState(initialVoteCount);
  const [isPending, startTransition] = useTransition();
  const supabase = createClient();

  const handleVote = () => {
    if (!userId) {
      toast.error('กรุณาเข้าสู่ระบบก่อนโหวต');
      return;
    }

    // Optimistic update
    const newHasVoted = !hasVoted;
    setHasVoted(newHasVoted);
    setVoteCount((prev) => prev + (newHasVoted ? 1 : -1));

    startTransition(async () => {
      try {
        if (newHasVoted) {
          const { error } = await supabase
            .from('votes')
            .insert({ user_id: userId, post_id: postId });
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('votes')
            .delete()
            .eq('user_id', userId)
            .eq('post_id', postId);
          if (error) throw error;
        }
      } catch {
        // Revert on error
        setHasVoted(!newHasVoted);
        setVoteCount((prev) => prev + (newHasVoted ? -1 : 1));
        toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
      }
    });
  };

  return (
    <button
      onClick={handleVote}
      disabled={isPending}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all active:scale-95 ${
        hasVoted
          ? 'bg-[var(--color-yru-pink)] text-white shadow-md'
          : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      <ArrowBigUp
        className={`h-5 w-5 transition-transform ${
          hasVoted ? 'fill-white scale-110' : ''
        }`}
      />
      {voteCount}
    </button>
  );
}
