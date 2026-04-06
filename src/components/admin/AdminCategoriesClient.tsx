'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, GripVertical, FolderTree } from 'lucide-react';
import { toast } from 'sonner';
import { logAdminAction } from '@/lib/admin-audit';

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
}

interface Props {
  initialCategories: Category[];
}

export default function AdminCategoriesClient({ initialCategories }: Props) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    icon: '💬',
    sort_order: 0,
  });

  const supabase = createClient();

  const resetForm = () => {
    setEditingId(null);
    setFormData({ name: '', slug: '', description: '', icon: '💬', sort_order: 0 });
  };

  const openEdit = (cat: Category) => {
    setEditingId(cat.id);
    setFormData({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      icon: cat.icon || '💬',
      sort_order: cat.sort_order,
    });
    setIsDialogOpen(true);
  };

  const saveCategory = async () => {
    if (!formData.name || !formData.slug) {
      toast.error('กรุณากรอกชื่อหมวดหมู่และ slug');
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from('categories')
          .update(formData)
          .eq('id', editingId);
        if (error) throw error;

        await logAdminAction('UPDATE_CATEGORY', {
          target_type: 'category',
          target_id: String(editingId),
          extra: { ...formData },
        });

        setCategories(prev =>
          prev.map(c => (c.id === editingId ? { ...c, ...formData } : c))
        );
        toast.success('อัปเดตหมวดหมู่สำเร็จ');
      } else {
        const { data, error } = await supabase
          .from('categories')
          .insert([formData])
          .select()
          .single();
        if (error) throw error;

        await logAdminAction('CREATE_CATEGORY', {
          target_type: 'category',
          target_id: String(data.id),
          extra: { ...formData },
        });

        setCategories(prev => [...prev, data as Category]);
        toast.success('เพิ่มหมวดหมู่สำเร็จ');
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(`บันทึกไม่สำเร็จ: ${err.message}`);
    }
  };

  const deleteCategory = async (id: number) => {
    if (!confirm('ยืนยันการลบหมวดหมู่นี้? กระทู้ที่ใช้หมวดหมู่นี้อาจได้รับผลกระทบ')) return;

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
      if (error) throw error;

      await logAdminAction('DELETE_CATEGORY', {
        target_type: 'category',
        target_id: String(id),
      });

      setCategories(prev => prev.filter(c => c.id !== id));
      toast.success('ลบหมวดหมู่สำเร็จ');
    } catch (err: any) {
      toast.error(`ลบไม่สำเร็จ: ${err.message}`);
    }
  };

  const autoSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9ก-๙-]/g, '')
      .slice(0, 40);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FolderTree className="h-6 w-6 text-(--color-yru-pink)" />
            จัดการหมวดหมู่
          </h1>
          <p className="text-muted-foreground">
            เพิ่ม แก้ไข หรือลบหมวดหมู่กระทู้สำหรับชุมชน YRU
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="rounded-xl gap-2 bg-(--color-yru-pink) hover:bg-(--color-yru-pink-dark) text-white">
              <Plus className="w-4 h-4" /> เพิ่มหมวดหมู่ใหม่
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>{editingId ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-[1fr_80px] gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">ชื่อหมวดหมู่</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setFormData({
                        ...formData,
                        name,
                        slug: editingId ? formData.slug : autoSlug(name),
                      });
                    }}
                    placeholder="เช่น ห้องรวม"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">ไอคอน</label>
                  <Input
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    placeholder="💬"
                    className="text-center text-xl"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Slug (URL)</label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="general"
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">คำอธิบาย</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="คำอธิบายสั้นๆ..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">ลำดับการเรียง</label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">
                ยกเลิก
              </Button>
              <Button onClick={saveCategory} className="rounded-xl bg-(--color-yru-pink) hover:bg-(--color-yru-pink-dark) text-white">
                {editingId ? 'บันทึกการแก้ไข' : 'เพิ่มหมวดหมู่'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Categories Table */}
      <div className="rounded-2xl border border-border/60 bg-background overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b border-border/60">
              <tr>
                <th className="px-6 py-4 font-medium w-12">#</th>
                <th className="px-6 py-4 font-medium">หมวดหมู่</th>
                <th className="px-6 py-4 font-medium">Slug</th>
                <th className="px-6 py-4 font-medium">คำอธิบาย</th>
                <th className="px-6 py-4 font-medium text-center">ลำดับ</th>
                <th className="px-6 py-4 font-medium text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <FolderTree className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    ยังไม่มีหมวดหมู่
                  </td>
                </tr>
              ) : (
                categories
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((cat) => (
                    <tr key={cat.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 text-muted-foreground">
                        <GripVertical className="h-4 w-4 inline opacity-30" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">{cat.icon || '📁'}</span>
                          <span className="font-medium text-foreground">{cat.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-xs bg-muted px-2 py-1 rounded">{cat.slug}</code>
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground max-w-[200px] truncate">
                        {cat.description || '-'}
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-xs">
                        {cat.sort_order}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => openEdit(cat)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                            onClick={() => deleteCategory(cat.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
