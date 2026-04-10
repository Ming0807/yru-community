'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { createColumnHelper } from '@tanstack/react-table';
import { AdminDataTable } from '../AdminDataTable';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Search, Download, Shield, Ban, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import type { Profile } from '@/types';

interface AdminUsersTableProps {
  initialUsers: Profile[];
  totalCount: number;
}

const columnHelper = createColumnHelper<Profile>();

function getStatusBadge(status: Profile['status']) {
  switch (status) {
    case 'active':
      return <Badge variant="default" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">ใช้งาน</Badge>;
    case 'suspended':
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">ระงับ</Badge>;
    case 'banned':
      return <Badge variant="destructive" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">แบน</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getRoleBadge(role: Profile['role']) {
  switch (role) {
    case 'admin':
      return <Badge variant="default" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">แอดมิน</Badge>;
    case 'moderator':
      return <Badge variant="default" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">ม็อด</Badge>;
    default:
      return <Badge variant="outline">สมาชิก</Badge>;
  }
}

export function AdminUsersTable({ initialUsers, totalCount }: AdminUsersTableProps) {
  const [users, setUsers] = useState<Profile[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const supabase = useMemo(() => import('@/lib/supabase/client').then(m => m.createClient()), []);

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(u => 
      u.display_name?.toLowerCase().includes(q) || 
      u.email?.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const updateUser = useCallback(async (userId: string, updates: Partial<Profile>) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, updates }),
      });

      if (!res.ok) throw new Error('Failed');
      
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
      toast.success('อัปเดตสำเร็จ');
    } catch {
      toast.error('เกิดข้อผิดพลาด');
    }
  }, []);

  const columns = useMemo(() => [
    columnHelper.display({
      id: 'select',
      header: () => (
        <input
          type="checkbox"
          checked={selectedIds.size === filteredUsers.length && filteredUsers.length > 0}
          onChange={() => {
            if (selectedIds.size === filteredUsers.length) {
              setSelectedIds(new Set());
            } else {
              setSelectedIds(new Set(filteredUsers.map(u => u.id)));
            }
          }}
          className="w-4 h-4 rounded cursor-pointer"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.original.id)}
          onChange={() => {
            const newSet = new Set(selectedIds);
            if (newSet.has(row.original.id)) {
              newSet.delete(row.original.id);
            } else {
              newSet.add(row.original.id);
            }
            setSelectedIds(newSet);
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 rounded cursor-pointer"
        />
      ),
    }),
    columnHelper.accessor('display_name', {
      header: 'ผู้ใช้งาน',
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {user.display_name?.charAt(0) ?? 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <Link href={`/admin/users/${user.id}`} className="font-medium hover:text-[var(--color-yru-pink)] hover:underline">
                {user.display_name}
              </Link>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
        );
      },
    }),
    columnHelper.accessor('faculty', {
      header: 'คณะ / สาขา',
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div>
            <p className="font-medium">{user.faculty || '-'}</p>
            <p className="text-xs text-muted-foreground">{user.major || '-'}</p>
          </div>
        );
      },
    }),
    columnHelper.accessor('status', {
      header: 'สถานะ',
      cell: ({ row }) => getStatusBadge(row.original.status),
    }),
    columnHelper.accessor('role', {
      header: 'บทบาท',
      cell: ({ row }) => getRoleBadge(row.original.role),
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const user = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="rounded-lg">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem asChild>
                <Link href={`/admin/users/${user.id}`} className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  ดูโปรไฟล์
                </Link>
              </DropdownMenuItem>
              {user.role !== 'admin' ? (
                <DropdownMenuItem onClick={() => updateUser(user.id, { role: 'admin' })}>
                  <Shield className="h-4 w-4 mr-2" />ตั้งแอดมิน
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => updateUser(user.id, { role: 'user' })}>
                  <Shield className="h-4 w-4 mr-2" />ถอดแอดมิน
                </DropdownMenuItem>
              )}
              {user.status === 'active' ? (
                <DropdownMenuItem onClick={() => updateUser(user.id, { status: 'suspended' })}>
                  <AlertTriangle className="h-4 w-4 mr-2" />ระงับชั่วคราว
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => updateUser(user.id, { status: 'active' })}>
                  <CheckCircle className="h-4 w-4 mr-2" />ยกเลิกระงับ
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => updateUser(user.id, { status: 'banned' })} className="text-red-600">
                <Ban className="h-4 w-4 mr-2" />แบนถาวร
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    }),
  ], [updateUser]);

  const handleExport = useCallback(() => {
    const headers = ['ชื่อ', 'อีเมล', 'คณะ', 'สาขา', 'สถานะ', 'บทบาท'];
    const rows = filteredUsers.map(u => [u.display_name, u.email, u.faculty, u.major, u.status, u.role]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c || ''}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredUsers]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:justify-between sm:items-center">
        <p className="text-sm text-muted-foreground">{totalCount} ผู้ใช้งาน</p>
        <Button variant="outline" size="sm" onClick={handleExport} className="rounded-xl gap-2 self-end">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <AdminDataTable
        data={filteredUsers}
        columns={columns}
        pageSize={15}
        searchable
        searchPlaceholder="ค้นหาชื่อหรืออีเมล..."
        onSearchChange={setSearchQuery}
        searchQuery={searchQuery}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onRowClick={(user) => window.location.href = `/admin/users/${user.id}`}
        emptyMessage="ไม่พบผู้ใช้"
      />
    </div>
  );
}