'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Plus, Trash2, Search, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface WordFilter {
  id: string;
  word: string;
  severity: 'low' | 'medium' | 'high';
  action: 'flag' | 'warn' | 'block';
  created_at: string;
}

export default function AdminWordFilterPage() {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);
  const [newWord, setNewWord] = useState('');
  const [newSeverity, setNewSeverity] = useState<'low' | 'medium' | 'high'>('medium');
  const [newAction, setNewAction] = useState<'flag' | 'warn' | 'block'>('warn');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: words = [], isLoading } = useQuery({
    queryKey: ['admin', 'word-filters'],
    queryFn: async () => {
      const res = await fetch('/api/admin/word-filter');
      if (!res.ok) throw new Error('Failed to fetch word filters');
      const data = await res.json();
      return (data ?? []) as WordFilter[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/word-filter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: newWord, severity: newSeverity, action: newAction }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'word-filters'] });
      setNewWord('');
      toast.success('เพิ่มคำกรองสำเร็จ');
    },
    onError: (err: any) => {
      toast.error(err.message || 'ไม่สามารถเพิ่มได้');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/word-filter?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'word-filters'] });
      toast.success('ลบคำกรองสำเร็จ');
    },
    onError: () => {
      toast.error('ไม่สามารถลบได้');
    },
  });

  const filteredWords = searchQuery
    ? words.filter(w => w.word.toLowerCase().includes(searchQuery.toLowerCase()))
    : words;

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <Badge variant="destructive">สูง</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">กลาง</Badge>;
      case 'low':
        return <Badge variant="outline">ต่ำ</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'block':
        return 'บล็อก';
      case 'warn':
        return 'เตือน';
      case 'flag':
        return 'แจ้งเตือน';
      default:
        return action;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-[var(--color-yru-pink)]/10">
          <Shield className="h-5 w-5 text-[var(--color-yru-pink)]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">ตัวกรองคำหยาบ</h1>
          <p className="text-sm text-muted-foreground">จัดการคำที่ถูกกรองอัตโนมัติในระบบ</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl border border-border/40 bg-card card-shadow">
          <p className="text-2xl font-bold">{words.length}</p>
          <p className="text-sm text-muted-foreground">คำที่กรองทั้งหมด</p>
        </div>
        <div className="p-4 rounded-2xl border border-border/40 bg-card card-shadow">
          <p className="text-2xl font-bold text-red-500">{words.filter(w => w.severity === 'high').length}</p>
          <p className="text-sm text-muted-foreground">คำระดับสูง (บล็อก)</p>
        </div>
        <div className="p-4 rounded-2xl border border-border/40 bg-card card-shadow">
          <p className="text-2xl font-bold text-yellow-500">{words.filter(w => w.severity === 'medium').length}</p>
          <p className="text-sm text-muted-foreground">คำระดับกลาง (เตือน)</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/40 bg-card card-shadow p-4">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาคำกรอง..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-xl"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="เพิ่มคำใหม่..."
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addMutation.mutate()}
              className="w-40 rounded-xl"
            />
            <Select value={newSeverity} onValueChange={(v: 'low' | 'medium' | 'high') => setNewSeverity(v)}>
              <SelectTrigger className="w-28 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">ต่ำ</SelectItem>
                <SelectItem value="medium">กลาง</SelectItem>
                <SelectItem value="high">สูง</SelectItem>
              </SelectContent>
            </Select>
            <Select value={newAction} onValueChange={(v: 'flag' | 'warn' | 'block') => setNewAction(v)}>
              <SelectTrigger className="w-28 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flag">แจ้ง</SelectItem>
                <SelectItem value="warn">เตือน</SelectItem>
                <SelectItem value="block">บล็อก</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending} className="rounded-xl gap-2">
              <Plus className="h-4 w-4" />
              เพิ่ม
            </Button>
          </div>
        </div>

        <div className="divide-y divide-border/30">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">กำลังโหลด...</div>
          ) : filteredWords.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              ไม่พบคำกรอง
            </div>
          ) : (
            filteredWords.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{item.word}</span>
                  {getSeverityBadge(item.severity)}
                  <Badge variant="outline" className="text-xs">{getActionLabel(item.action)}</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-red-500 hover:text-red-600"
                  onClick={() => deleteMutation.mutate(item.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}