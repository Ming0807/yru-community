'use client';

import { useState, useRef, useEffect, useMemo, FormEvent } from 'react';
import Link from 'next/link';
import {
  Send,
  User,
  MoreHorizontal,
  Trash2,
  AlertTriangle,
  Reply,
  X,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ReportDialog from '@/components/ReportDialog';
import CommentVoteButton from '@/components/post/CommentVoteButton';
import { createClient } from '@/lib/supabase/client';
import { timeAgo } from '@/lib/utils';
import { toast } from 'sonner';
import type { Comment, Profile } from '@/types';

// ─── Helper: group flat comments into a 2-level tree ───
function buildCommentTree(flat: Comment[]): Comment[] {
  const topLevel: Comment[] = [];
  const replyMap = new Map<string, Comment[]>();

  // First pass: separate top-level and replies
  for (const c of flat) {
    if (!c.parent_id) {
      topLevel.push({ ...c, replies: [] });
    } else {
      const arr = replyMap.get(c.parent_id) || [];
      arr.push(c);
      replyMap.set(c.parent_id, arr);
    }
  }

  // Second pass: attach replies to parents
  // For level-2 replies whose parent is itself a reply, attach them to the grandparent
  for (const parent of topLevel) {
    const directReplies = replyMap.get(parent.id) || [];
    parent.replies = directReplies;

    // Also collect replies-to-replies and flatten them under the same top-level
    for (const reply of directReplies) {
      const grandchildren = replyMap.get(reply.id) || [];
      parent.replies.push(...grandchildren);
    }

    // Sort replies by created_at
    parent.replies.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }

  return topLevel;
}

// ─── Helper: render @mention highlights in content ───
function renderContent(content: string) {
  // Match @username patterns
  const parts = content.split(/(@\S+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return (
        <span
          key={i}
          className="text-[var(--color-yru-pink)] font-semibold"
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// ─── Props ───
interface CommentSectionProps {
  postId: string;
  initialComments: Comment[];
  currentUser?: Profile | null;
}

export default function CommentSection({
  postId,
  initialComments,
  currentUser,
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reply state
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [reportId, setReportId] = useState<string | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [userVotes, setUserVotes] = useState<Record<string, 1 | -1 | 0>>({});
  const supabase = createClient();

  useEffect(() => {
    if (currentUser) {
      const loadVotes = async () => {
        const { data } = await supabase
          .from('comment_votes')
          .select('comment_id, vote_type')
          .eq('user_id', currentUser.id)
          .in('comment_id', initialComments.map(c => c.id));
        
        if (data) {
          const voteMap: Record<string, 1 | -1 | 0> = {};
          data.forEach((v: any) => { voteMap[v.comment_id] = v.vote_type as 1 | -1 | 0; });
          setUserVotes(voteMap);
        }
      };
      loadVotes();
    }
  }, [currentUser, initialComments, supabase]);

  // Build the tree from flat comments
  const commentTree = useMemo(() => buildCommentTree(comments), [comments]);

  // Total count including replies
  const totalCount = comments.length;

  // When user clicks "Reply", focus the textarea and prepend @mention
  const handleReply = (comment: Comment) => {
    const displayName = comment.is_anonymous
      ? 'ผู้ใช้ไม่ระบุตัวตน'
      : comment.author?.display_name ?? 'ผู้ใช้';

    setReplyTo(comment);
    setContent(`@${displayName} `);

    // Focus textarea after state update
    setTimeout(() => {
      textareaRef.current?.focus();
      // Move cursor to end
      const len = textareaRef.current?.value.length ?? 0;
      textareaRef.current?.setSelectionRange(len, len);
    }, 50);
  };

  const cancelReply = () => {
    setReplyTo(null);
    setContent('');
  };

  // Determine the actual parent_id for insertion:
  // If replying to a top-level comment → parent_id = that comment's id
  // If replying to a reply (level 2) → parent_id = the reply's parent_id (so it stays at level 2)
  const getInsertParentId = (): string | null => {
    if (!replyTo) return null;
    // If the comment being replied to already has a parent, use that parent as parent_id
    // This ensures we never go deeper than 2 levels
    return replyTo.parent_id ? replyTo.parent_id : replyTo.id;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast.error('กรุณาเข้าสู่ระบบก่อนคอมเมนต์');
      return;
    }
    if (!content.trim()) return;

    setSubmitting(true);
    try {
      const parentId = getInsertParentId();

      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          author_id: currentUser.id,
          content: content.trim(),
          is_anonymous: isAnonymous,
          parent_id: parentId,
        })
        .select('*, author:profiles(*)')
        .single();

      if (error) throw error;

      setComments((prev) => [...prev, data]);
      setContent('');
      setReplyTo(null);
      toast.success('ส่งความคิดเห็นแล้ว');
    } catch {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);
      if (error) throw error;
      // Remove the comment and any children
      setComments((prev) =>
        prev.filter((c) => c.id !== commentId && c.parent_id !== commentId)
      );
      toast.success('ลบคอมเมนต์แล้ว');
    } catch {
      toast.error('ไม่สามารถลบคอมเมนต์ได้');
    }
  };

  // ─── Single Comment Row ───
  const CommentRow = ({
    comment,
    isReply = false,
  }: {
    comment: Comment;
    isReply?: boolean;
  }) => {
    const isAuthor = currentUser?.id === comment.author_id;

    return (
      <div className={`relative group ${isReply ? 'ml-10 pl-4 border-l-2 border-border/60' : ''}`}>
        <div className="flex gap-3 py-3">
          <Avatar className={`shrink-0 ${isReply ? 'h-7 w-7' : 'h-8 w-8'}`}>
            {comment.is_anonymous ? (
              <AvatarFallback className="bg-muted text-muted-foreground">
                <User className="h-4 w-4" />
              </AvatarFallback>
            ) : (
              <>
                <AvatarImage
                  src={comment.author?.avatar_url ?? undefined}
                  alt={comment.author?.display_name}
                />
                <AvatarFallback className="text-xs bg-gradient-to-br from-[var(--color-yru-pink-light)] to-[var(--color-yru-green-light)]">
                  {comment.author?.display_name?.charAt(0) ?? 'U'}
                </AvatarFallback>
              </>
            )}
          </Avatar>
          <div className="flex-1 min-w-0 pr-8">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {comment.is_anonymous ? (
                  'ผู้ใช้ไม่ระบุตัวตน'
                ) : (
                  <Link href={`/profile/${comment.author?.id}`} className="hover:text-(--color-yru-pink) hover:underline transition-colors">
                    {comment.author?.display_name ?? 'ผู้ใช้'}
                  </Link>
                )}
              </span>
              <span className="text-xs text-muted-foreground">
                {timeAgo(comment.created_at)}
              </span>
            </div>
            <p className="mt-1 text-sm text-foreground/90 whitespace-pre-wrap wrap-break-word">
              {renderContent(comment.content)}
            </p>

            {/* Actions (Vote & Reply) */}
            <div className="mt-2 flex items-center gap-4">
              <CommentVoteButton 
                commentId={comment.id}
                initialVoteCount={comment.vote_count ?? 0}
                initialUserVote={userVotes[comment.id] ?? 0}
                userId={currentUser?.id}
              />
              
              {currentUser && (
                <button
                  type="button"
                  onClick={() => handleReply(comment)}
                  className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-(--color-yru-pink) transition-colors"
                >
                  <Reply className="h-3.5 w-3.5" />
                  ตอบกลับ
                </button>
              )}
            </div>
          </div>

          {/* Options Dropdown */}
          {currentUser && (
            <div className="absolute right-0 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                  >
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 rounded-xl">
                  {isAuthor ? (
                    <DropdownMenuItem
                      onClick={() => handleDelete(comment.id)}
                      className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" /> ลบคอมเมนต์
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => setReportId(comment.id)}
                      className="gap-2 text-orange-600 focus:text-orange-600 cursor-pointer"
                    >
                      <AlertTriangle className="h-4 w-4" /> รายงาน
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-base">
        ความคิดเห็น ({totalCount})
      </h3>

      {/* Comment Tree */}
      <div className="space-y-0">
        {commentTree.map((comment, idx) => (
          <div key={comment.id}>
            {/* Top-level comment */}
            <CommentRow comment={comment} />

            {/* Replies (Level 2) — YouTube-style collapsible */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="ml-10">
                {!expandedReplies.has(comment.id) ? (
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedReplies((prev) => {
                        const next = new Set(prev);
                        next.add(comment.id);
                        return next;
                      })
                    }
                    className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-yru-pink)] hover:text-[var(--color-yru-pink-dark)] transition-colors py-2"
                  >
                    <Reply className="h-3.5 w-3.5" />
                    มีการตอบกลับ ({comment.replies.length}) รายการ
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedReplies((prev) => {
                          const next = new Set(prev);
                          next.delete(comment.id);
                          return next;
                        })
                      }
                      className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-yru-pink)] hover:text-[var(--color-yru-pink-dark)] transition-colors py-2"
                    >
                      <X className="h-3.5 w-3.5" />
                      ซ่อนการตอบกลับ
                    </button>
                    <div className="space-y-0 animate-in slide-in-from-top-2 duration-200">
                      {comment.replies.map((reply) => (
                        <CommentRow key={reply.id} comment={reply} isReply />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {idx < commentTree.length - 1 && <Separator />}
          </div>
        ))}

        {totalCount === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            ยังไม่มีความคิดเห็น เป็นคนแรกที่แสดงความคิดเห็นเลย! 💬
          </p>
        )}
      </div>

      {/* Reply Indicator */}
      {replyTo && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/60 text-sm">
          <Reply className="h-4 w-4 text-[var(--color-yru-pink)]" />
          <span className="text-muted-foreground">ตอบกลับ</span>
          <span className="font-semibold text-[var(--color-yru-pink)]">
            {replyTo.is_anonymous
              ? 'ผู้ใช้ไม่ระบุตัวตน'
              : replyTo.author?.display_name ?? 'ผู้ใช้'}
          </span>
          <button
            type="button"
            onClick={cancelReply}
            className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Comment Input */}
      {currentUser ? (
        <form onSubmit={handleSubmit} className="space-y-3 pt-2">
          <Textarea
            ref={textareaRef}
            placeholder={
              replyTo ? 'เขียนคำตอบ...' : 'เขียนความคิดเห็น...'
            }
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="resize-none rounded-xl"
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="rounded border-muted-foreground/30"
              />
              👤 ไม่ระบุตัวตน
            </label>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !content.trim()}
              className="rounded-full gap-1.5 bg-gradient-to-r from-[var(--color-yru-pink)] to-[var(--color-yru-pink-dark)] text-white"
            >
              <Send className="h-3.5 w-3.5" />
              {replyTo ? 'ตอบกลับ' : 'ส่ง'}
            </Button>
          </div>
        </form>
      ) : (
        <div className="rounded-xl bg-muted/50 p-4 text-center text-sm text-muted-foreground">
          <a
            href="/login"
            className="text-[var(--color-yru-pink)] font-medium hover:underline"
          >
            เข้าสู่ระบบ
          </a>{' '}
          เพื่อแสดงความคิดเห็น
        </div>
      )}

      {/* Report Modal */}
      <ReportDialog
        isOpen={!!reportId}
        onOpenChange={(open) => !open && setReportId(null)}
        commentId={reportId || undefined}
        postId={postId}
      />
    </div>
  );
}
