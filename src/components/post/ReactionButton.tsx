'use client';

import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Heart, SmilePlus, Flame, ThumbsUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

const REACTIONS = [
  { type: 'LOVE', emoji: '❤️', label: 'รักเลย' },
  { type: 'HAHA', emoji: '😂', label: 'ฮาๆ' },
  { type: 'WOW', emoji: '😮', label: 'ว้าว' },
  { type: 'SAD', emoji: '😢', label: 'เศร้า' },
  { type: 'ANGRY', emoji: '😡', label: 'โกรธ' },
  { type: 'LIKE', emoji: '👍', label: 'ถูกใจ' },
] as const;

type ReactionType = typeof REACTIONS[number]['type'];

interface ReactionButtonProps {
  postId: string;
  userId?: string;
}

export default function ReactionButton({ postId, userId }: ReactionButtonProps) {
  const [reactionsList, setReactionsList] = useState<{type: string, count: number}[]>([]);
  const [userReaction, setUserReaction] = useState<ReactionType | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchReactions = async () => {
      // Fetch grouped reactions
      const { data: counts, error: countErr } = await supabase
        .from('post_reactions')
        .select('reaction_type')
        .eq('post_id', postId);

      if (!countErr && counts) {
        const aggregated = counts.reduce((acc: Record<string, number>, curr: any) => {
          acc[curr.reaction_type] = (acc[curr.reaction_type] || 0) + 1;
          return acc;
        }, {});
        
        setReactionsList(Object.entries(aggregated).map(([type, count]) => ({ type, count: count as number })));
      }

      // Fetch user's reaction
      if (userId) {
        const { data: userReac } = await supabase
          .from('post_reactions')
          .select('reaction_type')
          .eq('post_id', postId)
          .eq('user_id', userId)
          .maybeSingle(); // <--- แก้ตรงนี้แหละครับ จาก .single() เป็น .maybeSingle()
          
        if (userReac) setUserReaction(userReac.reaction_type as ReactionType);
      }
      setIsLoading(false);
    };

    fetchReactions();
  }, [postId, userId, supabase]);

  const handleReact = async (type: ReactionType) => {
    if (!userId) {
      toast.error('กรุณาเข้าสู่ระบบก่อนแสดงความรู้สึก');
      return;
    }

    setIsOpen(false);
    const oldReaction = userReaction;
    const isRemoving = oldReaction === type;
    
    // Optimistic Update
    setUserReaction(isRemoving ? null : type);
    
    setReactionsList(prev => {
      let next = [...prev];
      // remove old
      if (oldReaction) {
        const idx = next.findIndex(r => r.type === oldReaction);
        if (idx > -1) {
          next[idx].count--;
          if (next[idx].count <= 0) next.splice(idx, 1);
        }
      }
      // add new
      if (!isRemoving) {
        const idx = next.findIndex(r => r.type === type);
        if (idx > -1) {
          next[idx].count++;
        } else {
          next.push({ type, count: 1 });
        }
      }
      return next.sort((a,b) => b.count - a.count);
    });

    try {
      if (isRemoving) {
        await supabase
          .from('post_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId);
      } else {
        await supabase
          .from('post_reactions')
          .upsert({
            post_id: postId,
            user_id: userId,
            reaction_type: type
          }, { onConflict: 'post_id,user_id' });
      }
    } catch {
      toast.error('เกิดข้อผิดพลาด');
      // Revert in real app
    }
  };

  if (isLoading) {
    return <div className="h-9 w-24 bg-muted animate-pulse rounded-full" />;
  }

  const activeReactionObj = userReaction ? REACTIONS.find(r => r.type === userReaction) : null;

  return (
    <div className="flex items-center gap-1 bg-muted/40 rounded-full pr-1 p-0.5 border border-border/40">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button 
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
              activeReactionObj ? 'bg-(--color-yru-pink)/10 text-(--color-yru-pink)' : 'text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {activeReactionObj ? (
              <span>{activeReactionObj.emoji} <span className="hidden sm:inline-block ml-1">{activeReactionObj.label}</span></span>
            ) : (
              <><SmilePlus className="h-4 w-4" /> <span className="hidden sm:inline-block">ความรู้สึก</span></>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2 rounded-full flex gap-1 bg-card shadow-lg border relative bottom-2" align="start">
          {REACTIONS.map(reaction => (
            <button
              key={reaction.type}
              onClick={() => handleReact(reaction.type)}
              className="text-2xl hover:scale-125 transition-transform p-1.5 rounded-full hover:bg-muted"
              title={reaction.label}
            >
              {reaction.emoji}
            </button>
          ))}
        </PopoverContent>
      </Popover>

      {/* Display counts */}
      {reactionsList.length > 0 && (
        <div className="flex items-center px-2 py-1 gap-1 border-l border-border/50 text-xs text-muted-foreground bg-transparent">
          <div className="flex -space-x-1.5">
            {reactionsList.slice(0, 3).map(r => {
              const obj = REACTIONS.find(x => x.type === r.type);
              return <span key={r.type} className="text-[10px] w-4 h-4 rounded-full bg-background border flex items-center justify-center z-10">{obj?.emoji}</span>
            })}
          </div>
          <span className="ml-1 font-semibold">{reactionsList.reduce((acc, curr) => acc + curr.count, 0)}</span>
        </div>
      )}
    </div>
  );
}