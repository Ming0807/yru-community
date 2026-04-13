'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  Star,
  Crown,
  Award,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

interface AdPackage {
  id: string;
  name: string;
  description: string | null;
  tier: 'bronze' | 'silver' | 'gold' | 'custom';
  base_price: number;
  min_duration_days: number;
  max_duration_days: number;
  features: string[];
  targeting_included: string[];
  color: string;
  icon: string;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
}

const tierConfig = {
  bronze: { icon: Award, label: 'Bronze', color: '#CD7F32', bg: 'bg-amber-100' },
  silver: { icon: Star, label: 'Silver', color: '#C0C0C0', bg: 'bg-gray-100' },
  gold: { icon: Crown, label: 'Gold', color: '#FFD700', bg: 'bg-yellow-100' },
  custom: { icon: Star, label: 'Custom', color: '#888888', bg: 'bg-gray-100' },
};

export default function AdminPackagesPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<AdPackage | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tier: 'bronze' as AdPackage['tier'],
    base_price: 0,
    min_duration_days: 7,
    max_duration_days: 30,
    features: [] as string[],
    targeting_included: [] as string[],
    color: '#CD7F32',
    icon: '🏆',
    is_active: true,
    is_featured: false,
    sort_order: 0,
  });

  const { data: packages = [], isLoading } = useQuery<AdPackage[]>({
    queryKey: ['admin', 'packages'],
    queryFn: async () => {
      const res = await fetch('/api/admin/packages');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'packages'] });
      toast.success('สร้างแพ็กเกจสำเร็จ');
      handleCloseDialog();
    },
    onError: () => toast.error('ไม่สามารถสร้างแพ็กเกจได้'),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/packages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingPackage?.id, ...formData }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'packages'] });
      toast.success('อัปเดตแพ็กเกจสำเร็จ');
      handleCloseDialog();
    },
    onError: () => toast.error('ไม่สามารถอัปเดตแพ็กเกจได้'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/packages?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'packages'] });
      toast.success('ลบแพ็กเกจสำเร็จ');
    },
    onError: () => toast.error('ไม่สามารถลบแพ็กเกจได้'),
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPackage(null);
    setFormData({
      name: '',
      description: '',
      tier: 'bronze',
      base_price: 0,
      min_duration_days: 7,
      max_duration_days: 30,
      features: [],
      targeting_included: [],
      color: '#CD7F32',
      icon: '🏆',
      is_active: true,
      is_featured: false,
      sort_order: 0,
    });
  };

  const handleEdit = (pkg: AdPackage) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description || '',
      tier: pkg.tier,
      base_price: pkg.base_price,
      min_duration_days: pkg.min_duration_days,
      max_duration_days: pkg.max_duration_days,
      features: pkg.features || [],
      targeting_included: pkg.targeting_included || [],
      color: pkg.color || '#CD7F32',
      icon: pkg.icon || '🏆',
      is_active: pkg.is_active,
      is_featured: pkg.is_featured,
      sort_order: pkg.sort_order || 0,
    });
    setIsDialogOpen(true);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const availableFeatures = [
    { id: 'feed_placement', label: 'แสดงในฟีด' },
    { id: 'sidebar', label: 'แถบด้านข้าง' },
    { id: 'hero_banner', label: 'แบนเนอร์พิเศษ' },
    { id: 'basic_analytics', label: 'สถิติพื้นฐาน' },
    { id: 'advanced_analytics', label: 'สถิติขั้นสูง' },
    { id: 'premium_analytics', label: 'สถิติพรีเมียม' },
    { id: 'priority_approval', label: 'อนุมัติเป็นอันดับแรก' },
    { id: 'a_b_testing', label: 'ทดสอบ A/B' },
    { id: 'email_support', label: 'สนับสนุนทางอีเมล' },
    { id: 'dedicated_support', label: 'สนับสนุนเฉพาะทาง' },
    { id: 'monthly_report', label: 'รายงานรายเดือน' },
  ];

  const availableTargeting = [
    { id: 'category', label: 'หมวดหมู่' },
    { id: 'interest', label: 'ความสนใจ' },
    { id: 'faculty', label: 'คณะ (Killer Feature!)' },
    { id: 'time_of_day', label: 'ช่วงเวลา' },
    { id: 'year', label: 'ชั้นปี' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">แพ็กเกจโฆษณา</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            จัดการ Bronze, Silver, Gold และแพ็กเกจแบบกำหนดเอง
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl gap-2 bg-[var(--color-yru-pink)] hover:bg-[var(--color-yru-pink-dark)] text-white">
              <Plus className="w-4 h-4" />
              สร้างแพ็กเกจใหม่
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPackage ? 'แก้ไขแพ็กเกจ' : 'สร้างแพ็กเกจใหม่'}
              </DialogTitle>
              <DialogDescription>
                {editingPackage
                  ? 'ปรับแต่งรายละเอียดแพ็กเกจที่มีอยู่'
                  : 'สร้างแพ็กเกจโฆษณาสำหรับลูกค้า'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 grid gap-2">
                  <label className="text-sm font-medium">ชื่อแพ็กเกจ</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="เช่น Bronze Package"
                  />
                </div>

                <div className="col-span-2 grid gap-2">
                  <label className="text-sm font-medium">คำอธิบาย</label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="รายละเอียดสั้นๆ"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">ระดับ (Tier)</label>
                  <select
                    value={formData.tier}
                    onChange={(e) => setFormData({ ...formData, tier: e.target.value as AdPackage['tier'] })}
                    className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="bronze">Bronze</option>
                    <option value="silver">Silver</option>
                    <option value="gold">Gold</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">ราคาพื้นฐาน (บาท/วัน)</label>
                  <Input
                    type="number"
                    value={formData.base_price}
                    onChange={(e) => setFormData({ ...formData, base_price: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">ระยะเวลาขั้นต่ำ (วัน)</label>
                  <Input
                    type="number"
                    value={formData.min_duration_days}
                    onChange={(e) => setFormData({ ...formData, min_duration_days: parseInt(e.target.value) || 7 })}
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium">ระยะเวลาสูงสุด (วัน)</label>
                  <Input
                    type="number"
                    value={formData.max_duration_days}
                    onChange={(e) => setFormData({ ...formData, max_duration_days: parseInt(e.target.value) || 30 })}
                  />
                </div>

                <div className="col-span-2 grid gap-2">
                  <label className="text-sm font-medium">ฟีเจอร์ที่รวม</label>
                  <div className="flex flex-wrap gap-2 p-3 border rounded-xl bg-muted/10">
                    {availableFeatures.map((f) => (
                      <label
                        key={f.id}
                        className={`flex items-center gap-1.5 text-sm cursor-pointer border px-2.5 py-1.5 rounded-lg transition-colors ${
                          formData.features.includes(f.id)
                            ? 'bg-[var(--color-yru-pink)]/10 border-[var(--color-yru-pink)]/30 text-[var(--color-yru-pink)]'
                            : 'bg-background hover:bg-muted/50 border-border'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.features.includes(f.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, features: [...formData.features, f.id] });
                            } else {
                              setFormData({ ...formData, features: formData.features.filter((x) => x !== f.id) });
                            }
                          }}
                          className="hidden"
                        />
                        {formData.features.includes(f.id) ? <Check className="h-3 w-3" /> : null}
                        {f.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="col-span-2 grid gap-2">
                  <label className="text-sm font-medium">การกำหนดเป้าหมายที่รวม</label>
                  <div className="flex flex-wrap gap-2 p-3 border rounded-xl bg-muted/10">
                    {availableTargeting.map((t) => (
                      <label
                        key={t.id}
                        className={`flex items-center gap-1.5 text-sm cursor-pointer border px-2.5 py-1.5 rounded-lg transition-colors ${
                          formData.targeting_included.includes(t.id)
                            ? 'bg-green-500/10 border-green-500/30 text-green-600'
                            : 'bg-background hover:bg-muted/50 border-border'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.targeting_included.includes(t.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, targeting_included: [...formData.targeting_included, t.id] });
                            } else {
                              setFormData({ ...formData, targeting_included: formData.targeting_included.filter((x) => x !== t.id) });
                            }
                          }}
                          className="hidden"
                        />
                        {formData.targeting_included.includes(t.id) ? <Check className="h-3 w-3" /> : null}
                        {t.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="col-span-2 flex items-center gap-4 pt-4 border-t">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_featured}
                      onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium">แพ็กเกจแนะนำ</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium">เปิดใช้งาน</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={handleCloseDialog} className="rounded-xl">
                  ยกเลิก
                </Button>
                <Button
                  onClick={() => (editingPackage ? updateMutation.mutate() : createMutation.mutate())}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="rounded-xl bg-[var(--color-yru-pink)] hover:bg-[var(--color-yru-pink-dark)] text-white"
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  {editingPackage ? 'บันทึกการเปลี่ยนแปลง' : 'สร้างแพ็กเกจ'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Package Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {packages.map((pkg) => {
          const config = tierConfig[pkg.tier];
          const Icon = config.icon;

          return (
            <Card
              key={pkg.id}
              className={`card-shadow border-border/40 overflow-hidden ${
                pkg.is_featured ? 'ring-2 ring-[var(--color-yru-pink)]/50' : ''
              }`}
            >
              <div
                className="h-2"
                style={{ backgroundColor: pkg.color || config.color }}
              />
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${pkg.color || config.color}20` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: pkg.color || config.color }} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{pkg.name}</CardTitle>
                      <Badge
                        variant="outline"
                        className="mt-1 text-xs"
                        style={{ borderColor: pkg.color || config.color, color: pkg.color || config.color }}
                      >
                        {config.label}
                      </Badge>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 rounded-xl">
                      <DropdownMenuItem onClick={() => handleEdit(pkg)} className="gap-2 cursor-pointer">
                        <Pencil className="h-4 w-4" />
                        แก้ไข
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          if (confirm('ยืนยันการลบแพ็กเกจนี้?')) {
                            deleteMutation.mutate(pkg.id);
                          }
                        }}
                        className="gap-2 cursor-pointer text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                        ลบ
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {pkg.description && (
                  <CardDescription className="mt-2">{pkg.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-muted/30 rounded-xl">
                  <p className="text-3xl font-bold" style={{ color: pkg.color || config.color }}>
                    {formatPrice(pkg.base_price)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">ต่อวัน</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {pkg.min_duration_days} - {pkg.max_duration_days} วัน
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">ฟีเจอร์</p>
                  <div className="space-y-1">
                    {(pkg.features || []).map((feature) => {
                      const featureConfig = availableFeatures.find((f) => f.id === feature);
                      return (
                        <div key={feature} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500 shrink-0" />
                          <span>{featureConfig?.label || feature}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <p className="text-sm font-medium text-muted-foreground">การกำหนดเป้าหมาย</p>
                  <div className="flex flex-wrap gap-1">
                    {(pkg.targeting_included || []).map((target) => {
                      const targetConfig = availableTargeting.find((t) => t.id === target);
                      return (
                        <Badge key={target} variant="secondary" className="text-xs">
                          {targetConfig?.label || target}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4">
                  {pkg.is_active ? (
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20">เปิดใช้งาน</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">ปิดใช้งาน</Badge>
                  )}
                  {pkg.is_featured && (
                    <Badge className="bg-[var(--color-yru-pink)]/10 text-[var(--color-yru-pink)]">แนะนำ</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}