'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
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
import { Search, Plus, MoreHorizontal, Image as ImageIcon, ExternalLink, Calendar, Megaphone, Trash2, Edit2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Ad } from '@/types';
import Image from 'next/image';

export default function AdminAdsPage() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    campaign_name: '',
    image_url: '',
    target_url: '',
    position: 'feed' as 'feed' | 'sidebar',
    revenue: 0,
    is_active: true,
    target_tags: [] as string[],
    target_categories: [] as number[],
  });

  const supabase = createClient();

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('ไม่สามารถโหลดข้อมูลโฆษณาได้');
    } else {
      setAds(data || []);
    }
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      
      const file = e.target.files[0];
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      
      if (!validTypes.includes(file.type)) {
        toast.error('รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WEBP, GIF)');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error('ขนาดรูปภาพต้องไม่เกิน 5MB');
        return;
      }

      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `banners/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('ads')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('ads')
        .getPublicUrl(filePath);

      setFormData({ ...formData, image_url: publicUrl });
      toast.success('อัปโหลดรููปภาพสำเร็จ');
    } catch (error) {
      console.error(error);
      toast.error('อัปโหลดไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setUploading(false);
    }
  };

  const saveAd = async () => {
    if (!formData.campaign_name || !formData.image_url || !formData.target_url) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    try {
      if (editingId) {
        // Edit 
        const { error } = await supabase
          .from('ads')
          .update(formData)
          .eq('id', editingId);
        
        if (error) throw error;
        toast.success('อัปเดตโฆษณาสำเร็จ');
      } else {
        // Create
        const { error } = await supabase
          .from('ads')
          .insert([formData]);
        
        if (error) throw error;
        toast.success('เพิ่มโฆษณาสำเร็จ');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchAds();
    } catch (error: any) {
      console.error("Save Ad Error Details:", {
        message: error.message,
        stack: error.stack,
        fullError: error
      });
      toast.error(`บันทึกไม่สำเร็จ: ${error?.message || JSON.stringify(error)}`);  
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      campaign_name: '',
      image_url: '',
      target_url: '',
      position: 'feed',
      revenue: 0,
      is_active: true,
      target_tags: [],
      target_categories: [],
    });
  };

  const editAd = (ad: Ad) => {
    setEditingId(ad.id);
    setFormData({
      campaign_name: ad.campaign_name,
      image_url: ad.image_url,
      target_url: ad.target_url,
      position: ad.position,
      revenue: ad.revenue,
      is_active: ad.is_active,
      target_tags: ad.target_tags || [],
      target_categories: ad.target_categories || [],
    });
    setIsDialogOpen(true);
  };

  const deleteAd = async (id: string) => {
    if (!confirm('ยืนยันการลบโฆษณานี้?')) return;
    try {
      const { error } = await supabase.from('ads').delete().eq('id', id);
      if (error) throw error;
      setAds(ads.filter(a => a.id !== id));
      toast.success('ลบโฆษณาเรียบร้อย');
    } catch (error) {
      toast.error('ลบไม่สำเร็จ');
    }
  };

  const toggleAdStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('ads')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      setAds(ads.map(a => a.id === id ? { ...a, is_active: !currentStatus } : a));
      toast.success(`เปลี่ยนสถานะโฆษณาเป็น ${!currentStatus ? 'เปิดใช้งาน' : 'ปิดใช้งาน'} แล้ว`);
    } catch (error) {
      toast.error('อัปเดตสถานะไม่สำเร็จ');
    }
  };

  const filteredAds = ads.filter(
    (a) => a.campaign_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ระบบจัดการโฆษณา</h1>
          <p className="text-muted-foreground">
            จัดการแบนเนอร์และพื้นที่สปอนเซอร์ภายในชุมชน YRU
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาชื่อแคมเปญ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-xl"
            />
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="rounded-xl whitespace-nowrap gap-2 bg-(--color-yru-pink) hover:bg-(--color-yru-pink-dark) focus:ring-(--color-yru-pink)">
                <Plus className="w-4 h-4" /> สร้างโฆษณาใหม่
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[750px]">
              <DialogHeader>
                <DialogTitle>{editingId ? 'แก้ไขโฆษณา' : 'สร้างโฆษณาใหม่'}</DialogTitle>
              </DialogHeader>
              <div className="grid md:grid-cols-2 gap-6 py-4">
                {/* Left Column */}
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">ชื่อแคมเปญ / โฆษณา</label>
                    <Input 
                      value={formData.campaign_name} 
                      onChange={e => setFormData({...formData, campaign_name: e.target.value})}
                      placeholder="เช่น โปรโมชั่นร้านคาเฟ่..."
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">รูปภาพแบนเนอร์</label>
                    <label className={`relative w-full h-40 rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground bg-muted/20 transition-all ${!uploading ? 'cursor-pointer hover:bg-muted/40 hover:border-yru-pink/50' : 'cursor-wait opacity-80'} overflow-hidden group`}>
                      {uploading ? (
                        <div className="flex flex-col items-center justify-center z-10 bg-background/80 absolute inset-0 backdrop-blur-sm">
                          <Loader2 className="w-8 h-8 mb-3 animate-spin text-(--color-yru-pink)" />
                          <span className="text-xs font-semibold text-(--color-yru-pink)">กำลังอัปโหลดรูปภาพ...</span>
                        </div>
                      ) : formData.image_url ? (
                        <>
                          <Image src={formData.image_url} alt="Preview" fill className="object-cover" sizes="(max-width: 500px) 100vw, 500px" />
                          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 backdrop-blur-[2px]">
                            <ImageIcon className="w-8 h-8 mb-2 text-white" />
                            <span className="text-xs text-white font-medium">คลิกเพื่อเปลี่ยนรูปภาพใหม่</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="p-3 bg-background rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform duration-300">
                            <ImageIcon className="w-6 h-6 text-muted-foreground group-hover:text-(--color-yru-pink) transition-colors" />
                          </div>
                          <span className="text-sm font-medium text-foreground">คลิกเพื่ออัปโหลดรูปภาพ</span>
                          <span className="text-xs text-muted-foreground mt-1 text-center px-4">ไฟล์ JPG, PNG, WEBP (ไม่เกิน 5MB)<br/>สัดส่วน 16:9 แนะนำ 1200x675px</span>
                        </>
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium">ลิงก์ปลายทาง (Target URL)</label>
                    <Input 
                      value={formData.target_url} 
                      onChange={e => setFormData({...formData, target_url: e.target.value})}
                      placeholder="https://..."
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">ตำแหน่งแสดงผล</label>
                      <select 
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.position}
                        onChange={e => setFormData({...formData, position: e.target.value as 'feed'|'sidebar'})}
                      >
                        <option value="feed">ในโพสต์ฟีด (Feed)</option>
                        <option value="sidebar">แถบด้านข้าง (Sidebar)</option>
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">รายได้ / มูลค่า (บาท)</label>
                      <Input 
                        type="number"
                        value={formData.revenue} 
                        onChange={e => setFormData({...formData, revenue: parseInt(e.target.value) || 0})}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium">หมวดหมู่เป้าหมาย (เว้นว่างเพื่อแสดงทุกหมวด)</label>
                    <div className="flex flex-wrap gap-2 p-3 border rounded-xl bg-muted/10">
                      {[
                        { id: 1, name: 'เรื่องทั่วไป' },
                        { id: 2, name: 'การเรียน' },
                        { id: 3, name: 'รีวิววิชา' },
                        { id: 4, name: 'ถาม-ตอบ' },
                        { id: 5, name: 'ซื้อขาย' }
                      ].map(cat => (
                        <label key={cat.id} className="flex items-center gap-1.5 text-sm cursor-pointer border px-2.5 py-1.5 rounded-lg hover:bg-muted/50 bg-background transition-colors shadow-sm">
                          <input
                            type="checkbox"
                            checked={formData.target_categories.includes(cat.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({ ...formData, target_categories: [...formData.target_categories, cat.id] });
                              } else {
                                setFormData({ ...formData, target_categories: formData.target_categories.filter(id => id !== cat.id) });
                              }
                            }}
                            className="w-4 h-4 text-yru-pink rounded focus:ring-yru-pink/50 cursor-pointer"
                          />
                          {cat.name}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-yru-pink-dark flex items-center gap-1">
                      แท็กเป้าหมาย (คั่นด้วยลูกน้ำ ",")
                    </label>
                    <Input 
                      value={formData.target_tags.join(', ')} 
                      onChange={e => {
                        const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                        setFormData({...formData, target_tags: tags});
                      }}
                      placeholder="เช่น หอพัก, ร้านอาหาร, สอบ"
                      className="border-yru-pink/30 focus-visible:ring-yru-pink/20"
                    />
                    <p className="text-xs text-muted-foreground -mt-1 leading-relaxed">
                      โฆษณาจะถูกแสดงเมื่อผู้ใช้กำลังดูกระทู้ที่มีแท็กตรงกัน
                    </p>
                  </div>

                  <div className="flex items-center gap-2 mt-4 p-3 border rounded-xl bg-yru-green/5 border-yru-green/20">
                    <input 
                      type="checkbox" 
                      id="is_active" 
                      checked={formData.is_active}
                      onChange={e => setFormData({...formData, is_active: e.target.checked})}
                      className="w-4 h-4 rounded border-gray-300 text-yru-green focus:ring-yru-green cursor-pointer"
                    />
                    <label htmlFor="is_active" className="text-sm font-semibold cursor-pointer text-foreground">
                      เปิดใช้งานโฆษณานี้ทันที
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border/40">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl px-6">ยกเลิก</Button>
                <Button onClick={saveAd} disabled={uploading} className="rounded-xl px-6 bg-linear-to-r from-yru-pink to-yru-pink-dark hover:opacity-90 transition-opacity text-white shadow-md">
                  {uploading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> กำลังบันทึก...</>
                  ) : editingId ? 'บันทึกการเปลี่ยนแปลง' : 'สร้างโฆษณา'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-background overflow-hidden card-shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b border-border/60">
              <tr>
                <th className="px-6 py-4 font-medium w-64">ข้อมูลแคมเปญ</th>
                <th className="px-4 py-4 font-medium">เป้าหมาย & พื้นที่</th>
                <th className="px-4 py-4 font-medium text-center">สถิติ (วิว / คลิก)</th>
                <th className="px-4 py-4 font-medium text-center">สถานะ</th>
                <th className="px-4 py-4 font-medium text-right">รายได้</th>
                <th className="px-6 py-4 font-medium text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    กำลังโหลดข้อมูลโฆษณา...
                  </td>
                </tr>
              ) : filteredAds.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    ไม่พบข้อมูลโฆษณา
                  </td>
                </tr>
              ) : (
                filteredAds.map((ad) => (
                  <tr key={ad.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-16 h-12 rounded bg-muted overflow-hidden shrink-0 border border-border/60">
                          <Image src={ad.image_url} alt={ad.campaign_name} fill className="object-cover" sizes="64px" />
                        </div>
                        <div className="max-w-[180px] truncate">
                          <p className="font-semibold text-foreground truncate" title={ad.campaign_name}>{ad.campaign_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{new Date(ad.created_at).toLocaleDateString('th-TH')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1.5 items-start">
                        <Badge variant="secondary" className="font-medium">
                          <Megaphone className="w-3 h-3 mr-1" />
                          {ad.position === 'feed' ? 'ในหน้าฟีด' : 'แถบด้านข้าง'}
                        </Badge>
                        <a href={ad.target_url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" /> ลิงก์ปลายทาง
                        </a>
                        {((ad.target_categories?.length || 0) > 0 || (ad.target_tags?.length || 0) > 0) && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(ad.target_categories?.length || 0) > 0 && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">หมวดหมู่เป้าหมาย: {ad.target_categories!.length}</span>}
                            {(ad.target_tags?.length || 0) > 0 && <span className="text-[10px] bg-yru-pink/10 text-yru-pink-dark px-1.5 py-0.5 rounded">แท็กเป้าหมาย: {ad.target_tags!.length}</span>}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <span className="text-muted-foreground">{ad.impressions.toLocaleString()}</span>
                          <span className="text-muted-foreground/40">/</span>
                          <span className="text-primary">{ad.clicks.toLocaleString()}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">CTR {(ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0).toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Badge 
                        variant="outline" 
                        className={`cursor-pointer ${ad.is_active ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}
                        onClick={() => toggleAdStatus(ad.id, ad.is_active)}
                        title="คลิกเพื่อสลับสถานะ"
                      >
                        {ad.is_active ? 'เปิดใช้งาน' : 'ปิด'}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-right font-medium text-green-600">
                      ฿{ad.revenue.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md hover:bg-background shadow-sm border border-border/40">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36 rounded-xl">
                          <DropdownMenuItem onClick={() => editAd(ad)} className="cursor-pointer gap-2">
                            <Edit2 className="h-4 w-4" /> แก้ไขโฆษณา
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => deleteAd(ad.id)} className="cursor-pointer gap-2 text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30">
                            <Trash2 className="h-4 w-4" /> ลบโฆษณา
                          </DropdownMenuItem>
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
