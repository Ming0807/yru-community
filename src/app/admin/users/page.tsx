'use client';

import { useState, useEffect } from 'react';
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
import { MoreHorizontal, Search, Shield, Ban, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { timeAgo } from '@/lib/utils';
import type { Profile } from '@/types';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const supabase = createClient();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async (retries = 3) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (retries > 0) {
          console.warn('[AdminUsers] Fetch error, retrying...', error.message);
          await new Promise((r) => setTimeout(r, 800 * (4 - retries)));
          return fetchUsers(retries - 1);
        }
        toast.error('ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
      } else {
        setUsers(data || []);
      }
    } catch (err) {
      if (retries > 0) {
        await new Promise((r) => setTimeout(r, 800 * (4 - retries)));
        return fetchUsers(retries - 1);
      }
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
    setLoading(false);
  };

  const updateUser = async (userId: string, updates: Partial<Profile>) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;
      
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, ...updates } : u))
      );
      toast.success('อัปเดตข้อมูลผู้ใช้สำเร็จ');
    } catch {
      toast.error('เกิดข้อผิดพลาดในการอัปเดตข้อมูล');
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">จัดการผู้ใช้</h1>
          <p className="text-muted-foreground">
            รายชื่อผู้ใช้ทั้งหมดในระบบ YRU Community
          </p>
        </div>
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
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
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
                          <p className="font-medium text-foreground">{user.display_name}</p>
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
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-yru-pink)]">
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
                            <DropdownMenuItem onClick={() => updateUser(user.id, { status: 'active' })} className="cursor-pointer gap-2 text-green-600 focus:text-green-600">
                              <CheckCircle className="h-4 w-4" /> ปลดแบน (Active)
                            </DropdownMenuItem>
                          )}
                          {user.status !== 'suspended' && (
                            <DropdownMenuItem onClick={() => updateUser(user.id, { status: 'suspended' })} className="cursor-pointer gap-2 text-orange-600 focus:text-orange-600">
                              <Ban className="h-4 w-4" /> แบนชั่วคราว (Suspend)
                            </DropdownMenuItem>
                          )}
                          {user.status !== 'banned' && (
                            <DropdownMenuItem onClick={() => updateUser(user.id, { status: 'banned' })} className="cursor-pointer gap-2 text-red-600 focus:text-red-600">
                              <Ban className="h-4 w-4" /> ถาวร (Ban)
                            </DropdownMenuItem>
                          )}
                          <div className="h-px bg-border my-1" />
                          <DropdownMenuItem className="text-xs text-muted-foreground px-2 py-1.5 focus:bg-transparent cursor-default">
                            เปลี่ยนบทบาท
                          </DropdownMenuItem>
                          {user.role !== 'admin' ? (
                            <DropdownMenuItem onClick={() => updateUser(user.id, { role: 'admin' })} className="cursor-pointer gap-2">
                              <Shield className="h-4 w-4" /> ตั้งเป็นแอดมิน
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => updateUser(user.id, { role: 'user' })} className="cursor-pointer gap-2 text-red-600 focus:text-red-600">
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
      </div>
    </div>
  );
}
