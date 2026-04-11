'use client';

import { useState } from 'react';
import { Shield, Plus, Trash2, Search, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const defaultFilteredWords = [
  { id: '1', word: 'หยาบคาย', severity: 'high', action: 'block' },
  { id: '2', word: 'สปอยล์', severity: 'medium', action: 'warn' },
  { id: '3', word: 'คำเสี่ยง', severity: 'low', action: 'flag' },
];

export default function AdminWordFilterPage() {
  const [words, setWords] = useState(defaultFilteredWords);
  const [newWord, setNewWord] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredWords = searchQuery
    ? words.filter(w => w.word.toLowerCase().includes(searchQuery.toLowerCase()))
    : words;

  const handleAddWord = () => {
    if (!newWord.trim()) {
      toast.error('กรุณากรอกคำที่ต้องการกรอง');
      return;
    }
    if (words.some(w => w.word.toLowerCase() === newWord.trim().toLowerCase())) {
      toast.error('คำนี้มีอยู่แล้ว');
      return;
    }
    setWords([...words, { id: Date.now().toString(), word: newWord.trim(), severity: 'medium', action: 'warn' }]);
    setNewWord('');
    toast.success('เพิ่มคำกรองสำเร็จ');
  };

  const handleDeleteWord = (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบคำนี้?')) return;
    setWords(words.filter(w => w.id !== id));
    toast.success('ลบคำกรองสำเร็จ');
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <Badge variant="destructive">สูง</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-700">กลาง</Badge>;
      case 'low':
        return <Badge variant="outline">ต่ำ</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
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
          <p className="text-sm text-muted-foreground">คำระดับสูง</p>
        </div>
        <div className="p-4 rounded-2xl border border-border/40 bg-card card-shadow">
          <p className="text-2xl font-bold text-yellow-500">{words.filter(w => w.severity === 'medium').length}</p>
          <p className="text-sm text-muted-foreground">คำระดับกลาง</p>
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
          <div className="flex gap-2">
            <Input
              placeholder="เพิ่มคำใหม่..."
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddWord()}
              className="w-40 rounded-xl"
            />
            <Button onClick={handleAddWord} className="rounded-xl gap-2">
              <Plus className="h-4 w-4" />
              เพิ่ม
            </Button>
          </div>
        </div>

        <div className="divide-y divide-border/30">
          {filteredWords.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              ไม่พบคำกรอง
            </div>
          ) : (
            filteredWords.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{item.word}</span>
                  {getSeverityBadge(item.severity)}
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-red-500 hover:text-red-600"
                  onClick={() => handleDeleteWord(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/10 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-800 dark:text-yellow-200">ระบบกรองคำอยู่ระหว่างการพัฒนา</p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              ระบบตัวกรองคำหยาบยังไม่ทำงานจริง คำที่เพิ่มในหน้านี้เป็นเพียงตัวอย่าง UI เท่านั้น
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}