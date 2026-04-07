import { Suspense } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import CategoryTabs from '@/components/category/CategoryTabs';
import RightSidebar from '@/components/layout/RightSidebar';
import FAB from '@/components/FAB';
import PostCard from '@/components/post/PostCard';
import PostSkeleton from '@/components/post/PostSkeleton';
import type { Post } from '@/types';

export default async function FollowingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch following list
  const { data: follows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id);

  const followingIds = follows?.map(f => f.following_id) || [];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="mx-auto flex max-w-[1200px] items-start gap-8 pt-6 px-4 pb-24 sm:pb-8">
        <main className="flex-1 min-w-0">
          <div className="mb-6 flex justify-between items-center bg-(--color-yru-pink)/10 text-(--color-yru-pink-dark) p-4 rounded-xl border border-(--color-yru-pink)/20">
            <div>
              <h1 className="text-lg font-bold">โพสต์จากคนที่คุณติดตาม</h1>
              <p className="text-sm opacity-80">คุณกำลังติดตาม {followingIds.length} คน</p>
            </div>
            <Link href="/">
              <span className="text-sm font-medium hover:underline cursor-pointer">กลับหน้าฟีดหลัก</span>
            </Link>
          </div>

          {/* Feed with Suspense */}
          <div className="mt-2 min-h-[500px]">
            <Suspense
              fallback={
                <div className="space-y-3">
                  <PostSkeleton />
                  <PostSkeleton />
                  <PostSkeleton />
                </div>
              }
            >
              <FollowingFeed followingIds={followingIds} />
            </Suspense>
          </div>
        </main>

        <RightSidebar />
        <FAB />
        <MobileNav />
      </div>
    </div>
  );
}

async function FollowingFeed({ followingIds }: { followingIds: string[] }) {
  if (followingIds.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground border border-dashed rounded-xl border-border/60">
        <p>คุณยังไม่ได้ติดตามใครเลย</p>
        <p className="text-sm mt-2">ไปที่โปรไฟล์ของคนอื่นและกด "ติดตาม" เพื่อดูโพสต์ของพวกเขาที่นี่</p>
        <Link href="/">
          <button className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:opacity-90 transition-opacity">
            สำรวจกระทู้
          </button>
        </Link>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: posts } = await supabase
    .from('posts')
    .select('*, author:profiles(*), category:categories(*)')
    .in('author_id', followingIds)
    .eq('is_draft', false)
    .order('created_at', { ascending: false })
    .limit(20);

  if (!posts || posts.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground border border-dashed rounded-xl border-border/60">
        <p>ไม่มีโพสต์ใหม่จากคนที่คุณติดตาม</p>
        <Link href="/">
          <button className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:opacity-90 transition-opacity">
            กลับไปหน้าฟีดหลัก
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {(posts as Post[]).map((post, index) => (
        <PostCard key={post.id} post={post} index={index} />
      ))}
    </div>
  );
}
