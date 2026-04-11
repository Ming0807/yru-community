'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { createColumnHelper } from '@tanstack/react-table';
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageCircle, Eye, Trash2, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  post_id: string;
  post_title?: string;
  user_id: string;
  user?: {
    display_name: string;
    avatar_url: string | null;
  };
}

interface AdminCommentsTableProps {
  initialComments: Comment[];
}

const columnHelper = createColumnHelper<Comment>();

function getContentPreview(content: string, maxLength = 80) {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength) + '...';
}

export function AdminCommentsTable({ initialComments }: AdminCommentsTableProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [searchQuery, setSearchQuery] = useState('');
  const supabase = useMemo(() => createClient(), []);

  const filteredComments = useMemo(() => {
    if (!searchQuery) return comments;
    const q = searchQuery.toLowerCase();
    return comments.filter(c => 
      c.content.toLowerCase().includes(q) ||
      c.post_title?.toLowerCase().includes(q) ||
      c.user?.display_name?.toLowerCase().includes(q)
    );
  }, [comments, searchQuery]);

  const handleDelete = async (commentId: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบความคิดเห็นนี้?')) return;
    
    try {
      const res = await fetch(`/api/admin/comments?id=${commentId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      setComments(prev => prev.filter(c => c.id !== commentId));
      toast.success('ลบความคิดเห็นสำเร็จ');
    } catch {
      toast.error('ไม่สามารถลบได้');
    }
  };

  const columns = useMemo(() => [
    columnHelper.accessor('content', {
      header: 'ความคิดเห็น',
      cell: ({ row }) => (
        <div className="max-w-md">
          <p className="text-sm line-clamp-2">{getContentPreview(row.original.content)}</p>
          {row.original.post_title && (
            <p className="text-xs text-muted-foreground mt-1">
              ในกระทู้: {row.original.post_title}
            </p>
          )}
        </div>
      ),
    }),
    columnHelper.accessor('user', {
      header: 'ผู้เขียน',
      cell: ({ row }) => {
        const user = row.original.user;
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarImage src={user?.avatar_url ?? undefined} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {user?.display_name?.charAt(0) ?? 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{user?.display_name ?? 'Unknown'}</span>
          </div>
        );
      },
    }),
    columnHelper.accessor('created_at', {
      header: 'วันที่',
      cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString('th-TH'),
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const comment = row.original;
        return (
          <div className="flex items-center gap-1">
            {comment.post_id && (
              <Link href={`/post/${comment.post_id}`}>
                <Button variant="ghost" size="icon-sm" className="rounded-lg" title="ดูกระทู้">
                  <Eye className="h-4 w-4" />
                </Button>
              </Link>
            )}
            <Button 
              variant="ghost" 
              size="icon-sm" 
              className="rounded-lg text-red-500 hover:text-red-600" 
              title="ลบความคิดเห็น"
              onClick={() => handleDelete(comment.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    }),
  ], []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{comments.length} ความคิดเห็น</span>
      </div>

      <AdminDataTable
        data={filteredComments}
        columns={columns}
        pageSize={15}
        searchable
        searchPlaceholder="ค้นหาความคิดเห็น, กระทู้, ผู้เขียน..."
        onSearchChange={setSearchQuery}
        searchQuery={searchQuery}
        emptyMessage="ไม่พบความคิดเห็น"
      />
    </div>
  );
}