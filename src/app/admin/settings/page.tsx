'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Globe, Shield, Bell, Palette, Database, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface SiteSettings {
  site_name: string;
  site_description: string;
  maintenance_mode: boolean;
  registration_open: boolean;
  email_verification_required: boolean;
  push_notifications_enabled: boolean;
}

const defaultSettings: SiteSettings = {
  site_name: 'YRU Community',
  site_description: 'ศูนย์กลางชุมชนนักศึกษา มรย.',
  maintenance_mode: false,
  registration_open: true,
  email_verification_required: true,
  push_notifications_enabled: true,
};

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);

  const { data: settings = defaultSettings, isLoading } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: async () => {
      const res = await fetch('/api/admin/settings');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    placeholderData: defaultSettings,
  });

  const [localSettings, setLocalSettings] = useState<SiteSettings>(settings);

  // Update local settings when data loads
  useMemo(() => {
    if (settings) setLocalSettings(settings);
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localSettings),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
      toast.success('บันทึกการตั้งค่าสำเร็จ');
    },
    onError: () => {
      toast.error('ไม่สามารถบันทึกได้');
    },
  });

  const handleSave = () => {
    updateMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-[var(--color-yru-pink)]/10">
          <Settings className="h-5 w-5 text-[var(--color-yru-pink)]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">การตั้งค่าระบบ</h1>
          <p className="text-sm text-muted-foreground">จัดการการตั้งค่าต่างๆ ของเว็บไซต์</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 gap-1 p-1 h-auto bg-muted/50 rounded-xl">
          <TabsTrigger value="general" className="rounded-lg gap-2 py-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">ทั่วไป</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-lg gap-2 py-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">ความปลอดภัย</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-lg gap-2 py-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">แจ้งเตือน</span>
          </TabsTrigger>
          <TabsTrigger value="database" className="rounded-lg gap-2 py-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">ฐานข้อมูล</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <div className="rounded-2xl border border-border/40 bg-card card-shadow p-6 space-y-4">
            <h2 className="font-semibold">ข้อมูลเว็บไซต์</h2>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="siteName">ชื่อเว็บไซต์</Label>
                <Input
                  id="siteName"
                  value={localSettings.site_name}
                  onChange={(e) => setLocalSettings({ ...localSettings, site_name: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="siteDesc">คำอธิบาย</Label>
                <Input
                  id="siteDesc"
                  value={localSettings.site_description}
                  onChange={(e) => setLocalSettings({ ...localSettings, site_description: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/40 bg-card card-shadow p-6 space-y-4">
            <h2 className="font-semibold">สถานะระบบ</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">โหมดบำรุงรักษา</p>
                  <p className="text-sm text-muted-foreground">ปิดเว็บไซต์ชั่วคราวเพื่อปรับปรุงระบบ</p>
                </div>
                <Switch 
                  checked={localSettings.maintenance_mode} 
                  onCheckedChange={(v) => setLocalSettings({ ...localSettings, maintenance_mode: v })} 
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">เปิดให้สมัครสมาชิก</p>
                  <p className="text-sm text-muted-foreground">อนุญาตให้ผู้ใช้ใหม่สมัครสมาชิก</p>
                </div>
                <Switch 
                  checked={localSettings.registration_open} 
                  onCheckedChange={(v) => setLocalSettings({ ...localSettings, registration_open: v })} 
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={updateMutation.isPending} className="rounded-xl gap-2">
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              บันทึกการตั้งค่า
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <div className="rounded-2xl border border-border/40 bg-card card-shadow p-6 space-y-4">
            <h2 className="font-semibold">การยืนยันตัวตน</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">ยืนยันอีเมล</p>
                  <p className="text-sm text-muted-foreground">บังคับให้ผู้ใช้ยืนยันอีเมลก่อนใช้งาน</p>
                </div>
                <Switch 
                  checked={localSettings.email_verification_required} 
                  onCheckedChange={(v) => setLocalSettings({ ...localSettings, email_verification_required: v })} 
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={updateMutation.isPending} className="rounded-xl gap-2">
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              บันทึกการตั้งค่า
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <div className="rounded-2xl border border-border/40 bg-card card-shadow p-6 space-y-4">
            <h2 className="font-semibold">การแจ้งเตือน</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Push Notifications</p>
                  <p className="text-sm text-muted-foreground">ส่งแจ้งเตือนผ่าน Push Notification</p>
                </div>
                <Switch 
                  checked={localSettings.push_notifications_enabled} 
                  onCheckedChange={(v) => setLocalSettings({ ...localSettings, push_notifications_enabled: v })} 
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={updateMutation.isPending} className="rounded-xl gap-2">
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              บันทึกการตั้งค่า
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <div className="rounded-2xl border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/10 p-4">
            <div className="flex items-start gap-3">
              <Database className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">การจัดการฐานข้อมูล</p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  การจัดการฐานข้อมูลต้องดำเนินการผ่าน Supabase Dashboard โดยตรง
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}