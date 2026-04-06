import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import PostCard from '@/components/post/PostCard';
import PostSkeleton from '@/components/post/PostSkeleton';
import ProfileFeedClient from '@/components/profile/ProfileFeedClient';
import SubscribeButton from '@/components/profile/SubscribeButton';
import UserBadge, { ExpProgress } from '@/components/UserBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Users } from 'lucide-react';
import Link from 'next/link';
import type { Profile, Post } from '@/types';

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  // Fetch target profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (!profile) {
    notFound();
  }

  // Check follow status if logged in
  let isFollowing = false;
  if (currentUser) {
    const { data: followData } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', currentUser.id)
      .eq('following_id', id)
      .single();
    if (followData) isFollowing = true;
  }

  // Fetch follow counts
  const { count: followersCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', id);

  const { count: followingCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', id);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-3xl pt-6 px-4 pb-24 sm:pb-8">
        {/* Profile Card */}
        <div className="mb-8 rounded-2xl border bg-card p-6 shadow-sm overflow-hidden relative">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            <Avatar className="h-24 w-24 ring-4 ring-background shadow-md">
              <AvatarImage src={profile.avatar_url || ''} className="object-cover" />
              <AvatarFallback className="text-2xl bg-(--color-yru-pink)/10 text-(--color-yru-pink)">
                {profile.display_name?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold truncate">
                    {profile.display_name || 'สมาชิก YRU'}
                  </h1>
                  <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
                    {profile.faculty || 'ไม่ระบุคณะ'}
                    {profile.major && <><span className="w-1 h-1 rounded-full bg-muted-foreground/30" />{profile.major}</>}
                  </p>
                </div>

                {currentUser && currentUser.id !== id && (
                   <SubscribeButton 
                     targetUserId={id} 
                     initialIsFollowing={isFollowing} 
                   />
                )}
              </div>

              <div className="flex items-center gap-4 mt-4">
                <Link href={`/profile/${id}/followers`} className="text-sm hover:text-[var(--color-yru-pink)] transition-colors cursor-pointer">
                  <span className="font-bold">{followersCount || 0}</span> <span className="text-muted-foreground">ผู้ติดตาม</span>
                </Link>
                <Link href={`/profile/${id}/following`} className="text-sm hover:text-[var(--color-yru-pink)] transition-colors cursor-pointer">
                  <span className="font-bold">{followingCount || 0}</span> <span className="text-muted-foreground">กำลังติดตาม</span>
                </Link>
              </div>

              {profile.bio && (
                <p className="mt-3 text-sm text-foreground/80 whitespace-pre-wrap line-clamp-3">
                  {profile.bio}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2 items-center">
                <UserBadge level={profile.level} exp={profile.experience_points} />
                <div className="hidden sm:block ml-auto w-48">
                  <ExpProgress exp={profile.experience_points} level={profile.level || 1} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="mb-6 w-full justify-start rounded-b-none border-b bg-transparent p-0">
            <TabsTrigger
              value="posts"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-(--color-yru-pink) data-[state=active]:text-(--color-yru-pink) data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6"
            >
              <BookOpen className="mr-2 h-4 w-4" />
              โพสต์ทั้งหมด
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-0 outline-none">
            <Suspense fallback={<div className="space-y-3"><PostSkeleton /><PostSkeleton /></div>}>
              <UserPosts userId={id} />
            </Suspense>
          </TabsContent>
        </Tabs>
      </main>

      <MobileNav />
    </div>
  );
}

async function UserPosts({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data: posts } = await supabase
    .from('posts')
    .select('*, author:profiles(*), category:categories(*)')
    .eq('author_id', userId)
    .eq('is_anonymous', false)
    .order('created_at', { ascending: false })
    .range(0, 9); // PRE-FETCH 10 items for first chunk

  return (
    <ProfileFeedClient 
      userId={userId}
      feedType="user_posts"
      initialPosts={(posts as unknown as Post[]) ?? []}
    />
  );
}
