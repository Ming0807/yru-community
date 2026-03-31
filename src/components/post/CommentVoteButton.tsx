'use client';

import { useState } from 'react';
import { ArrowBigUp, ArrowBigDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface CommentVoteButtonProps {
  commentId: string;
  initialVoteCount?: number;
  initialUserVote?: 1 | -1 | 0;
  userId?: string;
}

export default function CommentVoteButton({
  commentId,
  initialVoteCount = 0,
  initialUserVote = 0,
  userId,
}: CommentVoteButtonProps) {
  const [voteCount, setVoteCount] = useState(initialVoteCount);
  const [userVote, setUserVote] = useState<1 | -1 | 0>(initialUserVote);
  const [isVoting, setIsVoting] = useState(false);
  const supabase = createClient();

  const handleVote = async (type: 1 | -1) => {
    if (!userId) {
      toast.error('กรุณาเข้าสู่ระบบก่อนโหวต');
      return;
    }

    if (isVoting) return;
    setIsVoting(true);

    try {
      const isRemoving = userVote === type;
      const newVoteType = isRemoving ? 0 : type;
      const voteDiff = newVoteType - userVote;
      
      // Optimistic update
      setUserVote(newVoteType);
      setVoteCount(prev => prev + voteDiff);

      if (isRemoving) {
        // Delete vote
        const { error } = await supabase
          .from('comment_votes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        // Upsert vote
        const { error } = await supabase
          .from('comment_votes')
          .upsert({
            comment_id: commentId,
            user_id: userId,
            vote_type: type
          }, {
            onConflict: 'comment_id,user_id'
          });
        if (error) throw error;
      }
      
    } catch (error) {
      console.error(error);
      toast.error('ไม่สามารถโหวตได้ กรุณาลองใหม่');
      // Revert optimistic update
      setUserVote(userVote);
      setVoteCount(initialVoteCount);
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className="flex items-center gap-1 bg-muted/30 rounded-full px-1.5 py-0.5 border border-border/40">
      <button
        onClick={() => handleVote(1)}
        disabled={isVoting}
        className={`p-1 rounded-full transition-colors ${
          userVote === 1
            ? 'text-(--color-yru-pink) bg-(--color-yru-pink)/10'
            : 'text-muted-foreground hover:bg-muted/80'
        }`}
        title="เห็นด้วย"
      >
        <ArrowBigUp className={`h-4 w-4 ${userVote === 1 ? 'fill-current' : ''}`} />
      </button>

      <span className={`text-xs font-semibold min-w-[1ch] text-center ${
        userVote === 1 ? 'text-(--color-yru-pink)' : userVote === -1 ? 'text-blue-500' : 'text-foreground/80'
      }`}>
        {voteCount}
      </span>

      <button
        onClick={() => handleVote(-1)}
        disabled={isVoting}
        className={`p-1 rounded-full transition-colors ${
          userVote === -1
            ? 'text-blue-500 bg-blue-500/10'
            : 'text-muted-foreground hover:bg-muted/80'
        }`}
        title="ไม่เห็นด้วย"
      >
        <ArrowBigDown className={`h-4 w-4 ${userVote === -1 ? 'fill-current' : ''}`} />
      </button>
    </div>
  );
}
