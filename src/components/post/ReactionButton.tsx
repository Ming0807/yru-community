'use client';

import { useState, useEffect, useCallback } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SmilePlus } from 'lucide-react';
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
  // Allow passing pre-fetched reaction counts from the server (SSR fast path)
  initialCounts?: { type: string; count: number }[];
}

export default function ReactionButton({ postId, userId, initialCounts }: ReactionButtonProps) {
  // Initialize with server-provided counts if available — zero loading flash
  const [reactionsList, setReactionsList] = useState<{ type: string; count: number }[]>(
    initialCounts ?? []
  );
  const [userReaction, setUserReaction] = useState<ReactionType | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  // Only show loading skeleton if we have no initial data at all
  const [isCountsReady, setIsCountsReady] = useState(!!initialCounts);

  const supabase = createClient();

  const fetchReactions = useCallback(async () => {
    // Fetch reaction counts (skip if we already have initialCounts from server)
    if (!initialCounts) {
      const { data: counts, error: countErr } = await supabase
        .from('post_reactions')
        .select('reaction_type')
        .eq('post_id', postId);

      if (!countErr && counts) {
        const aggregated = counts.reduce((acc: Record<string, number>, curr: any) => {
          acc[curr.reaction_type] = (acc[curr.reaction_type] || 0) + 1;
          return acc;
        }, {});
        setReactionsList(
          Object.entries(aggregated).map(([type, count]) => ({ type, count: count as number }))
        );
      }
      setIsCountsReady(true);
    }

    // Fetch user's own reaction separately (only when logged in)
    // This runs after the UI is already visible — no blocking skeleton
    if (userId) {
      const { data: userReac } = await supabase
        .from('post_reactions')
        .select('reaction_type')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle();

      if (userReac) setUserReaction(userReac.reaction_type as ReactionType);
    }
  }, [postId, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchReactions();
  }, [fetchReactions]);

  const handleReact = async (type: ReactionType) => {
    if (!userId) {
      toast.error('กรุณาเข้าสู่ระบบก่อนแสดงความรู้สึก');
      return;
    }

    setIsOpen(false);
    const oldReaction = userReaction;
    const isRemoving = oldReaction === type;

    // Optimistic Update — instant UI feedback, no waiting for network
    setUserReaction(isRemoving ? null : type);
    setReactionsList((prev) => {
      let next = [...prev];
      if (oldReaction) {
        const idx = next.findIndex((r) => r.type === oldReaction);
        if (idx > -1) {
          next[idx] = { ...next[idx], count: next[idx].count - 1 };
          if (next[idx].count <= 0) next.splice(idx, 1);
        }
      }
      if (!isRemoving) {
        const idx = next.findIndex((r) => r.type === type);
        if (idx > -1) {
          next[idx] = { ...next[idx], count: next[idx].count + 1 };
        } else {
          next.push({ type, count: 1 });
        }
      }
      return next.sort((a, b) => b.count - a.count);
    });

    try {
      if (isRemoving) {
        await supabase
          .from('post_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId);
      } else {
        // Try insert first, if conflict then update
        const { error: insertErr } = await supabase
          .from('post_reactions')
          .insert({ post_id: postId, user_id: userId, reaction_type: type });

        // If conflict error (duplicate), do update
        if (insertErr?.code === '23505') {
          const { error: updateErr } = await supabase
            .from('post_reactions')
            .update({ reaction_type: type })
            .eq('post_id', postId)
            .eq('user_id', userId);
          
          if (updateErr) {
            console.error('Reaction update error:', updateErr);
            throw updateErr;
          }
        } else if (insertErr) {
          console.error('Reaction insert error:', insertErr);
          throw insertErr;
        }
      }
    } catch (err) {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
      // Revert optimistic update on error
      fetchReactions();
    }
  };

  // Only show skeleton if we have absolutely no data yet (no SSR counts, no client fetch)
  if (!isCountsReady) {
    return <div className="h-9 w-28 bg-muted/40 rounded-full border border-border/40" />;
  }

  const activeReactionObj = userReaction ? REACTIONS.find((r) => r.type === userReaction) : null;
  const totalCount = reactionsList.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="flex items-center gap-1 bg-muted/40 rounded-full pr-1 p-0.5 border border-border/40">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
              activeReactionObj
                ? 'bg-(--color-yru-pink)/10 text-(--color-yru-pink)'
                : 'text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {activeReactionObj ? (
              <span>
                {activeReactionObj.emoji}{' '}
                <span className="hidden sm:inline-block ml-1">{activeReactionObj.label}</span>
              </span>
            ) : (
              <>
                <SmilePlus className="h-4 w-4" />
                <span className="hidden sm:inline-block">ความรู้สึก</span>
              </>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-2 rounded-full flex gap-1 bg-card shadow-lg border relative bottom-2"
          align="start"
        >
          {REACTIONS.map((reaction) => (
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

      {/* Display counts — visible immediately even before user reaction loads */}
      {totalCount > 0 && (
        <div className="flex items-center px-2 py-1 gap-1 border-l border-border/50 text-xs text-muted-foreground bg-transparent">
          <div className="flex -space-x-1.5">
            {reactionsList.slice(0, 3).map((r) => {
              const obj = REACTIONS.find((x) => x.type === r.type);
              return (
                <span
                  key={r.type}
                  className="text-[10px] w-4 h-4 rounded-full bg-background border flex items-center justify-center z-10"
                >
                  {obj?.emoji}
                </span>
              );
            })}
          </div>
          <span className="ml-1 font-semibold">{totalCount}</span>
        </div>
      )}
    </div>
  );
}