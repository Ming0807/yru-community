import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { AdminCommentsTable } from '@/components/admin/AdminCommentsClient';

export const metadata = { title: 'จัดการความคิดเห็น - Admin | YRU Community' };

export default async function AdminCommentsPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin' && profile?.role !== 'moderator') redirect('/');

  const { data: comments } = await supabase
    .from('comments')
    .select('id, content, created_at, post_id, author_id, post:posts(title), user:profiles(display_name, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(200);

  const formattedComments = ((comments ?? []) as any[]).map((c) => ({
    id: c.id,
    content: c.content,
    created_at: c.created_at,
    post_id: c.post_id,
    post_title: c.post?.title,
    author_id: c.author_id,
    user: c.user,
  }));

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-[var(--color-yru-pink)]/10">
          <MessageCircle className="h-5 w-5 text-[var(--color-yru-pink)]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">จัดการความคิดเห็น</h1>
          <p className="text-sm text-muted-foreground">จัดการและลบความคิดเห็นที่ไม่เหมาะสม</p>
        </div>
      </div>

      <AdminCommentsTable initialComments={formattedComments} />
    </div>
  );
}