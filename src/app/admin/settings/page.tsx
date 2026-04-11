'use client';

import { useState } from 'react';
import { Settings, Globe, Shield, Palette, Bell, Database, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

export default function AdminSettingsPage() {
  const [siteName, setSiteName] = useState('YRU Community');
  const [siteDescription, setSiteDescription] = useState('เว็บบอร์ดสำหรับนักศึกษามหาวิทยาลัยราชภัฏยะลา');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [emailVerification, setEmailVerification] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

  const handleSave = () => {
    toast.success('บันทึกการตั้งค่าสำเร็จ');
  };

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
        <TabsList className="grid w-full grid-cols-5 gap-1 p-1 h-auto bg-muted/50 rounded-xl">
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
          <TabsTrigger value="appearance" className="rounded-lg gap-2 py-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">หน้าตา</span>
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
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="siteDesc">คำอธิบาย</Label>
                <Input
                  id="siteDesc"
                  value={siteDescription}
                  onChange={(e) => setSiteDescription(e.target.value)}
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
                <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">เปิดให้สมัครสมาชิก</p>
                  <p className="text-sm text-muted-foreground">อนุญาตให้ผู้ใช้ใหม่สมัครสมาชิก</p>
                </div>
                <Switch checked={registrationOpen} onCheckedChange={setRegistrationOpen} />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} className="rounded-xl gap-2">
              <Save className="h-4 w-4" />
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
                <Switch checked={emailVerification} onCheckedChange={setEmailVerification} />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} className="rounded-xl gap-2">
              <Save className="h-4 w-4" />
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
                <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} className="rounded-xl gap-2">
              <Save className="h-4 w-4" />
              บันทึกการตั้งค่า
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          <div className="rounded-2xl border border-border/40 bg-yellow-50 dark:bg-yellow-900/10 p-4">
            <div className="flex items-start gap-3">
              <Palette className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">การตั้งค่าหน้าตา</p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  การปรับแต่งหน้าตาเว็บไซต์ยังไม่พร้อมใช้งาน กำลังอยู่ระหว่างการพัฒนา
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <div className="rounded-2xl border border-border/40 bg-yellow-50 dark:bg-yellow-900/10 p-4">
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