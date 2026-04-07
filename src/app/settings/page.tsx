'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { FACULTIES, UPLOAD_LIMITS } from '@/lib/constants';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Camera, Loader2, Save, User, Settings, Shield, Bell, BellOff, Trash2, AlertTriangle, FileText } from 'lucide-react';
import { useUser } from '@/components/UserProvider';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import DeleteAccountDialog from '@/components/settings/DeleteAccountDialog';
import ExportData from '@/components/settings/ExportData';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user: currentUser, refresh } = useUser();
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isSupported, isSubscribed, loading: pushLoading, subscribe, unsubscribe } = usePushNotifications();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [faculty, setFaculty] = useState('');
  const [major, setMajor] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      router.push('/login');
      return;
    }

    setDisplayName(currentUser.display_name || '');
    setBio(currentUser.bio || '');
    setFaculty(currentUser.faculty || '');
    setMajor(currentUser.major || '');
    setAvatarUrl(currentUser.avatar_url || null);
    setLoading(false);
  }, [currentUser, router]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!(UPLOAD_LIMITS.ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      toast.error('รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WEBP, GIF)');
      return;
    }

    if (file.size > UPLOAD_LIMITS.MAX_IMAGE_SIZE) {
      toast.error('ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 5MB)');
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'image');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setAvatarUrl(data.url);
      setHasChanges(true);
      toast.success('อัปโหลดรูปโปรไฟล์สำเร็จ');
    } catch {
      toast.error('ไม่สามารถอัปโหลดรูปภาพได้ กรุณาลองใหม่');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!currentUser) return;
    if (!displayName.trim()) {
      toast.error('กรุณาใส่ชื่อที่แสดง');
      return;
    }
    if (!faculty) {
      toast.error('กรุณาเลือกคณะ');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          bio: bio.trim() || null,
          faculty,
          major: major.trim() || null,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentUser.id);

      if (error) throw error;

      await refresh();
      setHasChanges(false);
      toast.success('บันทึกการตั้งค่าสำเร็จ!');
    } catch {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-2xl px-4 py-6 pb-24">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="h-5 w-5 text-[var(--color-yru-pink)]" />
          <h1 className="text-xl font-bold">ตั้งค่าโปรไฟล์</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Avatar Section */}
          <section className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              รูปโปรไฟล์
            </h2>
            <div className="flex items-center gap-6">
              <div className="relative group">
                <Avatar className="h-24 w-24 ring-4 ring-background shadow-lg">
                  <AvatarImage src={avatarUrl || undefined} className="object-cover" />
                  <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-[var(--color-yru-pink-light)] to-[var(--color-yru-green-light)]">
                    {displayName.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Camera className="h-6 w-6" />
                  )}
                </button>
              </div>
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarUpload}
                  accept="image/jpeg, image/png, image/webp, image/gif"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="rounded-xl"
                >
                  {uploadingAvatar ? 'กำลังอัปโหลด...' : 'เปลี่ยนรูปโปรไฟล์'}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  JPG, PNG, WEBP หรือ GIF (สูงสุด 5MB)
                </p>
              </div>
            </div>
          </section>

          {/* Profile Info */}
          <section className="rounded-2xl border bg-card p-6 shadow-sm space-y-5">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              ข้อมูลโปรไฟล์
            </h2>

            {/* Display Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">ชื่อที่แสดง <span className="text-red-500">*</span></label>
              <Input
                value={displayName}
                onChange={(e) => { setDisplayName(e.target.value); setHasChanges(true); }}
                className="rounded-xl h-11"
                maxLength={50}
                placeholder="เช่น น้องใหม่ มรย."
              />
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                เกี่ยวกับฉัน
                <span className="text-muted-foreground font-normal ml-1">(ไม่บังคับ)</span>
              </label>
              <Textarea
                value={bio}
                onChange={(e) => { setBio(e.target.value); setHasChanges(true); }}
                className="resize-none rounded-xl"
                rows={3}
                maxLength={300}
                placeholder="บอกเล่าเกี่ยวกับตัวคุณ..."
              />
              <p className="text-xs text-muted-foreground text-right">
                {bio.length}/300 ตัวอักษร
              </p>
            </div>

            <Separator />

            {/* Faculty */}
            <div className="space-y-2">
              <label className="text-sm font-medium">คณะ <span className="text-red-500">*</span></label>
              <div className="space-y-2">
                {FACULTIES.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => { setFaculty(f); setHasChanges(true); }}
                    className={`w-full text-left rounded-xl px-4 py-2.5 text-sm transition-all border ${
                      faculty === f
                        ? 'border-[var(--color-yru-pink)] bg-[var(--color-yru-pink-light)] text-foreground font-medium'
                        : 'border-border/60 hover:border-border hover:bg-muted/50'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Major */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                สาขา
                <span className="text-muted-foreground font-normal ml-1">(ไม่บังคับ)</span>
              </label>
              <Input
                value={major}
                onChange={(e) => { setMajor(e.target.value); setHasChanges(true); }}
                className="rounded-xl h-11"
                maxLength={100}
                placeholder="เช่น วิทยาการคอมพิวเตอร์"
              />
            </div>
          </section>

          {/* Push Notifications */}
          {isSupported && (
            <section className="rounded-2xl border bg-card p-6 shadow-sm">
              <h2 className="text-base font-semibold flex items-center gap-2 mb-4">
                <Bell className="h-4 w-4 text-muted-foreground" />
                การแจ้งเตือนบนเบราว์เซอร์
              </h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">เปิดการแจ้งเตือน Push</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    รับการแจ้งเตือนเมื่อมีกิจกรรมใหม่ แม้จะไม่ได้เปิดเว็บอยู่
                  </p>
                </div>
                <Button
                  variant={isSubscribed ? 'outline' : 'default'}
                  size="sm"
                  onClick={isSubscribed ? unsubscribe : subscribe}
                  disabled={pushLoading}
                  className="gap-2 rounded-xl"
                >
                  {pushLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isSubscribed ? (
                    <Bell className="h-4 w-4 text-green-500" />
                  ) : (
                    <BellOff className="h-4 w-4" />
                  )}
                  {isSubscribed ? 'เปิดอยู่' : 'เปิดใช้งาน'}
                </Button>
              </div>
            </section>
          )}

          {/* Privacy & Data */}
          <section className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="text-base font-semibold flex items-center gap-2 mb-4">
              <FileText className="h-4 w-4 text-muted-foreground" />
              ข้อมูลส่วนบุคคล (PDPA)
            </h2>
            {currentUser && <ExportData user={currentUser} />}
          </section>

          {/* Danger Zone */}
          <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 shadow-sm">
            <h2 className="text-base font-semibold flex items-center gap-2 mb-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              โซนอันตราย
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              การกระทำในส่วนนี้ไม่สามารถยกเลิกได้ กรุณาระมัดระวัง
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">ลบบัญชีถาวร</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ลบข้อมูลทั้งหมดของคุณออกจากระบบอย่างถาวร
                </p>
              </div>
              <DeleteAccountDialog userId={currentUser?.id || ''} />
            </div>
          </section>

          {/* Save Button */}
          <div className="flex items-center justify-between sticky bottom-20 sm:bottom-4">
            <p className="text-sm text-muted-foreground">
              {hasChanges ? 'มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก' : 'ไม่มีการเปลี่ยนแปลง'}
            </p>
            <Button
              type="submit"
              disabled={submitting || !hasChanges}
              className="rounded-xl gap-2 bg-gradient-to-r from-[var(--color-yru-pink)] to-[var(--color-yru-pink-dark)] text-white"
            >
              <Save className="h-4 w-4" />
              {submitting ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
            </Button>
          </div>
        </form>
      </main>

      <MobileNav />
    </div>
  );
}
