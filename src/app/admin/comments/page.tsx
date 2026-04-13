import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { AdminCommentsTable } from '@/components/admin/AdminCommentsClient';

export const metadata = { title: 'จัดการความคิดเห็น - Admin | YRU Community' };

interface Props {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}

const PAGE_SIZE = 50;

export default async function AdminCommentsPage({ searchParams }: Props) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin' && profile?.role !== 'moderator') redirect('/');

  const { page: pageParam = '1', search = '', status = 'all' } = await searchParams;
  const page = Math.max(1, parseInt(pageParam) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from('comments')
    .select('id, content, created_at, post_id, author_id, is_deleted', { count: 'exact' })
    .range(from, to)
    .order('created_at', { ascending: false });

  if (search) {
    const escaped = search.replace(/[%'"\\]/g, '\\$&');
    query = query.or(`content.ilike.%${escaped}%`);
  }

  if (status === 'active') {
    query = query.is('is_deleted', false);
  } else if (status === 'deleted') {
    query = query.is('is_deleted', true);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[AdminComments] Fetch error:', error.message);
  }

  const commentIds = (data ?? []).map((c: any) => c.id);
  const postIds = [...new Set((data ?? []).map((c: any) => c.post_id).filter(Boolean))];
  const authorIds = [...new Set((data ?? []).map((c: any) => c.author_id).filter(Boolean))];

  const [postsData, profilesData, reportsData] = await Promise.all([
    postIds.length > 0 ? supabase.from('posts').select('id, title').in('id', postIds) : { data: [] },
    authorIds.length > 0 ? supabase.from('profiles').select('id, display_name, avatar_url').in('id', authorIds) : { data: [] },
    commentIds.length > 0 ? supabase.from('reports').select('comment_id').in('comment_id', commentIds) : { data: [] },
  ]);

  const postsMap = new Map((postsData.data ?? []).map((p: any) => [p.id, p]));
  const profilesMap = new Map((profilesData.data ?? []).map((p: any) => [p.id, p]));
  const reportedIds = new Set((reportsData.data ?? []).map((r: any) => r.comment_id).filter(Boolean));

  const comments = (data ?? []).map((c: any) => ({
    id: c.id,
    content: c.content,
    created_at: c.created_at,
    post_id: c.post_id,
    author_id: c.author_id,
    is_deleted: c.is_deleted ?? false,
    post_title: postsMap.get(c.post_id)?.title,
    user: profilesMap.get(c.author_id),
    has_report: reportedIds.has(c.id),
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

      <AdminCommentsTable
        initialComments={comments}
        totalCount={count ?? 0}
        currentPage={page}
        pageSize={PAGE_SIZE}
        searchQuery={search}
        statusQuery={status}
      />
    </div>
  );
}