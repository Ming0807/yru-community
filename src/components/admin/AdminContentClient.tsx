'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Trash2, ExternalLink, ChevronDown, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { timeAgo } from '@/lib/utils';

interface ContentPost {
  id: string;
  title: string;
  content_text: string | null;
  is_anonymous: boolean;
  created_at: string;
  author: { display_name: string } | null;
  category: { name: string; slug: string } | null;
}

interface Props {
  initialPosts: ContentPost[];
  totalCount: number;
}

export default function AdminContentClient({ initialPosts, totalCount }: Props) {
  const [posts, setPosts] = useState<ContentPost[]>(initialPosts);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const supabase = createClient();

  const loadMore = async () => {
    setLoadingMore(true);
    const { data, error } = await supabase
      .from('posts')
      .select('id, title, content_text, is_anonymous, created_at, author:profiles!author_id(display_name), category:categories(name, slug)')
      .order('created_at', { ascending: false })
      .range(posts.length, posts.length + 99);

    if (!error && data) {
      setPosts(prev => [...prev, ...(data as unknown as ContentPost[])]);
    } else {
      toast.error('ไม่สามารถโหลดข้อมูลเพิ่มเติมได้');
    }
    setLoadingMore(false);
  };

  const deletePost = async (postId: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบกระทู้นี้ถาวร?')) return;

    try {
      const res = await fetch(`/api/admin/posts?id=${postId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed');
      }

      setPosts((prev) => prev.filter((p) => p.id !== postId));
      toast.success('ลบกระทู้สำเร็จ');
    } catch {
      toast.error('เกิดข้อผิดพลาดในการลบกระทู้');
    }
  };

  const filteredPosts = posts.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.content_text || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-(--color-yru-pink)" />
            จัดการเนื้อหา (กระทู้)
          </h1>
          <p className="text-muted-foreground">
            ตรวจสอบและลบเนื้อหาที่ไม่เหมาะสม ({totalCount.toLocaleString()} กระทู้)
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหาชื่อกระทู้ หรือ เนื้อหา..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 rounded-xl"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-background overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b border-border/60">
              <tr>
                <th className="px-6 py-4 font-medium">กระทู้</th>
                <th className="px-6 py-4 font-medium">ผู้ตั้งกระทู้</th>
                <th className="px-6 py-4 font-medium">หมวดหมู่</th>
                <th className="px-6 py-4 font-medium">วันที่สร้าง</th>
                <th className="px-6 py-4 font-medium text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredPosts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    ไม่พบข้อมูลกระทู้
                  </td>
                </tr>
              ) : (
                filteredPosts.map((post) => (
                  <tr key={post.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 max-w-[300px]">
                      <div className="font-medium text-foreground truncate">{post.title}</div>
                      <div className="text-xs text-muted-foreground truncate mt-1">
                        {post.content_text || ''}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {post.is_anonymous ? (
                        <span className="text-muted-foreground italic text-xs">ผู้ใช้ไม่ระบุตัวตน</span>
                      ) : (
                        <span className="text-sm">{post.author?.display_name || 'ไม่ทราบชื่อ'}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {post.category?.name || 'ไม่ระบุ'}
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {timeAgo(post.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/post/${post.id}`} target="_blank">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                          onClick={() => deletePost(post.id)}
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

        {posts.length < totalCount && (
          <div className="p-4 border-t border-border/60 flex justify-center">
            <Button
              variant="outline"
              onClick={loadMore}
              disabled={loadingMore}
              className="rounded-xl gap-2"
            >
              <ChevronDown className="h-4 w-4" />
              {loadingMore ? 'กำลังโหลด...' : `โหลดเพิ่ม (${posts.length}/${totalCount})`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
