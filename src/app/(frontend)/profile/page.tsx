import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createClient } from '@/lib/supabase/server';
import UserBadge, { ExpProgress } from '@/components/UserBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Settings, LogOut, BookOpen, Bookmark, Activity, FileBadge } from 'lucide-react';
import Link from 'next/link';

// Component for rendering profile feeds, handling its own loading state
import ProfileFeedClient from '@/components/profile/ProfileFeedClient';
import PostCard from '@/components/post/PostCard'; // Used for type cast / initial data
import PostSkeleton from '@/components/post/PostSkeleton';
import type { Post, Comment, PostReaction } from '@/types';
import { timeAgo } from '@/lib/utils';
import { MessageSquare, Heart, ArrowBigUp } from 'lucide-react';

export const metadata = {
  title: 'โปรไฟล์ของฉัน | YRU Community',
};

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/login');
  }

  // Pre-fetch first 10 posts for fast initial SSR load (exclude drafts)
  const { data: initialMyPosts } = await supabase
    .from('posts')
    .select('*, author:profiles!posts_author_id_fkey(id, display_name, avatar_url, faculty), category:categories!posts_category_id_fkey(id, name, slug, icon)')
    .eq('author_id', user.id)
    .eq('is_draft', false)
    .order('created_at', { ascending: false })
    .range(0, 9);

  // Pre-fetch first 10 bookmarks for fast SSR load (exclude drafts)
  const { data: initialBookmarksData } = await supabase
    .from('bookmarks')
    .select('post:posts(*, author:profiles!posts_author_id_fkey(id, display_name, avatar_url, faculty), category:categories!posts_category_id_fkey(id, name, slug, icon))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(0, 9);
    
  const initialBookmarks = initialBookmarksData 
    ? initialBookmarksData.map(b => b.post).filter(Boolean) as unknown as Post[]
    : [];

  // Pre-fetch drafts (only for own profile)
  const { data: initialDrafts } = await supabase
    .from('posts')
    .select('*, author:profiles!posts_author_id_fkey(id, display_name, avatar_url, faculty), category:categories!posts_category_id_fkey(id, name, slug, icon)')
    .eq('author_id', user.id)
    .eq('is_draft', true)
    .order('created_at', { ascending: false })
    .range(0, 9);

  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-0 relative">
      <Header />
      
      <main className="mx-auto max-w-4xl pt-6 px-4 pb-24 sm:pb-8">
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Left Column: Sidebar Profile */}
          <div className="w-full md:w-80 shrink-0">
            <div className="sticky top-24 rounded-2xl border bg-card p-6 shadow-sm overflow-hidden text-center flex flex-col items-center">
              <Avatar className="h-28 w-28 ring-4 ring-background shadow-md">
                <AvatarImage src={profile.avatar_url || ''} className="object-cover" />
                <AvatarFallback className="text-3xl bg-(--color-yru-pink)/10 text-(--color-yru-pink)">
                  {profile.display_name?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>

              <div className="mt-4 w-full">
                <h1 className="text-2xl font-bold truncate px-2">{profile.display_name}</h1>
                <p className="text-muted-foreground text-sm mt-1">{profile.email}</p>
                
                <div className="flex items-center justify-center gap-2 mt-2 text-sm">
                  <span className="font-medium text-foreground">{profile.faculty || 'ไม่ระบุคณะ'}</span>
                  {profile.major && <><span className="w-1 h-1 rounded-full bg-muted-foreground/30" /> <span className="text-muted-foreground">{profile.major}</span></>}
                </div>

                {profile.bio && (
                  <p className="text-sm text-foreground/80 mt-3 px-2 line-clamp-3 whitespace-pre-wrap">
                    {profile.bio}
                  </p>
                )}
              </div>

              <div className="w-full mt-6 space-y-4 text-left border-t border-border/50 pt-6">
                <div className="flex items-center justify-between">
                  <UserBadge level={profile.level} exp={profile.experience_points} />
                  <span className="text-xs font-medium text-muted-foreground">LV. {profile.level || 1}</span>
                </div>
                <ExpProgress exp={profile.experience_points} level={profile.level || 1} />
              </div>

              <div className="w-full mt-6 grid grid-cols-2 gap-3">
                <Link href="/settings" className="w-full">
                  <Button variant="outline" className="w-full rounded-xl gap-2 font-medium">
                    <Settings className="w-4 h-4" /> ตั้งค่า
                  </Button>
                </Link>
                <form action="/auth/signout" method="post" className="w-full">
                  <Button variant="ghost" type="submit" className="w-full rounded-xl gap-2 text-red-500 hover:text-red-600 hover:bg-red-50">
                    <LogOut className="w-4 h-4" /> ออกจากระบบ
                  </Button>
                </form>
              </div>
            </div>
          </div>

          {/* Right Column: Main Content Area */}
          <div className="flex-1 min-w-0">
            <Tabs defaultValue="posts" className="w-full">
              <TabsList className="w-full justify-start rounded-xl border bg-card p-1 shadow-sm mb-6 h-12">
                <TabsTrigger
                  value="posts"
                  className="flex-1 rounded-lg data-[state=active]:bg-(--color-yru-pink) data-[state=active]:text-white data-[state=active]:shadow h-10"
                >
                  <BookOpen className="mr-2 h-4 w-4" />
                  กระทู้
                </TabsTrigger>
                <TabsTrigger
                  value="drafts"
                  className="flex-1 rounded-lg data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow h-10"
                >
                  <FileBadge className="mr-2 h-4 w-4" />
                  แบบร่าง
                </TabsTrigger>
                <TabsTrigger
                  value="bookmarks"
                  className="flex-1 rounded-lg data-[state=active]:bg-(--color-yru-pink) data-[state=active]:text-white data-[state=active]:shadow h-10"
                >
                  <Bookmark className="mr-2 h-4 w-4" />
                  บุ๊กมาร์ก
                </TabsTrigger>
                <TabsTrigger
                  value="activity"
                  className="flex-1 rounded-lg data-[state=active]:bg-(--color-yru-pink) data-[state=active]:text-white data-[state=active]:shadow h-10"
                >
                  <Activity className="mr-2 h-4 w-4" />
                  กิจกรรม
                </TabsTrigger>
              </TabsList>

              <TabsContent value="posts" className="mt-0 outline-none">
                <ProfileFeedClient 
                  userId={user.id} 
                  feedType="my_posts" 
                  initialPosts={(initialMyPosts as unknown as Post[]) ?? []} 
                />
              </TabsContent>

              <TabsContent value="drafts" className="mt-0 outline-none">
                <ProfileFeedClient 
                  userId={user.id} 
                  feedType="drafts" 
                  initialPosts={(initialDrafts as unknown as Post[]) ?? []} 
                />
              </TabsContent>

              <TabsContent value="bookmarks" className="mt-0 outline-none">
                <ProfileFeedClient 
                  userId={user.id} 
                  feedType="bookmarks" 
                  initialPosts={initialBookmarks} 
                />
              </TabsContent>

              <TabsContent value="activity" className="mt-0 outline-none">
                <Suspense fallback={<div className="space-y-3"><PostSkeleton /><PostSkeleton /></div>}>
                  <ActivityTab userId={user.id} />
                </Suspense>
              </TabsContent>
            </Tabs>
          </div>
          
        </div>
      </main>

      <MobileNav />
    </div>
  );
}

async function ActivityTab({ userId }: { userId: string }) {
  const supabase = await createClient();

  const { data: comments } = await supabase
    .from('comments')
    .select('*, post:posts(id, title)')
    .eq('author_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  const { data: reactions } = await supabase
    .from('post_reactions')
    .select('*, post:posts(id, title)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  const activities = [
    ...(comments?.map(c => ({
      type: 'comment' as const,
      id: c.id,
      content: c.content,
      post: c.post,
      created_at: c.created_at,
    })) || []),
    ...(reactions?.map(r => ({
      type: 'reaction' as const,
      id: r.id,
      reaction_type: r.reaction_type,
      post: r.post,
      created_at: r.created_at,
    })) || []),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
   .slice(0, 30);

  const reactionEmojis: Record<string, string> = {
    LIKE: '👍',
    LOVE: '❤️',
    HAHA: '😂',
    WOW: '😮',
    SAD: '😢',
    ANGRY: '😡',
  };

  return (
    <div className="space-y-1">
      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <Activity className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm">ยังไม่มีกิจกรรม</p>
        </div>
      ) : (
        activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-3 rounded-xl p-3 hover:bg-muted/40 transition-colors"
          >
            <div className="shrink-0 mt-0.5">
              {activity.type === 'comment' ? (
                <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                </div>
              ) : (
                <div className="h-8 w-8 rounded-full bg-red-500/10 flex items-center justify-center">
                  <span className="text-sm">
                    {reactionEmojis[(activity as any).reaction_type] || '👍'}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                {activity.type === 'comment' ? (
                  <>
                    <span className="text-muted-foreground">แสดงความคิดเห็นใน</span>{' '}
                    <Link
                      href={`/post/${(activity.post as any)?.id}`}
                      className="font-medium text-[var(--color-yru-pink)] hover:underline"
                    >
                      {(activity.post as any)?.title || 'โพสต์ที่ถูกลบ'}
                    </Link>
                  </>
                ) : (
                  <>
                    <span className="text-muted-foreground">รีแอค</span>{' '}
                    <Link
                      href={`/post/${(activity.post as any)?.id}`}
                      className="font-medium text-[var(--color-yru-pink)] hover:underline"
                    >
                      {(activity.post as any)?.title || 'โพสต์ที่ถูกลบ'}
                    </Link>
                  </>
                )}
              </p>
              {activity.type === 'comment' && (
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {(activity as any).content}
                </p>
              )}
              <span className="mt-1 block text-xs text-muted-foreground/60">
                {timeAgo(activity.created_at)}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
