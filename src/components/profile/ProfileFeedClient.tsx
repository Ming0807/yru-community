'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import PostCard from '@/components/post/PostCard';
import PostSkeleton from '@/components/post/PostSkeleton';
import { Inbox, BookOpen, Bookmark } from 'lucide-react';
import type { Post } from '@/types';

interface ProfileFeedProps {
  userId: string;
  feedType: 'my_posts' | 'bookmarks' | 'user_posts';
  initialPosts: Post[];
}

export default function ProfileFeedClient({ userId, feedType, initialPosts }: ProfileFeedProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialPosts.length >= 10);
  const [loading, setLoading] = useState(false);
  
  const supabase = createClient();

  const loadMorePosts = async () => {
    setLoading(true);
    const from = page * 10;
    const to = from + 9;
    
    let newData: any[] = [];

    if (feedType === 'my_posts' || feedType === 'user_posts') {
      let query = supabase
        .from('posts')
        .select('*, author:profiles!posts_author_id_fkey(id, display_name, avatar_url, faculty), category:categories!posts_category_id_fkey(id, name, slug, icon)')
        .eq('author_id', userId)
        .order('created_at', { ascending: false })
        .range(from, to);

      // สำหรับโพรไฟล์สาธารณะ ซ่อนโพสต์แบบไม่ระบุตัวตน
      if (feedType === 'user_posts') {
        query = query.eq('is_anonymous', false);
      }

      const { data } = await query;
      newData = data ?? [];

    } else if (feedType === 'bookmarks') {
      const { data } = await supabase
        .from('bookmarks')
        .select('post:posts(*, author:profiles!posts_author_id_fkey(id, display_name, avatar_url, faculty), category:categories!posts_category_id_fkey(id, name, slug, icon))')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(from, to);

      newData = data ? data.map((b: any) => b.post).filter(Boolean) : [];
    }

    if (newData.length > 0) {
      setPosts(prev => [...prev, ...(newData as Post[])]);
      setPage(p => p + 1);
      if (newData.length < 10) setHasMore(false);
    } else {
      setHasMore(false);
    }
    
    setLoading(false);
  };

  if (posts.length === 0) {
    return (
      <div className="py-20 text-center border rounded-xl border-dashed bg-card/50">
        {feedType === 'bookmarks' ? (
          <Bookmark className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
        ) : feedType === 'my_posts' ? (
          <Inbox className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
        ) : (
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
        )}
        
        <h3 className="text-lg font-medium text-foreground">
          {feedType === 'bookmarks' ? 'ยังไม่มีกระทู้ที่บันทึกไว้' : 'ยังไม่มีโพสต์'}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {feedType === 'bookmarks' 
            ? 'บันทึกกระทู้ที่สนใจเพื่อไว้อ่านทีหลังได้'
            : feedType === 'my_posts' 
              ? 'คุณยังไม่ได้ตั้งกระทู้ใดๆ ในชุมชน'
              : 'ผู้ใช้นี้ยังไม่ได้ตั้งกระทู้ใดๆ'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {posts.map((post, idx) => (
        <PostCard key={`${post.id}-${idx}`} post={post} index={idx} />
      ))}
      
      {hasMore && (
        <div className="w-full py-4 flex justify-center">
          <button 
            onClick={loadMorePosts}
            disabled={loading}
            className="px-4 py-2 text-sm text-(--color-yru-pink) bg-yru-pink/10 hover:bg-yru-pink/20 rounded-full transition-colors disabled:opacity-50"
          >
            {loading ? 'กำลังโหลด...' : 'โหลดเพิ่ม'}
          </button>
        </div>
      )}
      {!hasMore && posts.length > 0 && (
        <div className="w-full py-4 flex justify-center">
          <p className="text-xs text-muted-foreground mt-2">ไม่มีโพสต์เพิ่มเติมแล้ว</p>
        </div>
      )}
    </div>
  );
}
