'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { timeAgo } from '@/lib/utils';
import type { Post, Profile, Category } from '@/types';

type PostWithAuthor = Post & { author: Profile; category: Category };

export default function AdminContentPage() {
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const supabase = createClient();

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('posts')
      .select('*, author:profiles(*), category:categories(*)')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('ไม่สามารถโหลดข้อมูลกระทู้ได้');
    } else {
      setPosts(data as unknown as PostWithAuthor[]);
    }
    setLoading(false);
  };

  const deletePost = async (postId: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบกระทู้นี้ถาวร?')) return;

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
      
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">จัดการเนื้อหา (กระทู้)</h1>
          <p className="text-muted-foreground">
            ตรวจสอบและลบเนื้อหาที่ไม่เหมาะสม
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
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : filteredPosts.length === 0 ? (
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
                      {post.category?.name || post.category?.slug || 'ไม่ระบุ'}
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
      </div>
    </div>
  );
}
