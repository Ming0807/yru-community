'use client';

import Link from 'next/link';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Search, Shield, Ban, CheckCircle, ChevronDown, Users, Eye, Download, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { Profile } from '@/types';

interface Props {
  initialUsers: Profile[];
  totalCount: number;
}

export default function AdminUsersClient({ initialUsers, totalCount }: Props) {
  const [users, setUsers] = useState<Profile[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const supabase = createClient();

  const loadMore = async () => {
    setLoadingMore(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .range(users.length, users.length + 99);

    if (!error && data) {
      setUsers(prev => [...prev, ...(data as Profile[])]);
    } else {
      toast.error('ไม่สามารถโหลดข้อมูลเพิ่มเติมได้');
    }
    setLoadingMore(false);
  };

  const updateUser = async (userId: string, updates: Partial<Profile>) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, updates }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed');
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, ...updates } : u))
      );

      toast.success('อัปเดตข้อมูลผู้ใช้สำเร็จ');
    } catch {
      toast.error('เกิดข้อผิดพลาดในการอัปเดตข้อมูล');
    }
  };

  const handlePromoteToAdmin = async (userId: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะตั้งผู้ใช้รายนี้เป็นแอดมิน?\n\nการกระทำนี้จะให้สิทธิ์เต็มในการจัดการระบบ')) return;
    await updateUser(userId, { role: 'admin' });
  };

  const handleDemoteFromAdmin = async (userId: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะปลดแอดมินรายนี้?')) return;
    await updateUser(userId, { role: 'user' });
  };

  const handleBanUser = async (userId: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะแบนผู้ใช้รายนี้ถาวร?')) return;
    await updateUser(userId, { status: 'banned' });
  };

  const handleSuspendUser = async (userId: string) => {
    await updateUser(userId, { status: 'suspended' });
  };

  const handleActivateUser = async (userId: string) => {
    await updateUser(userId, { status: 'active' });
  };

  const exportCSV = () => {
    const headers = ['ID', 'ชื่อ', 'อีเมล', 'คณะ', 'สาขา', 'สถานะ', 'บทบาท', 'วันที่เข้าร่วม'];
    const rows = filteredUsers.map(u => [
      u.id,
      u.display_name,
      u.email,
      u.faculty || '',
      u.major || '',
      u.status || 'active',
      u.role || 'user',
      new Date(u.created_at).toLocaleDateString('th-TH'),
    ]);

    const csvContent = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredUsers = users.filter(
    (u) =>
      u.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-(--color-yru-pink)" />
            จัดการผู้ใช้
          </h1>
          <p className="text-muted-foreground">
            รายชื่อผู้ใช้ทั้งหมด {totalCount.toLocaleString()} คนในระบบ YRU Community
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            className="rounded-xl gap-2 shrink-0"
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาชื่อ หรือ อีเมล..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-xl"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-background overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b border-border/60">
              <tr>
                <th className="px-6 py-4 font-medium">ผู้ใช้งาน</th>
                <th className="px-6 py-4 font-medium">คณะ / สาขา</th>
                <th className="px-6 py-4 font-medium">สถานะ</th>
                <th className="px-6 py-4 font-medium">บทบาท</th>
                <th className="px-6 py-4 font-medium text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    ไม่พบข้อมูลผู้ใช้
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={user.avatar_url ?? undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {user.display_name?.charAt(0) ?? 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <Link href={`/admin/users/${user.id}`} className="font-medium text-foreground hover:text-[var(--color-yru-pink)] hover:underline transition-colors">
                            {user.display_name}
                          </Link>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium">{user.faculty || '-'}</p>
                      <p className="text-xs text-muted-foreground">{user.major || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      {user.status === 'banned' ? (
                        <Badge variant="destructive" className="rounded-md bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20">ระงับการใช้งาน</Badge>
                      ) : user.status === 'suspended' ? (
                        <Badge variant="outline" className="rounded-md border-orange-500/50 text-orange-500">แบนชั่วคราว</Badge>
                      ) : (
                        <Badge variant="outline" className="rounded-md border-green-500/50 text-green-500">ปกติ</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {user.role === 'admin' ? (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-(--color-yru-pink)">
                          <Shield className="h-3.5 w-3.5" /> แอดมิน
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">ผู้ใช้ทั่วไป</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl">
                          <DropdownMenuItem className="text-xs text-muted-foreground px-2 py-1.5 focus:bg-transparent cursor-default">
                            เปลี่ยนสถานะบัญชี
                          </DropdownMenuItem>
                          {user.status !== 'active' && (
                            <DropdownMenuItem onClick={() => handleActivateUser(user.id)} className="cursor-pointer gap-2 text-green-600 focus:text-green-600">
                              <CheckCircle className="h-4 w-4" /> ปลดแบน (Active)
                            </DropdownMenuItem>
                          )}
                          {user.status !== 'suspended' && (
                            <DropdownMenuItem onClick={() => handleSuspendUser(user.id)} className="cursor-pointer gap-2 text-orange-600 focus:text-orange-600">
                              <Ban className="h-4 w-4" /> แบนชั่วคราว (Suspend)
                            </DropdownMenuItem>
                          )}
                          {user.status !== 'banned' && (
                            <DropdownMenuItem onClick={() => handleBanUser(user.id)} className="cursor-pointer gap-2 text-red-600 focus:text-red-600">
                              <Ban className="h-4 w-4" /> ถาวร (Ban)
                            </DropdownMenuItem>
                          )}
                          <div className="h-px bg-border my-1" />
                          <DropdownMenuItem className="text-xs text-muted-foreground px-2 py-1.5 focus:bg-transparent cursor-default">
                            เปลี่ยนบทบาท
                          </DropdownMenuItem>
                          {user.role !== 'admin' ? (
                            <DropdownMenuItem onClick={() => handlePromoteToAdmin(user.id)} className="cursor-pointer gap-2">
                              <Shield className="h-4 w-4" /> ตั้งเป็นแอดมิน
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleDemoteFromAdmin(user.id)} className="cursor-pointer gap-2 text-red-600 focus:text-red-600">
                              <Shield className="h-4 w-4" /> ปลดแอดมิน
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Load More */}
        {users.length < totalCount && (
          <div className="p-4 border-t border-border/60 flex justify-center">
            <Button
              variant="outline"
              onClick={loadMore}
              disabled={loadingMore}
              className="rounded-xl gap-2"
            >
              <ChevronDown className="h-4 w-4" />
              {loadingMore ? 'กำลังโหลด...' : `โหลดเพิ่ม (${users.length}/${totalCount})`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
