'use client';

import { useState, useEffect, FormEvent, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { FACULTIES, UPLOAD_LIMITS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfileSetupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [displayName, setDisplayName] = useState('');
  const [faculty, setFaculty] = useState('');
  const [major, setMajor] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        setDisplayName(profile.display_name || '');
        setFaculty(profile.faculty || '');
        setMajor(profile.major || '');
        setAvatarUrl(profile.avatar_url || null);
      }
      setLoading(false);
    }

    loadProfile();
  }, [router, supabase]);

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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email!,
          display_name: displayName.trim(),
          faculty,
          major: major.trim() || null,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success('บันทึกโปรไฟล์สำเร็จ!');
      router.push('/');
    } catch {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-[var(--color-yru-pink-light)] to-[var(--color-yru-green-light)] px-4">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="rounded-2xl border border-border/60 bg-background/90 backdrop-blur-lg p-8 shadow-xl">
          <div className="text-center mb-8">
            <span className="text-4xl">👋</span>
            <h1 className="text-2xl font-bold mt-3">ยินดีต้อนรับ!</h1>
            <p className="text-sm text-muted-foreground mt-1">
              ตั้งค่าโปรไฟล์ของคุณ
            </p>
          </div>

          <div className="flex flex-col items-center mb-8">
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
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarUpload}
              accept="image/jpeg, image/png, image/webp, image/gif"
              className="hidden"
            />
            <p className="text-xs text-muted-foreground mt-3">
              คลิกที่รูปเพื่อเปลี่ยนรูปโปรไฟล์
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Display Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">ชื่อที่แสดง *</label>
              <Input
                placeholder="เช่น น้องใหม่ มรย."
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="rounded-xl h-11"
                maxLength={50}
              />
            </div>

            {/* Faculty */}
            <div className="space-y-2">
              <label className="text-sm font-medium">คณะ *</label>
              <div className="space-y-2">
                {FACULTIES.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFaculty(f)}
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
                สาขา{' '}
                <span className="text-muted-foreground font-normal">
                  (ไม่บังคับ)
                </span>
              </label>
              <Input
                placeholder="เช่น วิทยาการคอมพิวเตอร์"
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                className="rounded-xl h-11"
                maxLength={100}
              />
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-xl text-base bg-gradient-to-r from-[var(--color-yru-pink)] to-[var(--color-yru-pink-dark)] text-white shadow-lg hover:opacity-90"
            >
              {submitting ? 'กำลังบันทึก...' : 'บันทึกโปรไฟล์'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
