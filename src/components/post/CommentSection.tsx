'use client';

import { useState, FormEvent } from 'react';
import { Send, User, MoreHorizontal, Trash2, AlertTriangle } from 'lucide-react';
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
import { createClient } from '@/lib/supabase/client';
import { timeAgo } from '@/lib/utils';
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
  
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const supabase = createClient();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast.error('กรุณาเข้าสู่ระบบก่อนคอมเมนต์');
      return;
    }
    if (!content.trim()) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          author_id: currentUser.id,
          content: content.trim(),
          is_anonymous: isAnonymous,
        })
        .select('*, author:profiles(*)')
        .single();

      if (error) throw error;

      setComments((prev) => [...prev, data]);
      setContent('');
      toast.success('ส่งความคิดเห็นแล้ว');
    } catch {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      const { error } = await supabase.from('comments').delete().eq('id', commentId);
      if (error) throw error;
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      toast.success('ลบคอมเมนต์แล้ว');
    } catch {
      toast.error('ไม่สามารถลบคอมเมนต์ได้');
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-base">
        ความคิดเห็น ({comments.length})
      </h3>

      {/* Comment List */}
      <div className="space-y-0">
        {comments.map((comment, idx) => {
          const isAuthor = currentUser?.id === comment.author_id;

          return (
            <div key={comment.id} className="relative group">
              <div className="flex gap-3 py-4">
                <Avatar className="h-8 w-8 shrink-0">
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
                      {comment.is_anonymous
                        ? 'ผู้ใช้ไม่ระบุตัวตน'
                        : comment.author?.display_name ?? 'ผู้ใช้'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(comment.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-foreground/90 whitespace-pre-wrap break-words">
                    {comment.content}
                  </p>
                </div>

                {/* Comment Options Dropdown */}
                {currentUser && (
                  <div className="absolute right-0 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
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
              {idx < comments.length - 1 && <Separator />}
            </div>
          );
        })}

        {comments.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            ยังไม่มีความคิดเห็น เป็นคนแรกที่แสดงความคิดเห็นเลย! 💬
          </p>
        )}
      </div>

      {/* Comment Input */}
      {currentUser ? (
        <form onSubmit={handleSubmit} className="space-y-3 pt-2">
          <Textarea
            placeholder="เขียนความคิดเห็น..."
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
              ส่ง
            </Button>
          </div>
        </form>
      ) : (
        <div className="rounded-xl bg-muted/50 p-4 text-center text-sm text-muted-foreground">
          <a href="/login" className="text-[var(--color-yru-pink)] font-medium hover:underline">
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
