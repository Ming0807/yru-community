'use client';

import { useState, useEffect } from 'react'; // <-- 1. อย่าลืม import useEffect
import { ArrowBigUp, ArrowBigDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface CommentVoteButtonProps {
  commentId: string;
  initialVoteCount?: number;
  initialUserVote?: 1 | -1 | 0;
  userId?: string;
  onVoteChange?: (commentId: string, newVote: 1 | -1 | 0) => void;
}

export default function CommentVoteButton({
  commentId,
  initialVoteCount = 0,
  initialUserVote = 0,
  userId,
  onVoteChange,
}: CommentVoteButtonProps) {
  const [voteCount, setVoteCount] = useState(initialVoteCount);
  const [userVote, setUserVote] = useState<1 | -1 | 0>(initialUserVote);
  const [isVoting, setIsVoting] = useState(false);
  const supabase = createClient();

  // ------------------------------------------------------------------
  // 🚀 2. จุดที่แก้ปัญหา "สีหายตอนรีเฟรช" (อัปเดต State เมื่อโหลดข้อมูลเสร็จ)
  // ------------------------------------------------------------------
  useEffect(() => {
    setUserVote(initialUserVote);
  }, [initialUserVote]);

  useEffect(() => {
    setVoteCount(initialVoteCount);
  }, [initialVoteCount]);
  // ------------------------------------------------------------------

  const handleVote = async (type: 1 | -1) => {
    if (!userId) {
      toast.error('กรุณาเข้าสู่ระบบก่อนโหวต');
      return;
    }

    if (isVoting) return;
    setIsVoting(true);

    const prevVote = userVote;
    const prevCount = voteCount;

    try {
      // โลจิกคำนวณแบบ Optimistic Update (เปลี่ยนสีก่อน รอ DB ทีหลัง - แบบ Facebook)
      const newVoteType = userVote === type ? 0 : type;
      const voteDiff = newVoteType - userVote;

      setUserVote(newVoteType);
      setVoteCount(prev => prev + voteDiff);
      onVoteChange?.(commentId, newVoteType);

      // ยิงข้อมูลเข้า Database เบื้องหลัง
      if (newVoteType === 0) {
        const { error } = await supabase
          .from('comment_votes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('comment_votes')
          .upsert(
            { comment_id: commentId, user_id: userId, vote_type: newVoteType },
            { onConflict: 'comment_id,user_id' }
          );
        if (error) throw error;
      }

    } catch (error) {
      console.error(error);
      toast.error('ไม่สามารถโหวตได้ กรุณาลองใหม่');
      // ถ้า Error ให้ดึงสีและตัวเลขกลับมาเป็นแบบเดิม (Rollback)
      setUserVote(prevVote);
      setVoteCount(prevCount);
      onVoteChange?.(commentId, prevVote);
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
            ? 'text-[var(--color-yru-pink)] bg-[var(--color-yru-pink)]/10' // อัปเดตการเขียนสี CSS Variable ให้ชัวร์
            : 'text-muted-foreground hover:bg-muted/80'
        }`}
        title="เห็นด้วย"
      >
        <ArrowBigUp className={`h-4 w-4 ${userVote === 1 ? 'fill-current' : ''}`} />
      </button>

      <span className={`text-xs font-semibold min-w-[1ch] text-center ${
        userVote === 1 ? 'text-[var(--color-yru-pink)]' : userVote === -1 ? 'text-blue-500' : 'text-foreground/80'
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