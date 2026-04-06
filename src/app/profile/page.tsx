import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createClient } from '@/lib/supabase/server';
import UserBadge, { ExpProgress } from '@/components/UserBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Settings, LogOut, BookOpen, Bookmark } from 'lucide-react';
import Link from 'next/link';

// Component for rendering profile feeds, handling its own loading state
import ProfileFeedClient from '@/components/profile/ProfileFeedClient';
import PostCard from '@/components/post/PostCard'; // Used for type cast / initial data
import type { Post } from '@/types';

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

  // Pre-fetch first 10 posts for fast initial SSR load
  const { data: initialMyPosts } = await supabase
    .from('posts')
    .select('*, author:profiles(*), category:categories(*)')
    .eq('author_id', user.id)
    .order('created_at', { ascending: false })
    .range(0, 9);

  // Pre-fetch first 10 bookmarks for fast SSR load
  const { data: initialBookmarksData } = await supabase
    .from('bookmarks')
    .select('post:posts(*, author:profiles(*), category:categories(*))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(0, 9);
    
  const initialBookmarks = initialBookmarksData 
    ? initialBookmarksData.map(b => b.post).filter(Boolean) as unknown as Post[]
    : [];

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
              </div>

              <div className="w-full mt-6 space-y-4 text-left border-t border-border/50 pt-6">
                <div className="flex items-center justify-between">
                  <UserBadge level={profile.level} exp={profile.experience_points} />
                  <span className="text-xs font-medium text-muted-foreground">LV. {profile.level || 1}</span>
                </div>
                <ExpProgress exp={profile.experience_points} level={profile.level || 1} />
              </div>

              <div className="w-full mt-6 grid grid-cols-2 gap-3">
                <Link href="/profile/setup" className="w-full">
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
                  กระทู้ของฉัน
                </TabsTrigger>
                <TabsTrigger
                  value="bookmarks"
                  className="flex-1 rounded-lg data-[state=active]:bg-(--color-yru-pink) data-[state=active]:text-white data-[state=active]:shadow h-10"
                >
                  <Bookmark className="mr-2 h-4 w-4" />
                  บุ๊กมาร์ก
                </TabsTrigger>
              </TabsList>

              <TabsContent value="posts" className="mt-0 outline-none">
                <ProfileFeedClient 
                  userId={user.id} 
                  feedType="my_posts" 
                  initialPosts={(initialMyPosts as unknown as Post[]) ?? []} 
                />
              </TabsContent>

              <TabsContent value="bookmarks" className="mt-0 outline-none">
                <ProfileFeedClient 
                  userId={user.id} 
                  feedType="bookmarks" 
                  initialPosts={initialBookmarks} 
                />
              </TabsContent>
            </Tabs>
          </div>
          
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
