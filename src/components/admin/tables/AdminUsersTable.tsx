'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import * as XLSX from 'xlsx';
import { AdminDataTable } from '../AdminDataTable';
import { BulkActionsBar } from '../BulkActionsBar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Search, Download, Shield, Ban, CheckCircle, AlertTriangle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Profile } from '@/types';

interface AdminUsersTableProps {
  initialUsers: Profile[];
  totalCount: number;
  currentPage?: number;
  pageSize?: number;
  searchQuery?: string;
  statusFilter?: string;
  roleFilter?: string;
  facultyFilter?: string;
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

export function AdminUsersTable({
  initialUsers,
  totalCount,
  currentPage = 1,
  pageSize = 50,
  searchQuery = '',
  statusFilter,
  roleFilter,
  facultyFilter,
}: AdminUsersTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const supabase = useMemo(() => createClient(), []);

  const { data: usersData, refetch } = useQuery({
    queryKey: ['admin', 'users', 'list', currentPage, pageSize, searchQuery, statusFilter, roleFilter, facultyFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize),
        ...(searchQuery ? { search: searchQuery } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(roleFilter ? { role: roleFilter } : {}),
        ...(facultyFilter ? { faculty: facultyFilter } : {}),
      });
      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const result = await res.json();
      return result as { users: Profile[]; total: number; page: number; totalPages: number };
    },
    initialData: {
      users: initialUsers,
      total: totalCount,
      page: currentPage,
      totalPages: Math.ceil(totalCount / pageSize),
    },
placeholderData: (prev) => prev,
  });

  const totalPages = usersData?.totalPages ?? Math.ceil(totalCount / pageSize);

  const handleFilterChange = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    router.push(`/admin/users?${params.toString()}`);
  }, [router, searchParams]);

  const handlePageChange = useCallback((newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(newPage));
    router.push(`/admin/users?${params.toString()}`);
  }, [router, searchParams]);

  const handleSearch = useCallback((query: string) => {
    setLocalSearch(query);
    const params = new URLSearchParams(searchParams.toString());
    if (query) {
      params.set('search', query);
    } else {
      params.delete('search');
    }
    params.set('page', '1');
    router.push(`/admin/users?${params.toString()}`);
  }, [router, searchParams]);

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<Profile> }) => {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, updates }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onMutate: async ({ userId, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'users'] });
      const prev = queryClient.getQueryData(['admin', 'users', 'list']);
      queryClient.setQueryData<{ users: Profile[] }>(['admin', 'users', 'list'], (old) => {
        if (!old) return old;
        return {
          ...old,
          users: old.users.map((u) => (u.id === userId ? { ...u, ...updates } : u)),
        };
      });
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(['admin', 'users', 'list'], context.prev);
      }
      toast.error('เกิดข้อผิดพลาด');
    },
    onSuccess: () => {
      toast.success('อัปเดตสำเร็จ');
      refetch();
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Partial<Profile> }) => {
      const results = await Promise.allSettled(
        ids.map(async (userId) => {
          const res = await fetch('/api/admin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, updates }),
          });
          if (!res.ok) throw new Error(`Failed ${userId}`);
          return res.json();
        })
      );
      const failed = results.filter(r => r.status === 'rejected').length;
      if (failed > 0) throw new Error(`${failed} รายการไม่สำเร็จ`);
    },
    onMutate: async ({ ids, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'users'] });
      const prev = queryClient.getQueryData(['admin', 'users', 'list']);
      queryClient.setQueryData<Profile[]>(['admin', 'users', 'list'], (old) =>
        old?.map((u) => (ids.includes(u.id) ? { ...u, ...updates } : u))
      );
      setSelectedIds(new Set());
      return { prev };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['admin', 'users', 'list'], context?.prev);
      toast.error('อัปเดตไม่สำเร็จ');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

const filteredUsers = useMemo(() => {
    const users = usersData?.users ?? [];
    if (!searchQuery) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(u =>
      u.display_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  }, [usersData?.users, searchQuery]);

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
            if (newSet.has(row.original.id)) newSet.delete(row.original.id);
            else newSet.add(row.original.id);
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
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.faculty || '-'}</p>
          <p className="text-xs text-muted-foreground">{row.original.major || '-'}</p>
        </div>
      ),
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
                <DropdownMenuItem onClick={() => updateUserMutation.mutate({ userId: user.id, updates: { role: 'admin' } })}>
                  <Shield className="h-4 w-4 mr-2" />ตั้งแอดมิน
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => updateUserMutation.mutate({ userId: user.id, updates: { role: 'user' } })}>
                  <Shield className="h-4 w-4 mr-2" />ถอดแอดมิน
                </DropdownMenuItem>
              )}
              {user.status === 'active' ? (
                <DropdownMenuItem onClick={() => updateUserMutation.mutate({ userId: user.id, updates: { status: 'suspended' } })}>
                  <AlertTriangle className="h-4 w-4 mr-2" />ระงับชั่วคราว
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => updateUserMutation.mutate({ userId: user.id, updates: { status: 'active' } })}>
                  <CheckCircle className="h-4 w-4 mr-2" />ยกเลิกระงับ
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => updateUserMutation.mutate({ userId: user.id, updates: { status: 'banned' } })} className="text-red-600">
                <Ban className="h-4 w-4 mr-2" />แบนถาวร
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    }),
  ], [selectedIds, filteredUsers.length, updateUserMutation]);

  const handleExport = useCallback((onlySelected: boolean = false, format: 'xlsx' | 'csv' = 'xlsx') => {
    const users = usersData?.users ?? [];
    const dataToExport = onlySelected && selectedIds.size > 0
      ? users.filter(u => selectedIds.has(u.id))
      : filteredUsers;
    
    const rows = dataToExport.map(u => ({
      'ชื่อ': u.display_name ?? '',
      'อีเมล': u.email ?? '',
      'คณะ': u.faculty ?? '',
      'สาขา': u.major ?? '',
      'สถานะ': u.status === 'active' ? 'ใช้งาน' : u.status === 'suspended' ? 'ระงับ' : u.status === 'banned' ? 'แบน' : u.status,
      'บทบาท': u.role === 'admin' ? 'แอดมิน' : u.role === 'moderator' ? 'ม็อด' : 'สมาชิก',
    }));

    if (format === 'xlsx') {
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Users');
      XLSX.writeFile(wb, `users_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else {
      const headers = ['ชื่อ', 'อีเมล', 'คณะ', 'สาขา', 'สถานะ', 'บทบาท'];
      const csvRows = dataToExport.map(u => [u.display_name, u.email, u.faculty, u.major, u.status, u.role]);
      const csv = [headers, ...csvRows].map(r => r.map(c => `"${c || ''}"`).join(',')).join('\n');
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [filteredUsers, usersData?.users, selectedIds]);

  const bulkActions = [
    {
      id: 'suspend',
      label: 'ระงับ',
      icon: AlertTriangle,
      variant: 'warning' as const,
      onClick: (ids: string[]) => bulkUpdateMutation.mutate({ ids, updates: { status: 'suspended' } }),
      confirmMessage: 'ระงับผู้ใช้ที่เลือก',
    },
    {
      id: 'ban',
      label: 'แบน',
      icon: Ban,
      variant: 'destructive' as const,
      onClick: (ids: string[]) => bulkUpdateMutation.mutate({ ids, updates: { status: 'banned' } }),
      confirmMessage: 'แบนผู้ใช้ที่เลือก',
    },
    {
      id: 'activate',
      label: 'เปิดใช้',
      icon: CheckCircle,
      onClick: (ids: string[]) => bulkUpdateMutation.mutate({ ids, updates: { status: 'active' } }),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:justify-between sm:items-center">
        <p className="text-sm text-muted-foreground">{(usersData?.total ?? totalCount)} ผู้ใช้งาน</p>
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

  {/* Filters */}
  <div className="flex flex-wrap gap-2 mb-4">
    <Select value={statusFilter || 'all'} onValueChange={(v) => handleFilterChange('status', v)}>
      <SelectTrigger className="w-[140px] h-9 rounded-xl">
        <SelectValue placeholder="สถานะ" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">ทั้งหมด</SelectItem>
        <SelectItem value="active">ใช้งาน</SelectItem>
        <SelectItem value="suspended">ระงับ</SelectItem>
        <SelectItem value="banned">แบน</SelectItem>
      </SelectContent>
    </Select>

    <Select value={roleFilter || 'all'} onValueChange={(v) => handleFilterChange('role', v)}>
      <SelectTrigger className="w-[140px] h-9 rounded-xl">
        <SelectValue placeholder="บทบาท" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">ทั้งหมด</SelectItem>
        <SelectItem value="admin">แอดมิน</SelectItem>
        <SelectItem value="moderator">ม็อด</SelectItem>
        <SelectItem value="user">สมาชิก</SelectItem>
      </SelectContent>
    </Select>

    <Select value={facultyFilter || 'all'} onValueChange={(v) => handleFilterChange('faculty', v)}>
      <SelectTrigger className="w-[180px] h-9 rounded-xl">
        <SelectValue placeholder="คณะ" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">ทั้งหมด</SelectItem>
        <SelectItem value="คณะวิทยาศาสตร์">คณะวิทยาศาสตร์</SelectItem>
        <SelectItem value="คณะวิศวกรรมศาสตร์">คณะวิศวกรรมศาสตร์</SelectItem>
        <SelectItem value="คณะบริหารธุรกิจ">คณะบริหารธุรกิจ</SelectItem>
        <SelectItem value="คณะอื่นๆ">คณะอื่นๆ</SelectItem>
      </SelectContent>
    </Select>

    {(statusFilter || roleFilter || facultyFilter) && (
      <Button
        variant="ghost"
        size="sm"
        className="h-9 rounded-xl text-muted-foreground"
        onClick={() => {
          const params = new URLSearchParams();
          params.set('page', '1');
          if (searchQuery) params.set('search', searchQuery);
          router.push(`/admin/users?${params.toString()}`);
        }}
      >
        ล้างตัวกรอง
      </Button>
    )}
  </div>

  <AdminDataTable
    data={filteredUsers}
    columns={columns}
    pageSize={15}
    searchable
    searchPlaceholder="ค้นหาชื่อหรืออีเมล..."
    onSearchChange={handleSearch}
    searchQuery={localSearch}
    selectable
    selectedIds={selectedIds}
    onSelectionChange={setSelectedIds}
    onRowClick={(user) => window.location.href = `/admin/users/${user.id}`}
    emptyMessage="ไม่พบผู้ใช้"
  />

      <BulkActionsBar
        selectedCount={selectedIds.size}
        selectedIds={Array.from(selectedIds)}
        onClear={() => setSelectedIds(new Set())}
        actions={bulkActions}
      />
    </div>
  );
}