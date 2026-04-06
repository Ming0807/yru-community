import { useState } from 'react';
import Link from 'next/link';
import { User, MoreHorizontal, Trash2, AlertTriangle, Reply, Pencil, Check, X as XIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import CommentVoteButton from '@/components/post/CommentVoteButton';
import { timeAgo } from '@/lib/utils';
import { renderContent } from './utils';
import type { Comment, Profile } from '@/types';

const MAX_DEPTH = 3;

const depthIndent: Record<number, string> = {
  0: '',
  1: 'ml-8 pl-3 border-l-2 border-border/60',
  2: 'ml-16 pl-3 border-l-2 border-border/40',
  3: 'ml-24 pl-3 border-l-2 border-border/20',
};

interface CommentRowProps {
  comment: Comment;
  depth?: number;
  currentUser?: Profile | null;
  onReply: (comment: Comment) => void;
  onDelete: (commentId: string) => void;
  onEdit: (commentId: string, content: string) => void;
  onReport: (commentId: string) => void;
  userVotes: Record<string, 1 | -1 | 0>;
  onVoteChange: (commentId: string, newVote: 1 | -1 | 0) => void;
}

export default function CommentRow({
  comment,
  depth = 0,
  currentUser,
  onReply,
  onDelete,
  onEdit,
  onReport,
  userVotes,
  onVoteChange,
}: CommentRowProps) {
  const isAuthor = currentUser?.id === comment.author_id;
  const hasReplies = comment.replies && comment.replies.length > 0;
  const canReply = depth < MAX_DEPTH;
  const indentClass = depthIndent[depth] ?? depthIndent[3];
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasBeenEdited, setHasBeenEdited] = useState(comment.is_edited ?? false);

  const handleSaveEdit = async () => {
    if (!editContent.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onEdit(comment.id, editContent.trim());
      setHasBeenEdited(true);
      setIsEditing(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  return (
    <div>
      <div className={`relative group ${indentClass}`}>
        <div className="flex gap-3 py-3">
          <Avatar className={`shrink-0 ${depth > 0 ? 'h-7 w-7' : 'h-8 w-8'}`}>
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

          <div className="flex-1 min-w-0 pr-10">
            <div className="flex items-center gap-2 flex-wrap">
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
              {hasBeenEdited && (
                <span className="text-xs text-muted-foreground italic">(แก้ไข)</span>
              )}
            </div>

            {isEditing ? (
              <div className="mt-2 p-3 rounded-xl bg-muted/40 border border-border/60 space-y-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="resize-none text-sm bg-background"
                  rows={2}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      handleSaveEdit();
                    }
                    if (e.key === 'Escape') {
                      handleCancelEdit();
                    }
                  }}
                />
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    Ctrl+Enter เพื่อบันทึก · Esc เพื่อยกเลิก
                  </span>
                  <div className="flex gap-1.5 ml-auto">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs gap-1"
                      onClick={handleCancelEdit}
                      disabled={isSubmitting}
                    >
                      <XIcon className="h-3 w-3" /> ยกเลิก
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs gap-1 bg-gradient-to-r from-[var(--color-yru-pink)] to-[var(--color-yru-pink-dark)] text-white"
                      onClick={handleSaveEdit}
                      disabled={isSubmitting || !editContent.trim()}
                    >
                      <Check className="h-3 w-3" /> {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-1 text-sm text-foreground/90 whitespace-pre-wrap break-words">
                {renderContent(comment.content)}
              </p>
            )}

            <div className="mt-2 flex items-center gap-3 flex-wrap">
              <CommentVoteButton
                commentId={comment.id}
                initialVoteCount={comment.vote_count ?? 0}
                initialUserVote={userVotes[comment.id] ?? 0}
                userId={currentUser?.id}
                onVoteChange={onVoteChange}
              />

              {currentUser && canReply && (
                <button
                  type="button"
                  onClick={() => onReply(comment)}
                  className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-(--color-yru-pink) transition-colors"
                >
                  <Reply className="h-3.5 w-3.5" />
                  ตอบกลับ
                </button>
              )}
            </div>
          </div>

          {currentUser && (
            <div className="absolute right-0 top-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-xl">
                  {isAuthor && !isEditing ? (
                    <>
                      <DropdownMenuItem
                        onClick={() => {
                          setEditContent(comment.content);
                          setIsEditing(true);
                        }}
                        className="gap-2 text-muted-foreground focus:text-foreground cursor-pointer"
                      >
                        <Pencil className="h-4 w-4" /> แก้ไขคอมเมนต์
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete(comment.id)}
                        className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" /> ลบคอมเมนต์
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => onReport(comment.id)}
                      className="gap-2 text-orange-600 focus:text-orange-600 cursor-pointer"
                    >
                      <AlertTriangle className="h-4 w-4" /> รายงานความไม่เหมาะสม
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      {hasReplies && (
        <div>
          {comment.replies!.map((reply) => (
            <CommentRow
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              currentUser={currentUser}
              onReply={onReply}
              onDelete={onDelete}
              onEdit={onEdit}
              onReport={onReport}
              userVotes={userVotes}
              onVoteChange={onVoteChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
