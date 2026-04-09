import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Users } from 'lucide-react';
import Link from 'next/link';
import type { Profile } from '@/types';

export default async function FollowingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (!profile) notFound();

  const { data: following } = await supabase
    .from('follows')
    .select('following:profiles!follows_following_id_fkey(*)')
    .eq('follower_id', id)
    .order('created_at', { ascending: false });

  const followingList = following
    ?.map((f: any) => f.following as Profile)
    .filter((p: Profile) => p && p.id) || [];

  // Check follow status for each
  const followingIds = new Set<string>();
  if (currentUser && followingList.length > 0) {
    const { data: followData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', currentUser.id)
      .in('following_id', followingList.map(f => f.id));
    
    followData?.forEach(f => followingIds.add(f.following_id));
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-2xl px-4 py-6 pb-24">
        <div className="flex items-center gap-2 mb-6">
          <Link href={`/profile/${id}`} className="p-1.5 rounded-full hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-[var(--color-yru-pink)]" />
              กำลังติดตาม
            </h1>
            <p className="text-sm text-muted-foreground">
              {profile.display_name} · {followingList.length} คน
            </p>
          </div>
        </div>

        {followingList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">ยังไม่ติดตามใคร</p>
          </div>
        ) : (
          <div className="space-y-1">
            {followingList.map((person) => (
              <div
                key={person.id}
                className="flex items-center gap-3 rounded-xl p-3 hover:bg-muted/40 transition-colors"
              >
                <Link href={`/profile/${person.id}`} className="shrink-0">
                  <Avatar className="h-12 w-12 ring-2 ring-border">
                    <AvatarImage src={person.avatar_url || undefined} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-[var(--color-yru-pink-light)] to-[var(--color-yru-green-light)] text-sm font-semibold">
                      {person.display_name?.charAt(0) ?? 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Link>

                <div className="flex-1 min-w-0">
                  <Link href={`/profile/${person.id}`} className="font-medium hover:text-[var(--color-yru-pink)] hover:underline truncate block">
                    {person.display_name}
                  </Link>
                  <p className="text-xs text-muted-foreground truncate">
                    {person.faculty || 'ไม่ระบุคณะ'}
                  </p>
                </div>

                {currentUser && currentUser.id !== person.id && (
                  <Link
                    href={`/profile/${person.id}`}
                    className="text-xs font-medium text-[var(--color-yru-pink)] hover:underline shrink-0"
                  >
                    ดูโปรไฟล์
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <MobileNav />
    </div>
  );
}
