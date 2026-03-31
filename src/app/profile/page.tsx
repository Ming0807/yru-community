'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Settings,
  LogOut,
  Trash2,
  BookOpen,
  Bookmark,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import PostCard from '@/components/post/PostCard';
import PostSkeleton from '@/components/post/PostSkeleton';
import UserBadge, { ExpProgress } from '@/components/UserBadge';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Profile, Post } from '@/types';

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setProfile(profileData);

      // Fetch my posts
      const { data: posts } = await supabase
        .from('posts')
        .select('*, author:profiles(*), category:categories(*)')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false });

      setMyPosts(posts ?? []);

      // Fetch bookmarked posts
      const { data: bookmarks } = await supabase
        .from('bookmarks')
        .select('post_id')
        .eq('user_id', user.id);

      if (bookmarks && bookmarks.length > 0) {
        const postIds = bookmarks.map((b) => b.post_id);
        const { data: bPosts } = await supabase
          .from('posts')
          .select('*, author:profiles(*), category:categories(*)')
          .in('id', postIds)
          .order('created_at', { ascending: false });

        setBookmarkedPosts(bPosts ?? []);
      }

      setLoading(false);
    }

    loadProfile();
  }, []);

  const handleDeleteAccount = async () => {
    toast.info(
      'คำขอลบบัญชีถูกส่งแล้ว ทีมงานจะดำเนินการภายใน 7 วัน'
    );
    setDeleteDialogOpen(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-3xl pb-24 sm:pb-8 px-4">
          {/* Profile Card Skeleton */}
          <div className="rounded-2xl border border-border/40 bg-card p-6 mt-4 card-shadow">
            <div className="flex flex-col items-center sm:flex-row sm:items-start gap-4">
              <div className="h-20 w-20 rounded-full bg-muted animate-shimmer" />
              <div className="flex-1 space-y-2 text-center sm:text-left">
                <div className="h-6 w-40 bg-muted rounded-lg animate-shimmer mx-auto sm:mx-0" />
                <div className="h-4 w-56 bg-muted rounded-md animate-shimmer mx-auto sm:mx-0" style={{ animationDelay: '100ms' }} />
                <div className="h-4 w-32 bg-muted rounded-md animate-shimmer mx-auto sm:mx-0" style={{ animationDelay: '200ms' }} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-6">
              {[0, 1, 2].map(i => (
                <div key={i} className="rounded-xl bg-background/60 p-3 text-center">
                  <div className="h-7 w-10 bg-muted rounded-md animate-shimmer mx-auto" style={{ animationDelay: `${i * 100}ms` }} />
                  <div className="h-3 w-16 bg-muted rounded-md animate-shimmer mx-auto mt-1.5" style={{ animationDelay: `${i * 100 + 50}ms` }} />
                </div>
              ))}
            </div>
          </div>
          {/* Posts Skeleton */}
          <div className="mt-6 space-y-3">
            <PostSkeleton />
            <PostSkeleton />
          </div>
        </main>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-3xl pb-24 sm:pb-8 px-4">
        {/* Profile Card */}
        <div className="relative rounded-2xl border border-border/40 bg-card p-6 mt-4 animate-fade-in-up card-shadow overflow-hidden">
          {/* Gradient bg */}
          <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-(--color-yru-pink-light) to-(--color-yru-green-light) opacity-20 dark:opacity-5" />

          <div className="relative flex flex-col items-center sm:flex-row sm:items-start gap-4">
            <Avatar className="h-20 w-20 ring-4 ring-background shadow-lg">
              <AvatarImage
                src={profile.avatar_url ?? undefined}
                alt={profile.display_name}
              />
              <AvatarFallback className="text-2xl font-bold bg-linear-to-br from-(--color-yru-pink) to-(--color-yru-green) text-white">
                {profile.display_name?.charAt(0)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <h1 className="text-xl font-bold">{profile.display_name}</h1>
                <UserBadge level={profile.level ?? 1} exp={profile.experience_points ?? 0} size="sm" showName />
              </div>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              {profile.faculty && (
                <p className="text-sm text-muted-foreground mt-1">
                  🎓 {profile.faculty}
                  {profile.major && ` • ${profile.major}`}
                </p>
              )}
              {/* EXP Progress */}
              <div className="mt-3 max-w-xs mx-auto sm:mx-0">
                <ExpProgress exp={profile.experience_points ?? 0} level={profile.level ?? 1} />
              </div>
            </div>

            <div className="flex gap-2">
              <Link href="/profile/setup">
                <Button variant="outline" size="sm" className="rounded-full gap-1.5">
                  <Settings className="h-3.5 w-3.5" />
                  แก้ไข
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="relative grid grid-cols-3 gap-3 mt-6">
            <div className="rounded-xl bg-background/60 p-3 text-center">
              <p className="text-2xl font-bold text-(--color-yru-pink)">
                {myPosts.length}
              </p>
              <p className="text-xs text-muted-foreground">กระทู้ของฉัน</p>
            </div>
            <div className="rounded-xl bg-background/60 p-3 text-center">
              <p className="text-2xl font-bold text-(--color-yru-green)">
                {bookmarkedPosts.length}
              </p>
              <p className="text-xs text-muted-foreground">กระทู้ที่บันทึก</p>
            </div>
            <div className="rounded-xl bg-background/60 p-3 text-center">
              <p className="text-2xl font-bold text-amber-500">
                {profile.experience_points ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">EXP</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="posts" className="mt-6">
          <TabsList className="w-full rounded-xl h-11">
            <TabsTrigger value="posts" className="flex-1 gap-1.5 rounded-lg">
              <BookOpen className="h-4 w-4" />
              กระทู้ของฉัน
            </TabsTrigger>
            <TabsTrigger value="bookmarks" className="flex-1 gap-1.5 rounded-lg">
              <Bookmark className="h-4 w-4" />
              ที่บันทึกไว้
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-4 space-y-3">
            {myPosts.length > 0 ? (
              myPosts.map((post) => <PostCard key={post.id} post={post} />)
            ) : (
              <div className="py-12 text-center text-sm text-muted-foreground">
                ยังไม่มีกระทู้ ลองตั้งกระทู้แรกของคุณ! ✏️
              </div>
            )}
          </TabsContent>

          <TabsContent value="bookmarks" className="mt-4 space-y-3">
            {bookmarkedPosts.length > 0 ? (
              bookmarkedPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))
            ) : (
              <div className="py-12 text-center text-sm text-muted-foreground">
                ยังไม่มีกระทู้ที่บันทึกไว้ กด 🔖 เพื่อบันทึกกระทู้ที่ชอบ
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Separator className="my-6" />

        {/* Danger Zone */}
        <div className="space-y-3">
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="w-full rounded-xl gap-1.5"
          >
            <LogOut className="h-4 w-4" />
            ออกจากระบบ
          </Button>

          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                className="w-full rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
              >
                <Trash2 className="h-4 w-4" />
                ขอลบบัญชี
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>ยืนยันการลบบัญชี</DialogTitle>
                <DialogDescription>
                  การลบบัญชีจะทำให้ข้อมูลทั้งหมดของคุณถูกลบ
                  กระบวนการนี้ไม่สามารถย้อนกลับได้
                  ทีมงานจะดำเนินการภายใน 7 วันทำการ
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(false)}
                >
                  ยกเลิก
                </Button>
                <Button variant="destructive" onClick={handleDeleteAccount}>
                  ยืนยันลบบัญชี
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
