import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Shield, Ban, CheckCircle, Clock, MessageSquare, BookOpen, Flag, Mail } from 'lucide-react';
import Link from 'next/link';
import { timeAgo } from '@/lib/utils';

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // Check admin
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) notFound();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (!profile) notFound();

  // Fetch user's posts
  const { data: posts } = await supabase
    .from('posts')
    .select('id, title, created_at, vote_count, comment_count, category:categories(name)')
    .eq('author_id', id)
    .order('created_at', { ascending: false })
    .limit(20)
    .returns<Array<{ id: string; title: string; created_at: string; vote_count: number; comment_count: number; category: { name: string }[] | null }>>();

  // Fetch user's comments
  const { data: comments } = await supabase
    .from('comments')
    .select('id, content, created_at, vote_count, post:posts(id, title)')
    .eq('author_id', id)
    .order('created_at', { ascending: false })
    .limit(20)
    .returns<Array<{ id: string; content: string; created_at: string; vote_count: number; post: { id: string; title: string }[] | null }>>();

  // Fetch reports involving this user
  const { data: reports } = await supabase
    .from('reports')
    .select('id, reason, status, created_at, post:posts(id, title)')
    .eq('reporter_id', id)
    .order('created_at', { ascending: false })
    .limit(10)
    .returns<Array<{ id: string; reason: string; status: string; created_at: string; post: { id: string; title: string }[] | null }>>();

  // Fetch follow stats
  const { count: followersCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', id);

  const { count: followingCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', id);

  return (
    <div>
      <main className="mx-auto max-w-4xl px-4 py-6 pb-24">
        {/* Back button */}
        <Link href="/admin/users" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> กลับไปจัดการผู้ใช้
        </Link>

        {/* Profile Card */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <Avatar className="h-20 w-20 ring-4 ring-background shadow-md">
              <AvatarImage src={profile.avatar_url || undefined} className="object-cover" />
              <AvatarFallback className="text-2xl bg-gradient-to-br from-[var(--color-yru-pink-light)] to-[var(--color-yru-green-light)]">
                {profile.display_name?.charAt(0) ?? 'U'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{profile.display_name}</h1>
                {profile.role === 'admin' && (
                  <Badge className="bg-[var(--color-yru-pink)] text-white gap-1">
                    <Shield className="h-3 w-3" /> แอดมิน
                  </Badge>
                )}
                {profile.status === 'banned' && (
                  <Badge variant="destructive" className="gap-1">
                    <Ban className="h-3 w-3" /> แบนถาวร
                  </Badge>
                )}
                {profile.status === 'suspended' && (
                  <Badge variant="outline" className="border-orange-500 text-orange-500 gap-1">
                    <Clock className="h-3 w-3" /> แบนชั่วคราว
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" /> {profile.email}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-1 text-sm">
                <span className="font-medium text-foreground">{profile.faculty || 'ไม่ระบุคณะ'}</span>
                {profile.major && <span className="text-muted-foreground">· {profile.major}</span>}
              </div>

              {profile.bio && (
                <p className="mt-3 text-sm text-foreground/80 whitespace-pre-wrap line-clamp-2">
                  {profile.bio}
                </p>
              )}

              <div className="flex items-center gap-6 mt-4">
                <div className="text-sm">
                  <span className="font-bold">{followersCount || 0}</span> <span className="text-muted-foreground">ผู้ติดตาม</span>
                </div>
                <div className="text-sm">
                  <span className="font-bold">{followingCount || 0}</span> <span className="text-muted-foreground">กำลังติดตาม</span>
                </div>
                <div className="text-sm">
                  <span className="font-bold">LV.{profile.level || 1}</span> <span className="text-muted-foreground">EXP: {profile.experience_points || 0}</span>
                </div>
              </div>

              <div className="text-xs text-muted-foreground mt-3">
                เข้าร่วมเมื่อ {new Date(profile.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="rounded-xl border bg-card p-4 text-center">
            <BookOpen className="h-5 w-5 mx-auto mb-1 text-[var(--color-yru-pink)]" />
            <p className="text-2xl font-bold">{posts?.length || 0}</p>
            <p className="text-xs text-muted-foreground">กระทู้</p>
          </div>
          <div className="rounded-xl border bg-card p-4 text-center">
            <MessageSquare className="h-5 w-5 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold">{comments?.length || 0}</p>
            <p className="text-xs text-muted-foreground">คอมเมนต์</p>
          </div>
          <div className="rounded-xl border bg-card p-4 text-center">
            <Flag className="h-5 w-5 mx-auto mb-1 text-orange-500" />
            <p className="text-2xl font-bold">{reports?.length || 0}</p>
            <p className="text-xs text-muted-foreground">รายงาน</p>
          </div>
          <div className="rounded-xl border bg-card p-4 text-center">
            <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-500" />
            <p className="text-2xl font-bold">{profile.status === 'active' ? 'ปกติ' : profile.status}</p>
            <p className="text-xs text-muted-foreground">สถานะ</p>
          </div>
        </div>

        {/* Posts */}
        <div className="rounded-2xl border bg-card shadow-sm mb-6">
          <div className="p-4 border-b">
            <h2 className="font-semibold flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[var(--color-yru-pink)]" />
              กระทู้ล่าสุด
            </h2>
          </div>
          <div className="divide-y">
            {posts && posts.length > 0 ? posts.map((post) => (
              <div key={post.id} className="p-4 hover:bg-muted/30 transition-colors">
                <Link href={`/post/${post.id}`} className="font-medium text-sm hover:text-[var(--color-yru-pink)] transition-colors">
                  {post.title}
                </Link>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>{(post.category as any)?.name || 'ไม่ระบุ'}</span>
                  <span>·</span>
                  <span>โหวต: {post.vote_count}</span>
                  <span>·</span>
                  <span>คอมเมนต์: {post.comment_count}</span>
                  <span>·</span>
                  <span>{timeAgo(post.created_at)}</span>
                </div>
              </div>
            )) : (
              <div className="p-6 text-center text-sm text-muted-foreground">ไม่มีกระทู้</div>
            )}
          </div>
        </div>

        {/* Comments */}
        <div className="rounded-2xl border bg-card shadow-sm mb-6">
          <div className="p-4 border-b">
            <h2 className="font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              คอมเมนต์ล่าสุด
            </h2>
          </div>
          <div className="divide-y">
            {comments && comments.length > 0 ? comments.map((comment) => (
              <div key={comment.id} className="p-4 hover:bg-muted/30 transition-colors">
                <p className="text-sm line-clamp-2">{comment.content}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  {(comment as any).post?.id && (
                    <Link href={`/post/${(comment as any).post.id}`} className="hover:text-[var(--color-yru-pink)] transition-colors">
                      ใน: {(comment as any).post.title}
                    </Link>
                  )}
                  <span>·</span>
                  <span>โหวต: {comment.vote_count}</span>
                  <span>·</span>
                  <span>{timeAgo(comment.created_at)}</span>
                </div>
              </div>
            )) : (
              <div className="p-6 text-center text-sm text-muted-foreground">ไม่มีคอมเมนต์</div>
            )}
          </div>
        </div>

        {/* Reports */}
        {reports && reports.length > 0 && (
          <div className="rounded-2xl border bg-card shadow-sm">
            <div className="p-4 border-b">
              <h2 className="font-semibold flex items-center gap-2">
                <Flag className="h-4 w-4 text-orange-500" />
                รายงานที่แจ้ง
              </h2>
            </div>
            <div className="divide-y">
              {reports.map((report) => (
                <div key={report.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <p className="text-sm text-red-600">{report.reason}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  {(report as any).post?.[0]?.id && (
                    <Link href={`/post/${(report as any).post[0].id}`} className="hover:text-[var(--color-yru-pink)] transition-colors">
                      กระทู้: {(report as any).post[0].title}
                    </Link>
                  )}
                    <span>·</span>
                    <Badge variant={report.status === 'resolved' ? 'default' : 'outline'} className="text-xs">
                      {report.status === 'resolved' ? 'จัดการแล้ว' : report.status === 'reviewed' ? 'ตรวจสอบแล้ว' : 'รอดำเนินการ'}
                    </Badge>
                    <span>·</span>
                    <span>{timeAgo(report.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
