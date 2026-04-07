'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, X } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PostEditor from '@/components/post/PostEditor';
import { createClient } from '@/lib/supabase/client';
import { CATEGORIES } from '@/lib/constants';
import { toast } from 'sonner';

interface EditPostFormProps {
  post: {
    id: string;
    title: string;
    content: Record<string, unknown>;
    content_text: string;
    category: { slug: string };
    tags: string[];
    is_anonymous: boolean;
  };
}

export default function EditPostForm({ post }: EditPostFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState(post.title);
  const [categorySlug, setCategorySlug] = useState(post.category?.slug || 'general');
  const [tags, setTags] = useState(post.tags?.join(', ') || '');
  const [isAnonymous, setIsAnonymous] = useState(post.is_anonymous);
  const [contentJson, setContentJson] = useState<Record<string, unknown>>(post.content);
  const [contentText, setContentText] = useState(post.content_text);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !contentText.trim()) {
      toast.error('กรุณาใส่หัวข้อและเนื้อหา');
      return;
    }

    setSubmitting(true);

    try {
      const { data: cat } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', categorySlug)
        .single();

      if (!cat) throw new Error('Invalid category');

      const tagArray = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const { error } = await supabase
        .from('posts')
        .update({
          category_id: cat.id,
          title: title.trim(),
          content: contentJson,
          content_text: contentText,
          is_anonymous: isAnonymous,
          tags: tagArray,
          updated_at: new Date().toISOString(),
        })
        .eq('id', post.id);

      if (error) throw error;

      toast.success('แก้ไขกระทู้สำเร็จ!');
      router.push(`/post/${post.id}`);
      router.refresh();
    } catch {
      toast.error('เกิดข้อผิดพลาดในการแก้ไขกระทู้');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Link href={`/post/${post.id}`}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="font-semibold">แก้ไขกระทู้</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
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

          <div className="space-y-2">
            <label className="text-sm font-medium">หัวข้อกระทู้</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-xl h-12 text-base"
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground text-right">{title.length}/200</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">เนื้อหา</label>
            {/* Pass initial content string/json if PostEditor supports it, else we rely on simple HTML mapping but TipTap supports JSON */}
            <PostEditor
              content={post.content as any}
              onChange={(json, text) => {
                setContentJson(json);
                setContentText(text);
              }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">แท็ก (ไม่บังคับ)</label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="rounded-xl"
            />
          </div>

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
                isAnonymous ? 'bg-[var(--color-yru-pink)]' : 'bg-muted-foreground/30'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out mt-0.5 ${
                  isAnonymous ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="sticky bottom-4 z-40">
            <div className="rounded-2xl border border-border/60 bg-background/95 backdrop-blur-xl shadow-lg p-4">
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/post/${post.id}`)}
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
                  {submitting ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
