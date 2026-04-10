'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createColumnHelper } from '@tanstack/react-table';
import { AdminDataTable } from '../AdminDataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Trash2, Pin, PinOff, Lock, LockOpen } from 'lucide-react';
import { toast } from 'sonner';

interface Post {
  id: string;
  title: string;
  category: { name: string } | null;
  created_at: string;
  status: string;
  is_pinned: boolean;
  is_locked: boolean;
}

interface AdminContentTableProps {
  initialPosts: Post[];
}

const columnHelper = createColumnHelper<Post>();

export function AdminContentTable({ initialPosts }: AdminContentTableProps) {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>(initialPosts);

  useEffect(() => {
    setPosts(initialPosts);
  }, [initialPosts]);

  const [searchQuery, setSearchQuery] = useState('');

  const filteredPosts = useMemo(() => {
    if (!searchQuery) return posts;
    const q = searchQuery.toLowerCase();
    return posts.filter(p => p.title.toLowerCase().includes(q));
  }, [posts, searchQuery]);

  const handleDelete = useCallback(async (postId: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบกระทู้นี้?')) return;
    try {
      const res = await fetch(`/api/admin/posts?id=${postId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed');
      setPosts(prev => prev.filter(p => p.id !== postId));
      toast.success('ลบสำเร็จ');
    } catch {
      toast.error('เกิดข้อผิดพลาด');
    }
  }, []);

  const handleTogglePin = useCallback(async (postId: string, current: boolean) => {
    try {
      const res = await fetch('/api/admin/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, updates: { is_pinned: !current } }),
      });
      if (!res.ok) throw new Error('Failed');
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_pinned: !current } : p));
      toast.success(!current ? 'ปักหมุดสำเร็จ' : 'ถอดหมุดสำเร็จ');
    } catch {
      toast.error('เกิดข้อผิดพลาด');
    }
  }, []);

  const handleToggleLock = useCallback(async (postId: string, current: boolean) => {
    const newValue = !current;
    console.log('[Lock] Toggle:', postId, current, '→', newValue);
    
    try {
      const res = await fetch('/api/admin/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, updates: { is_locked: newValue } }),
      });
      
      const data = await res.json();
      console.log('[Lock] Response:', res.status, data);
      
      if (!res.ok) {
        if (data.error?.includes('is_locked')) {
          toast.error('ต้องสร้าง column is_locked ก่อน');
        }
        throw new Error(data.error || 'Failed');
      }
      
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_locked: newValue } : p));
      toast.success(newValue ? 'ล็อกสำเร็จ' : 'ปลดล็อกสำเร็จ');
    } catch (e: unknown) {
      console.error('[Lock] Error:', e);
      toast.error('เกิดข้อผิดพลาด');
    }
  }, []);

  const columns = useMemo(() => [
    columnHelper.accessor('title', {
      header: 'กระทู้',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.is_pinned && (
            <span className="text-(--color-yru-pink)" title="ปักหมุด">📌</span>
          )}
          {row.original.is_locked && (
            <span className="text-muted-foreground" title="ล็อกแล้ว">🔒</span>
          )}
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
            {/* ── ดู ── */}
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-lg text-muted-foreground hover:text-foreground"
              title="ดูกระทู้"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push(`/post/${post.id}`);
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>

            {/* ── ปักหมุด / ถอดหมุด ── */}
            <Button
              variant="ghost"
              size="icon-sm"
              className={`rounded-lg ${
                post.is_pinned
                  ? 'text-(--color-yru-pink) hover:text-yru-pink/70'
                  : 'text-muted-foreground hover:text-(--color-yru-pink)'
              }`}
              title={post.is_pinned ? 'ถอดหมุด' : 'ปักหมุด'}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleTogglePin(post.id, post.is_pinned);
              }}
            >
              {post.is_pinned
                ? <PinOff className="h-4 w-4" />
                : <Pin className="h-4 w-4" />}
            </Button>

            {/* ── ล็อก / ปลดล็อก ── */}
            <Button
              variant="ghost"
              size="icon-sm"
              className={`rounded-lg ${
                post.is_locked
                  ? 'text-amber-500 hover:text-amber-400'
                  : 'text-muted-foreground hover:text-amber-500'
              }`}
              title={post.is_locked ? 'ปลดล็อก' : 'ล็อกกระทู้'}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleToggleLock(post.id, post.is_locked);
              }}
            >
              {post.is_locked
                ? <Lock className="h-4 w-4" />
                : <LockOpen className="h-4 w-4" />}
            </Button>

            {/* ── ลบ ── */}
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-lg text-muted-foreground hover:text-red-500"
              title="ลบกระทู้"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDelete(post.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    }),
  ], [handleDelete, handleTogglePin, handleToggleLock, router]);

  return (
    <AdminDataTable
      data={filteredPosts}
      columns={columns}
      pageSize={15}
      searchable
      searchPlaceholder="ค้นหากระทู้..."
      onSearchChange={setSearchQuery}
      searchQuery={searchQuery}
      onRowClick={(post) => router.push(`/post/${post.id}`)}
      emptyMessage="ไม่พบกระทู้"
    />
  );
}