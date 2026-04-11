'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import { BulkActionsBar } from '@/components/admin/BulkActionsBar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageCircle, Eye, Trash2, Search, Filter } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  post_id: string;
  post_title?: string;
  author_id: string;
  is_deleted?: boolean;
  has_report?: boolean;
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
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'deleted'>('all');
  const [reportFilter, setReportFilter] = useState<'all' | 'reported' | 'not_reported'>('all');
  const supabase = useMemo(() => createClient(), []);

  const { data: comments = initialComments } = useQuery({
    queryKey: ['admin', 'comments'],
    queryFn: async () => {
      const { data: commentsData } = await supabase
        .from('comments')
        .select('id, content, created_at, post_id, author_id, post:posts(title), user:profiles(display_name, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(200);

      const { data: reports } = await supabase
        .from('reports')
        .select('comment_id')
        .not('comment_id', 'is', null);
      
      const reportedIds = new Set(reports?.map((r: any) => r.comment_id).filter(Boolean) ?? []);
      
      return (commentsData ?? []).map((c: any) => ({
        id: c.id,
        content: c.content,
        created_at: c.created_at,
        post_id: c.post_id,
        post_title: c.post?.title,
        author_id: c.author_id,
        user: c.user,
        has_report: reportedIds.has(c.id),
      })) as Comment[];
    },
    placeholderData: (prev) => prev ?? initialComments,
  });

  const filteredComments = useMemo(() => {
    let result = comments;
    
    if (statusFilter !== 'all') {
      result = result.filter(c => 
        statusFilter === 'deleted' ? c.is_deleted : !c.is_deleted
      );
    }

    if (reportFilter !== 'all') {
      result = result.filter(c =>
        reportFilter === 'reported' ? c.has_report : !c.has_report
      );
    }
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.content.toLowerCase().includes(q) ||
        c.post_title?.toLowerCase().includes(q) ||
        c.user?.display_name?.toLowerCase().includes(q)
      );
    }
    
    return result;
  }, [comments, searchQuery, statusFilter, reportFilter]);

  const deleteMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const res = await fetch(`/api/admin/comments?id=${commentId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
    },
    onMutate: async (commentId) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'comments'] });
      const prev = queryClient.getQueryData(['admin', 'comments']);
      queryClient.setQueryData<Comment[]>(['admin', 'comments'], (old) =>
        old?.map(c => c.id === commentId ? { ...c, is_deleted: true } : c)
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['admin', 'comments'], context?.prev);
      toast.error('ไม่สามารถลบได้');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'comments'] });
      toast.success('ลบความคิดเห็นสำเร็จ');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => fetch(`/api/admin/comments?id=${id}`, { method: 'DELETE' })));
    },
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'comments'] });
      const prev = queryClient.getQueryData(['admin', 'comments']);
      queryClient.setQueryData<Comment[]>(['admin', 'comments'], (old) =>
        old?.map(c => ids.includes(c.id) ? { ...c, is_deleted: true } : c)
      );
      setSelectedIds(new Set());
      return { prev };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['admin', 'comments'], context?.prev);
      toast.error('ไม่สามารถลบได้');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'comments'] });
      toast.success('ลบความคิดเห็นสำเร็จ');
    },
  });

  const handleDelete = (commentId: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบความคิดเห็นนี้?')) return;
    deleteMutation.mutate(commentId);
  };

  const columns = useMemo(() => [
    columnHelper.display({
      id: 'select',
      header: () => (
        <input
          type="checkbox"
          checked={selectedIds.size === filteredComments.length && filteredComments.length > 0}
          onChange={() => {
            if (selectedIds.size === filteredComments.length) {
              setSelectedIds(new Set());
            } else {
              setSelectedIds(new Set(filteredComments.filter(c => !c.is_deleted).map(c => c.id)));
            }
          }}
          className="w-4 h-4 rounded cursor-pointer"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.original.id)}
          onChange={(e) => {
            e.stopPropagation();
            const newSet = new Set(selectedIds);
            if (newSet.has(row.original.id)) newSet.delete(row.original.id);
            else newSet.add(row.original.id);
            setSelectedIds(newSet);
          }}
          disabled={row.original.is_deleted}
          className="w-4 h-4 rounded cursor-pointer disabled:opacity-50"
        />
      ),
    }),
    columnHelper.accessor('content', {
      header: 'ความคิดเห็น',
      cell: ({ row }) => (
        <div className="max-w-md">
          <p className={`text-sm line-clamp-2 ${row.original.is_deleted ? 'line-through text-muted-foreground' : ''}`}>
            {getContentPreview(row.original.content)}
          </p>
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
    columnHelper.accessor('has_report', {
      header: 'รายงาน',
      cell: ({ row }) => (
        row.original.has_report ? (
          <Badge variant="outline" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
            ถูกรายงาน
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        )
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const comment = row.original;
        return (
          <div className="flex items-center gap-1">
            {comment.post_id && !comment.is_deleted && (
              <Link href={`/post/${comment.post_id}`}>
                <Button variant="ghost" size="icon-sm" className="rounded-lg" title="ดูกระทู้">
                  <Eye className="h-4 w-4" />
                </Button>
              </Link>
            )}
            {!comment.is_deleted && (
              <Button 
                variant="ghost" 
                size="icon-sm" 
                className="rounded-lg text-red-500 hover:text-red-600" 
                title="ลบความคิดเห็น"
                onClick={() => handleDelete(comment.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      },
    }),
  ], [selectedIds, filteredComments.length, deleteMutation]);

  const activeComments = filteredComments.filter(c => !c.is_deleted);
  const bulkActions = [
    {
      id: 'delete',
      label: 'ลบ',
      icon: Trash2,
      variant: 'destructive' as const,
      onClick: (ids: string[]) => {
        if (confirm(`ลบ ${ids.length} ความคิดเห็น?`)) {
          bulkDeleteMutation.mutate(ids);
        }
      },
      confirmMessage: 'ลบความคิดเห็นที่เลือก',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {activeComments.length} ความคิดเห็น
            {statusFilter !== 'all' && ` (${statusFilter === 'deleted' ? 'ถูกลบ' : 'ที่แสดง'})`}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground mr-2">สถานะ:</span>
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('all')}
            className="rounded-lg"
          >
            ทั้งหมด
          </Button>
          <Button
            variant={statusFilter === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('active')}
            className="rounded-lg"
          >
            แสดง
          </Button>
          <Button
            variant={statusFilter === 'deleted' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('deleted')}
            className="rounded-lg"
          >
            ถูกลบ
          </Button>
          <span className="text-xs text-muted-foreground mx-2">|</span>
          <span className="text-xs text-muted-foreground mr-2">รายงาน:</span>
          <Button
            variant={reportFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setReportFilter('all')}
            className="rounded-lg"
          >
            ทั้งหมด
          </Button>
          <Button
            variant={reportFilter === 'reported' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setReportFilter('reported')}
            className="rounded-lg text-orange-600"
          >
            ถูกรายงาน
          </Button>
          <Button
            variant={reportFilter === 'not_reported' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setReportFilter('not_reported')}
            className="rounded-lg"
          >
            ไม่ถูกรายงาน
          </Button>
        </div>
      </div>

      <AdminDataTable
        data={filteredComments}
        columns={columns}
        pageSize={15}
        searchable
        searchPlaceholder="ค้นหาความคิดเห็น, กระทู้, ผู้เขียน..."
        onSearchChange={setSearchQuery}
        searchQuery={searchQuery}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        emptyMessage="ไม่พบความคิดเห็น"
      />

      {selectedIds.size > 0 && (
        <BulkActionsBar
          selectedCount={selectedIds.size}
          selectedIds={Array.from(selectedIds)}
          onClear={() => setSelectedIds(new Set())}
          actions={bulkActions}
        />
      )}
    </div>
  );
}