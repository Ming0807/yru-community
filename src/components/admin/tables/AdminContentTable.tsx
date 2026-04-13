'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import * as XLSX from 'xlsx';
import { AdminDataTable } from '../AdminDataTable';
import { BulkActionsBar } from '../BulkActionsBar';
import { Button } from '@/components/ui/button';
import { Eye, Trash2, Pin, PinOff, Download } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface Post {
  id: string;
  title: string;
  category: { name: string } | null;
  created_at: string;
  is_pinned: boolean;
  is_locked?: boolean;
  deleted_at?: string | null;
}

interface AdminContentTableProps {
  initialPosts: Post[];
  totalCount: number;
  currentPage?: number;
  pageSize?: number;
  searchQuery?: string;
}

const columnHelper = createColumnHelper<Post>();

export function AdminContentTable({
  initialPosts,
  totalCount,
  currentPage = 1,
  pageSize = 50,
  searchQuery = '',
}: AdminContentTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: postsData, refetch } = useQuery({
    queryKey: ['admin', 'posts', 'list', currentPage, pageSize, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize),
        ...(searchQuery ? { search: searchQuery } : {}),
      });
      const res = await fetch(`/api/admin/posts?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const result = await res.json();
      return result as { posts: Post[]; total: number; page: number; totalPages: number };
    },
    initialData: {
      posts: initialPosts,
      total: totalCount,
      page: currentPage,
      totalPages: Math.ceil(totalCount / pageSize),
    },
    placeholderData: (prev) => prev,
  });

  const posts = postsData?.posts ?? [];

  const handleSearch = useCallback((query: string) => {
    setLocalSearch(query);
    const params = new URLSearchParams(searchParams.toString());
    if (query) {
      params.set('search', query);
    } else {
      params.delete('search');
    }
    params.set('page', '1');
    router.push(`/admin/content?${params.toString()}`);
  }, [router, searchParams]);

  const updatePostMutation = useMutation({
    mutationFn: async ({ postId, updates }: { postId: string; updates: Record<string, unknown> }) => {
      const res = await fetch('/api/admin/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, updates }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      toast.success('อัปเดตสำเร็จ');
      refetch();
    },
    onError: () => {
      toast.error('ไม่สามารถอัปเดตได้');
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const res = await fetch(`/api/admin/posts?id=${postId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
    },
    onSuccess: () => {
      toast.success('ลบสำเร็จ');
      refetch();
    },
    onError: () => {
      toast.error('ไม่สามารถลบได้');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => fetch(`/api/admin/posts?id=${id}`, { method: 'DELETE' })));
    },
    onSuccess: () => {
      toast.success('ลบสำเร็จ');
      setSelectedIds(new Set());
      refetch();
    },
    onError: () => {
      toast.error('ไม่สามารถลบได้');
    },
  });

  const handleTogglePin = useCallback((postId: string, current: boolean) => {
    updatePostMutation.mutate({ postId, updates: { is_pinned: !current } });
  }, [updatePostMutation]);

  const handleToggleLock = useCallback((postId: string, current: boolean) => {
    updatePostMutation.mutate({ postId, updates: { is_locked: !current } });
  }, [updatePostMutation]);

  const handleDelete = useCallback((postId: string) => {
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบกระทู้นี้?')) {
      deletePostMutation.mutate(postId);
    }
  }, [deletePostMutation]);

  const columns = useMemo(() => [
    columnHelper.display({
      id: 'select',
      header: () => (
        <input
          type="checkbox"
          checked={selectedIds.size === posts.length && posts.length > 0}
          onChange={() => setSelectedIds(prev => prev.size === posts.length ? new Set() : new Set(posts.map(p => p.id)))}
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
            newSet.has(row.original.id) ? newSet.delete(row.original.id) : newSet.add(row.original.id);
            setSelectedIds(newSet);
          }}
          className="w-4 h-4 rounded cursor-pointer"
        />
      ),
    }),
    columnHelper.accessor('title', {
      header: 'กระทู้',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.is_pinned && <span className="text-(--color-yru-pink)" title="ปักหมุด">📌</span>}
          {row.original.is_locked && <span className="text-muted-foreground" title="ล็อกแล้ว">🔒</span>}
          <Link href={`/post/${row.original.id}`} className="font-medium hover:text-(--color-yru-pink) hover:underline line-clamp-1">
            {row.original.title}
          </Link>
        </div>
      ),
    }),
    columnHelper.accessor('category.name', {
      header: 'หมวดหมู่',
      cell: ({ row }) => row.original.category?.name || '-',
    }),
    columnHelper.accessor('created_at', {
      header: 'วันที่',
      cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString('th-TH'),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'การดำเนินการ',
      cell: ({ row }) => {
        const post = row.original;
        return (
          <div className="flex items-center gap-0.5">
            <Link href={`/post/${post.id}`}>
              <Button variant="ghost" size="icon-sm" className="rounded-lg" title="ดูกระทู้">
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon-sm" className="rounded-lg" title={post.is_pinned ? 'ถอดหมุด' : 'ปักหมุด'} onClick={() => handleTogglePin(post.id, post.is_pinned)}>
              📌
            </Button>
            <Button variant="ghost" size="icon-sm" className="rounded-lg" title={post.is_locked ? 'ปลดล็อก' : 'ล็อกกระทู้'} onClick={() => handleToggleLock(post.id, post.is_locked || false)}>
              {post.is_locked ? '🔓' : '🔒'}
            </Button>
            <Button variant="ghost" size="icon-sm" className="rounded-lg text-red-500 hover:text-red-600" title="ลบกระทู้" onClick={() => handleDelete(post.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    }),
  ], [selectedIds, posts.length, handleTogglePin, handleToggleLock, handleDelete]);

  const bulkActions = [
    {
      id: 'delete',
      label: 'ลบ',
      icon: Trash2,
      variant: 'destructive' as const,
      onClick: (ids: string[]) => {
        if (confirm(`ลบ ${ids.length} กระทู้?`)) {
          bulkDeleteMutation.mutate(ids);
        }
      },
      confirmMessage: 'ลบกระทู้ที่เลือก',
    },
    {
      id: 'pin',
      label: 'ปักหมุด',
      icon: Pin,
      onClick: (ids: string[]) => {
        ids.forEach(id => updatePostMutation.mutate({ postId: id, updates: { is_pinned: true } }));
      },
    },
    {
      id: 'unpin',
      label: 'ถอดหมุด',
      icon: PinOff,
      onClick: (ids: string[]) => {
        ids.forEach(id => updatePostMutation.mutate({ postId: id, updates: { is_pinned: false } }));
      },
    },
  ];

  const handleExport = useCallback((onlySelected: boolean = false, format: 'xlsx' | 'csv' = 'xlsx') => {
    const dataToExport = onlySelected && selectedIds.size > 0
      ? posts.filter(p => selectedIds.has(p.id))
      : posts;

    if (format === 'xlsx') {
      const rows = dataToExport.map(p => ({
        'ชื่อกระทู้': p.title,
        'หมวดหมู่': p.category?.name ?? '-',
        'ปักหมุด': p.is_pinned ? '✓' : '✗',
        'ล็อก': p.is_locked ? '✓' : '✗',
        'วันที่': new Date(p.created_at).toLocaleDateString('th-TH'),
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Posts');
      XLSX.writeFile(wb, `posts_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else {
      const headers = ['ชื่อกระทู้', 'หมวดหมู่', 'ปักหมุด', 'ล็อก', 'วันที่'];
      const csvRows = dataToExport.map(p => [
        p.title,
        p.category?.name || '-',
        p.is_pinned ? '✓' : '',
        p.is_locked ? '✓' : '',
        new Date(p.created_at).toLocaleDateString('th-TH')
      ]);
      const csv = [headers, ...csvRows].map(r => r.map(c => `"${c || ''}"`).join(',')).join('\n');
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `posts_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [posts, selectedIds]);

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-2 sm:justify-between sm:items-center mb-4">
        <p className="text-sm text-muted-foreground">{postsData?.total ?? totalCount} กระทู้</p>
        <div className="flex gap-2 self-end">
          {selectedIds.size > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-xl gap-2">
                  <Download className="h-4 w-4" /> Export ที่เลือก ({selectedIds.size})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExport(true, 'xlsx')}>Excel (.xlsx)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport(true, 'csv')}>CSV (.csv)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-xl gap-2">
                <Download className="h-4 w-4" /> Export ทั้งหมด
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport(false, 'xlsx')}>Excel (.xlsx)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport(false, 'csv')}>CSV (.csv)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AdminDataTable
        data={posts}
        columns={columns}
        pageSize={15}
        searchable
        searchPlaceholder="ค้นหากระทู้..."
        onSearchChange={handleSearch}
        searchQuery={localSearch}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onRowClick={(post) => window.location.href = `/post/${post.id}`}
        emptyMessage="ไม่พบกระทู้"
      />

      <BulkActionsBar
        selectedCount={selectedIds.size}
        selectedIds={Array.from(selectedIds)}
        onClear={() => setSelectedIds(new Set())}
        actions={bulkActions}
      />
    </>
  );
}