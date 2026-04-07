'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  Send,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import PostEditor from '@/components/post/PostEditor';
import { createClient } from '@/lib/supabase/client';
import { CATEGORIES, UPLOAD_LIMITS } from '@/lib/constants';
import { formatFileSize } from '@/lib/utils';
import { toast } from 'sonner';
import type { Attachment } from '@/types';

export default function CreatePostPage() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState('');
  const [categorySlug, setCategorySlug] = useState('general');
  const [tags, setTags] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [contentJson, setContentJson] = useState<Record<string, unknown>>({});
  const [contentText, setContentText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);

    for (const file of Array.from(files)) {
      const isImage = UPLOAD_LIMITS.ALLOWED_IMAGE_TYPES.includes(file.type as typeof UPLOAD_LIMITS.ALLOWED_IMAGE_TYPES[number]);
      const isPdf = UPLOAD_LIMITS.ALLOWED_PDF_TYPES.includes(file.type as typeof UPLOAD_LIMITS.ALLOWED_PDF_TYPES[number]);

      if (!isImage && !isPdf) {
        toast.error(`ไฟล์ ${file.name} ไม่รองรับ (รับเฉพาะ รูปภาพ / PDF)`);
        continue;
      }

      const maxSize = isImage
        ? UPLOAD_LIMITS.MAX_IMAGE_SIZE
        : UPLOAD_LIMITS.MAX_PDF_SIZE;
      if (file.size > maxSize) {
        toast.error(
          `ไฟล์ ${file.name} ใหญ่เกิน (สูงสุด ${formatFileSize(maxSize)})`
        );
        continue;
      }

      try {
        if (isImage) {
          // Upload to Cloudinary via API route
          const formData = new FormData();
          formData.append('file', file);
          formData.append('type', 'image');

          const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
          const data = await res.json();

          if (!res.ok) throw new Error(data.error);

          setAttachments((prev) => [
            ...prev,
            {
              url: data.url,
              name: file.name,
              type: 'image',
              size: file.size,
            },
          ]);
        } else {
          // Upload PDF to Supabase Storage
          const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const fileName = `${Date.now()}-${cleanFileName}`;
          const { data, error } = await supabase.storage
            .from('documents')
            .upload(fileName, file);

          if (error) throw error;

          const {
            data: { publicUrl },
          } = supabase.storage.from('documents').getPublicUrl(data.path);

          setAttachments((prev) => [
            ...prev,
            {
              url: publicUrl,
              name: file.name,
              type: 'pdf',
              size: file.size,
            },
          ]);
        }

        toast.success(`อัปโหลด ${file.name} สำเร็จ`);
      } catch {
        toast.error(`อัปโหลด ${file.name} ล้มเหลว`);
      }
    }

    setUploading(false);
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('กรุณาใส่หัวข้อกระทู้');
      return;
    }
    if (!contentText.trim()) {
      toast.error('กรุณาเขียนเนื้อหา');
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error('กรุณาเข้าสู่ระบบ');
        router.push('/login');
        return;
      }

      // Get category id
      const { data: cat } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', categorySlug)
        .single();

      if (!cat) {
        toast.error('หมวดหมู่ไม่ถูกต้อง');
        return;
      }

      const tagArray = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const { data: post, error } = await supabase
        .from('posts')
        .insert({
          author_id: user.id,
          category_id: cat.id,
          title: title.trim(),
          content: contentJson,
          content_text: contentText,
          is_anonymous: isAnonymous,
          tags: tagArray,
          attachments: attachments,
        })
        .select('id')
        .single();

      if (error) throw error;

      toast.success('ตั้งกระทู้สำเร็จ!');
      router.push(`/post/${post.id}`);
    } catch {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="font-semibold">ตั้งกระทู้ใหม่</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category Select */}
          <div className="space-y-2">
            <label className="text-sm font-medium">หมวดหมู่</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => setCategorySlug(cat.slug)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    categorySlug === cat.slug
                      ? 'bg-gradient-to-r from-[var(--color-yru-pink)] to-[var(--color-yru-pink-dark)] text-white shadow-md'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium">หัวข้อกระทู้</label>
            <Input
              placeholder="เช่น รีวิววิชา xxx อาจารย์สอนดีมาก"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-xl h-12 text-base"
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground text-right">
              {title.length}/200
            </p>
          </div>

          {/* Content Editor */}
          <div className="space-y-2">
            <label className="text-sm font-medium">เนื้อหา</label>
            <PostEditor
              content=""
              onChange={(json, text) => {
                setContentJson(json);
                setContentText(text);
              }}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="text-sm font-medium">แท็ก (ไม่บังคับ)</label>
            <Input
              placeholder="คั่นด้วยเครื่องหมายจุลภาค เช่น ชีทสรุป, รีวิว, สอบปลายภาค"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="rounded-xl"
            />
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium">แนบไฟล์ (ไม่บังคับ)</label>
            <div className="rounded-xl border-2 border-dashed border-border/60 p-6 text-center hover:border-[var(--color-yru-pink)]/40 transition-colors">
              <input
                type="file"
                id="file-upload"
                multiple
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {uploading ? 'กำลังอัปโหลด...' : 'คลิกเพื่อเลือกไฟล์'}
                </span>
                <span className="text-xs text-muted-foreground/70">
                  รูปภาพ (สูงสุด 5MB) หรือ PDF (สูงสุด 10MB)
                </span>
              </label>
            </div>

            {/* Attachments list */}
            {attachments.length > 0 && (
              <div className="space-y-2 mt-3">
                {attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2"
                  >
                    {att.type === 'image' ? (
                      <ImageIcon className="h-4 w-4 text-[var(--color-yru-pink)]" />
                    ) : (
                      <FileText className="h-4 w-4 text-[var(--color-yru-green)]" />
                    )}
                    <span className="text-sm truncate flex-1">{att.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(att.size)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Anonymous Toggle */}
          <div className="flex items-center justify-between rounded-xl bg-muted/30 border border-border/60 px-4 py-3">
            <div>
              <p className="text-sm font-medium">👤 โพสต์แบบไม่ระบุตัวตน</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                ชื่อของคุณจะไม่แสดงในกระทู้
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isAnonymous}
              onClick={() => setIsAnonymous(!isAnonymous)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${
                isAnonymous
                  ? 'bg-[var(--color-yru-pink)]'
                  : 'bg-muted-foreground/30'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out ${
                  isAnonymous ? 'translate-x-5' : 'translate-x-0.5'
                } mt-0.5`}
              />
            </button>
          </div>

          {/* Submit & Cancel - Sticky */}
          <div className="sticky bottom-4 z-40">
            <div className="rounded-2xl border border-border/60 bg-background/95 backdrop-blur-xl shadow-lg p-4">
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/')}
                  className="flex-1 h-12 rounded-xl text-base gap-2"
                >
                  <X className="h-4 w-4" /> ยกเลิก
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !title.trim() || !contentText.trim()}
                  className="flex-1 h-12 rounded-xl text-base bg-gradient-to-r from-[var(--color-yru-pink)] to-[var(--color-yru-pink-dark)] text-white shadow-lg hover:opacity-90 transition-all gap-2"
                >
                  <Send className="h-4 w-4" />
                  {submitting ? 'กำลังโพสต์...' : 'โพสต์กระทู้'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
