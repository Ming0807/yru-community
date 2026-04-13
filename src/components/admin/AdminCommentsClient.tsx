'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { AdminDataTable } from '@/components/admin/AdminDataTable';
import { BulkActionsBar } from '@/components/admin/BulkActionsBar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageCircle, Eye, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
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
  totalCount: number;
  currentPage: number;
  pageSize: number;
  searchQuery: string;
  statusQuery: string;
}

const columnHelper = createColumnHelper<Comment>();

function getContentPreview(content: string, maxLength = 80) {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength) + '...';
}

export function AdminCommentsTable({
  initialComments,
  totalCount,
  currentPage,
  pageSize,
  searchQuery,
  statusQuery,
}: AdminCommentsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const totalPages = Math.ceil(totalCount / pageSize);

  const navigateToPage = (page: number) => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    if (searchQuery) params.set('search', searchQuery);
    if (statusQuery && statusQuery !== 'all') params.set('status', statusQuery);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSearch = (value: string) => {
    const params = new URLSearchParams();
    params.set('page', '1');
    if (value) params.set('search', value);
    if (statusQuery && statusQuery !== 'all') params.set('status', statusQuery);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleStatusFilter = (status: string) => {
    const params = new URLSearchParams();
    params.set('page', '1');
    if (searchQuery) params.set('search', searchQuery);
    if (status !== 'all') params.set('status', status);
    router.push(`${pathname}?${params.toString()}`);
  };

  const deleteMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const res = await fetch(`/api/admin/comments?id=${commentId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'comments'] });
      toast.success('ลบความคิดเห็นสำเร็จ');
    },
    onError: () => {
      toast.error('ไม่สามารถลบได้');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => fetch(`/api/admin/comments?id=${id}`, { method: 'DELETE' })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'comments'] });
      setSelectedIds(new Set());
      toast.success('ลบความคิดเห็นสำเร็จ');
    },
    onError: () => {
      toast.error('ไม่สามารถลบได้');
    },
  });

  const handleDelete = useCallback((commentId: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบความคิดเห็นนี้?')) return;
    deleteMutation.mutate(commentId);
  }, [deleteMutation]);

  const columns = useMemo(() => [
    columnHelper.display({
      id: 'select',
      header: () => (
        <input
          type="checkbox"
          checked={selectedIds.size === initialComments.length && initialComments.length > 0}
          onChange={() => {
            if (selectedIds.size === initialComments.length) {
              setSelectedIds(new Set());
            } else {
              setSelectedIds(new Set(initialComments.filter(c => !c.is_deleted).map(c => c.id)));
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
  ], [selectedIds, initialComments, handleDelete]);

  const activeComments = initialComments.filter(c => !c.is_deleted);
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
            {statusQuery !== 'all' && ` (${statusQuery === 'deleted' ? 'ถูกลบ' : 'ที่แสดง'})`}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground mr-2">สถานะ:</span>
          <Button
            variant={statusQuery === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleStatusFilter('all')}
            className="rounded-lg"
          >
            ทั้งหมด
          </Button>
          <Button
            variant={statusQuery === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleStatusFilter('active')}
            className="rounded-lg"
          >
            แสดง
          </Button>
          <Button
            variant={statusQuery === 'deleted' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleStatusFilter('deleted')}
            className="rounded-lg"
          >
            ถูกลบ
          </Button>
        </div>
      </div>

      <AdminDataTable
        data={initialComments}
        columns={columns}
        pageSize={pageSize}
        searchable
        searchPlaceholder="ค้นหาความคิดเห็น..."
        onSearchChange={handleSearch}
        searchQuery={searchQuery}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        emptyMessage="ไม่พบความคิดเห็น"
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border/60">
          <div className="text-xs text-muted-foreground">
            หน้า {currentPage} จาก {totalPages}
            <span className="hidden sm:inline"> ({totalCount} รายการ)</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="rounded-lg gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              ก่อนหน้า
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="rounded-lg gap-1"
            >
              ถัดไป
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

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