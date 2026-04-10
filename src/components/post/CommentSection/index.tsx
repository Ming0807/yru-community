'use client';

import { useState, useRef, useEffect, useMemo, FormEvent } from 'react';
import { Reply, X, Send } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import ReportDialog from '@/components/ReportDialog';
import CommentRow from './CommentRow';
import { buildCommentTree } from './utils';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Comment, Profile } from '@/types';

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
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [reportId, setReportId] = useState<string | null>(null);
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

  const commentTree = useMemo(() => buildCommentTree(comments), [comments]);
  const totalCount = comments.length;

  const handleReply = (comment: Comment) => {
    const displayName = comment.is_anonymous
      ? 'ผู้ใช้ไม่ระบุตัวตน'
      : comment.author?.display_name ?? 'ผู้ใช้';

    setReplyTo(comment);
    setContent(`@${displayName} `);

    setTimeout(() => {
      textareaRef.current?.focus();
      const len = textareaRef.current?.value.length ?? 0;
      textareaRef.current?.setSelectionRange(len, len);
    }, 50);
  };

  const cancelReply = () => {
    setReplyTo(null);
    setContent('');
  };

  const getInsertParentId = (): string | null => {
    if (!replyTo) return null;
    return replyTo.id;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast.error('กรุณาเข้าสู่ระบบก่อนคอมเมนต์');
      return;
    }
    if (!content.trim()) return;

    // ตรวจสอบว่ากระทู้ถูกล็อกหรือไม่
    const { data: post } = await supabase
      .from('posts')
      .select('is_locked')
      .eq('id', postId)
      .single();
    
    if (post?.is_locked) {
      toast.error('กระทู้นี้ถูกล็อกแล้ว ไม่สามารถตอบกลับได้');
      return;
    }

    setSubmitting(true);
    try {
      const parentId = getInsertParentId();

      const payload: any = {
        post_id: postId,
        author_id: currentUser.id,
        content: content.trim(),
        is_anonymous: isAnonymous,
      };

      if (parentId) {
        payload.parent_id = parentId;
      }

      const { data, error } = await supabase
        .from('comments')
        .insert(payload)
        .select('*, profiles(*)')
        .single();

      if (error) throw error;

      const newComment = {
        ...data,
        author: data.profiles,
        replies: [],
      };
      delete newComment.profiles;

      setComments((prev) => [...prev, newComment]);
      setContent('');
      setReplyTo(null);
      toast.success('ส่งความคิดเห็นแล้ว');
    } catch (error) {
      console.error('Insert Comment Error:', error);
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (commentId: string, newContent: string) => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .update({ content: newContent })
        .eq('id', commentId)
        .select()
        .single();
      if (error) throw error;

      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId ? { ...c, content: newContent, is_edited: true } : c
        )
      );
      toast.success('แก้ไขคอมเมนต์แล้ว');
    } catch {
      toast.error('ไม่สามารถแก้ไขคอมเมนต์ได้');
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);
      if (error) throw error;

      const idsToDelete = new Set<string>([commentId]);
      const collectChildren = (parentId: string) => {
        comments
          .filter(c => c.parent_id === parentId)
          .forEach(c => {
            idsToDelete.add(c.id);
            collectChildren(c.id);
          });
      };
      collectChildren(commentId);

      setComments((prev) => prev.filter((c) => !idsToDelete.has(c.id)));
      toast.success('ลบคอมเมนต์แล้ว');
    } catch {
      toast.error('ไม่สามารถลบคอมเมนต์ได้');
    }
  };

  const handleVoteChange = (commentId: string, newVote: 1 | -1 | 0) => {
    setUserVotes(prev => ({ ...prev, [commentId]: newVote }));
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-base">
        ความคิดเห็น ({totalCount})
      </h3>

      <div className="space-y-0">
        {commentTree.map((comment, idx) => (
          <div key={comment.id}>
            <CommentRow
              comment={comment}
              currentUser={currentUser}
              onReply={handleReply}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onReport={setReportId}
              userVotes={userVotes}
              onVoteChange={handleVoteChange}
            />
            {idx < commentTree.length - 1 && <Separator />}
          </div>
        ))}

        {totalCount === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            ยังไม่มีความคิดเห็น เป็นคนแรกที่แสดงความคิดเห็นเลย! 💬
          </p>
        )}
      </div>

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

      {currentUser ? (
        <form onSubmit={handleSubmit} className="space-y-3 pt-2">
          <Textarea
            ref={textareaRef}
            placeholder={replyTo ? 'เขียนคำตอบ...' : 'เขียนความคิดเห็น...'}
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

      <ReportDialog
        isOpen={!!reportId}
        onOpenChange={(open) => !open && setReportId(null)}
        commentId={reportId || undefined}
        postId={postId}
      />
    </div>
  );
}
