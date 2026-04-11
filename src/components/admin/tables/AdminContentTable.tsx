'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import * as XLSX from 'xlsx';
import { AdminDataTable } from '../AdminDataTable';
import { BulkActionsBar } from '../BulkActionsBar';
import { Button } from '@/components/ui/button';
import { Eye, Edit, Trash2, Pin, PinOff, Download } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface Post {
  id: string;
  title: string;
  category: { name: string } | null;
  created_at: string;
  is_pinned: boolean;
  is_locked?: boolean;
}

interface AdminContentTableProps {
  initialPosts: Post[];
}

const columnHelper = createColumnHelper<Post>();

export function AdminContentTable({ initialPosts }: AdminContentTableProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const supabase = useMemo(() => createClient(), []);

  const { data: livePosts } = useQuery({
    queryKey: ['admin', 'posts', 'list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('posts')
        .select('id, title, is_pinned, is_locked, created_at, category_id, category:categories(name)')
        .order('created_at', { ascending: false })
        .range(0, 99);
      return data as Post[] || [];
    },
    placeholderData: (prev) => prev ?? initialPosts,
  });

  const filteredPosts = useMemo(() => {
    if (!searchQuery) return livePosts ?? [];
    const q = searchQuery.toLowerCase();
    return (livePosts ?? []).filter(p => p.title.toLowerCase().includes(q));
  }, [livePosts, searchQuery]);

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
    onMutate: async ({ postId, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'posts'] });
      queryClient.setQueryData<Post[]>(['admin', 'posts', 'list'], (old) =>
        old?.map((p) => (p.id === postId ? { ...p, ...updates } : p))
      );
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'posts'] });
      toast.error('ไม่สามารถอัปเดตได้');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'posts'] });
      toast.success('อัปเดตสำเร็จ');
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const res = await fetch(`/api/admin/posts?id=${postId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
    },
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'posts'] });
      const prev = queryClient.getQueryData(['admin', 'posts', 'list']);
      queryClient.setQueryData<Post[]>(['admin', 'posts', 'list'], (old) =>
        old?.filter((p) => p.id !== postId)
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['admin', 'posts', 'list'], context?.prev);
      toast.error('ไม่สามารถลบได้');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'posts'] });
      toast.success('ลบสำเร็จ');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => fetch(`/api/admin/posts?id=${id}`, { method: 'DELETE' })));
    },
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'posts'] });
      const prev = queryClient.getQueryData(['admin', 'posts', 'list']);
      queryClient.setQueryData<Post[]>(['admin', 'posts', 'list'], (old) =>
        old?.filter((p) => !ids.includes(p.id))
      );
      setSelectedIds(new Set());
      return { prev };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['admin', 'posts', 'list'], context?.prev);
      toast.error('ไม่สามารถลบได้');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'posts'] });
      toast.success('ลบสำเร็จ');
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
          checked={selectedIds.size === filteredPosts.length && filteredPosts.length > 0}
          onChange={() => setSelectedIds(prev => prev.size === filteredPosts.length ? new Set() : new Set(filteredPosts.map(p => p.id)))}
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
            <Link href={`/post/${post.id}/edit`}>
              <Button variant="ghost" size="icon-sm" className="rounded-lg" title="แก้ไขกระทู้">
                <Edit className="h-4 w-4" />
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
  ], [selectedIds, filteredPosts.length, handleTogglePin, handleToggleLock, handleDelete]);

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
      ? livePosts?.filter(p => selectedIds.has(p.id)) ?? []
      : filteredPosts;

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
  }, [filteredPosts, livePosts, selectedIds]);

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-2 sm:justify-between sm:items-center mb-4">
        <p className="text-sm text-muted-foreground">{livePosts?.length ?? 0} กระทู้</p>
        <div className="flex gap-2 self-end">
          {selectedIds.size > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-xl gap-2">
                  <Download className="h-4 w-4" /> Export ที่เลือก ({selectedIds.size})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExport(true, 'xlsx')}>
                  Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport(true, 'csv')}>
                  CSV (.csv)
                </DropdownMenuItem>
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
              <DropdownMenuItem onClick={() => handleExport(false, 'xlsx')}>
                Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport(false, 'csv')}>
                CSV (.csv)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AdminDataTable
        data={filteredPosts}
        columns={columns}
        pageSize={15}
        searchable
        searchPlaceholder="ค้นหากระทู้..."
        onSearchChange={setSearchQuery}
        searchQuery={searchQuery}
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