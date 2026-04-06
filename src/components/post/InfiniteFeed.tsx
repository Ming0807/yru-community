'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import PostCard from '@/components/post/PostCard';
import FeedAdCard from '@/components/ads/FeedAdCard';
import { createClient } from '@/lib/supabase/client';
import { POSTS_PER_PAGE } from '@/lib/constants';
import type { Post, SortOption, Ad } from '@/types';
import { ChevronDown, Loader2, ArrowUp, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/components/UserProvider';

interface InfiniteFeedProps {
  initialPosts: Post[];
  totalCount: number;
  sort: SortOption;
  ads?: Ad[];
}

export default function InfiniteFeed({ initialPosts, totalCount, sort, ads = [] }: InfiniteFeedProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [newPosts, setNewPosts] = useState<Post[]>([]);
  const { user } = useUser();
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel('feed_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
        },
        (payload: { new: any }) => {
          const newPost = payload.new as any;
          if (sort === 'latest') {
            setNewPosts((prev) => {
              const exists = prev.some((p) => p.id === newPost.id);
              if (exists) return prev;
              return [newPost, ...prev];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sort, supabase]);

  const loadNewPosts = () => {
    setPosts((prev) => {
      const existingIds = new Set(prev.map((p) => p.id));
      const unique = newPosts.filter((p) => !existingIds.has(p.id));
      return [...unique, ...prev];
    });
    setNewPosts([]);
  };

  const hasMore = posts.length < totalCount;

  const loadMore = async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);

    try {
      const nextPage = page + 1;
      const offset = (nextPage - 1) * POSTS_PER_PAGE;
      const supabase = createClient();

      let query = supabase
        .from('posts')
        .select('*, author:profiles(*), category:categories(*)');

      query = query.order('is_pinned', { ascending: false }); // Pinned posts always first

      if (sort === 'top') {
        query = query.order('vote_count', { ascending: false });
      } else if (sort === 'unanswered') {
        query = query.eq('comment_count', 0).order('created_at', { ascending: false });
      } else {
        // latest
        query = query.order('created_at', { ascending: false });
      }

      query = query.range(offset, offset + POSTS_PER_PAGE - 1);

      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        setPosts((prev) => {
          // Filter out any duplicates just in case new posts were added while scrolling
          const existingIds = new Set(prev.map((p: Post) => p.id));
          const newUnique = (data as Post[]).filter((p: Post) => !existingIds.has(p.id));
          return [...prev, ...newUnique];
        });
        setPage(nextPage);
      }
    } catch (error) {
      console.error('Error fetching more posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!posts || posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in-up">
        <span className="text-5xl mb-4">📭</span>
        <h3 className="font-semibold text-lg mb-1">ยังไม่มีกระทู้</h3>
        <p className="text-sm text-muted-foreground mb-4">
          เป็นคนแรกที่ตั้งกระทู้เลย!
        </p>
        <Link
          href="/post/create"
          className="inline-flex items-center gap-1.5 rounded-full bg-linear-to-r from-(--color-yru-pink) to-(--color-yru-pink-dark) px-6 py-2.5 text-sm font-medium text-white shadow-md hover:opacity-90 transition-opacity"
        >
          ✏️ ตั้งกระทู้ใหม่
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {newPosts.length > 0 && (
        <div className="sticky top-20 z-10 flex items-center justify-center gap-2 rounded-xl border border-[var(--color-yru-pink)]/30 bg-[var(--color-yru-pink)]/10 backdrop-blur-md px-4 py-2.5 shadow-sm animate-fade-in-up">
          <Sparkles className="h-4 w-4 text-[var(--color-yru-pink)]" />
          <span className="text-sm font-medium">มี {newPosts.length} กระทู้ใหม่</span>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1 text-[var(--color-yru-pink)] hover:bg-[var(--color-yru-pink)]/20"
            onClick={loadNewPosts}
          >
            <ArrowUp className="h-3 w-3" /> แสดง
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {posts.map((post, index) => {
          // Ad Selection Logic: Favor ads that target the current post's category or tags
          const showAd = ads.length > 0 && index > 0 && index % 8 === 3;
          let adToDisplay = null;
          if (showAd) {
             const targetedAds = ads.filter(ad => {
                const matchCat = (ad.target_categories?.length || 0) > 0 && ad.target_categories!.includes(post.category_id);
                const matchTag = (ad.target_tags?.length || 0) > 0 && post.tags && post.tags.some(t => ad.target_tags!.includes(t));
                return matchCat || matchTag;
             });
             
             // Fallback to generic ads if no targeted ad matches
             const validAds = targetedAds.length > 0 ? targetedAds : ads.filter(ad => 
                (ad.target_categories?.length || 0) === 0 &&
                (ad.target_tags?.length || 0) === 0
             );
             
             adToDisplay = validAds.length > 0 ? validAds[index % validAds.length] : (ads.length > 0 ? ads[index % ads.length] : null);
          }

          return (
            <div key={post.id} className="space-y-3">
              {showAd && adToDisplay && <FeedAdCard ad={adToDisplay} />}
              <PostCard post={post} index={index} />
            </div>
          );
        })}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-6 pb-12">
          <Button
            onClick={loadMore}
            disabled={isLoading}
            variant="outline"
            className="rounded-full px-8 py-6 border-border/60 hover:border-(--color-yru-pink)/40 hover:text-(--color-yru-pink) transition-all bg-card/50 backdrop-blur-sm shadow-xs"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                กำลังโหลด...
              </>
            ) : (
              <>
                <ChevronDown className="mr-2 h-4 w-4" />
                โหลดเพิ่มเติม
              </>
            )}
          </Button>
        </div>
      )}
      
      {!hasMore && posts.length > 0 && (
         <div className="text-center text-sm text-muted-foreground py-8">
           — ไม่มีกระทู้เพิ่มเติมแล้ว —
         </div>
      )}
    </div>
  );
}
