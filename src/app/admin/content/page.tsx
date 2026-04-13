import { createClient } from '@/lib/supabase/server';
import { AdminContentTable } from '@/components/admin/tables/AdminContentTable';

export const metadata = { title: 'จัดการเนื้อหา - Admin | YRU Community' };

interface Props {
  searchParams: Promise<{ page?: string; search?: string }>;
}

const PAGE_SIZE = 50;

export default async function AdminContentPage({ searchParams }: Props) {
  const { page: pageParam = '1', search = '' } = await searchParams;
  const page = Math.max(1, parseInt(pageParam) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();

  let query = supabase
    .from('posts')
    .select('id, title, is_pinned, is_locked, deleted_at, created_at, category_id, category:categories(name)', { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (search) {
    query = query.ilike('title', `%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[AdminContent] Fetch error:', error.message);
  }

  return (
    <AdminContentTable
      initialPosts={(data as any[]) ?? []}
      totalCount={count ?? 0}
      currentPage={page}
      pageSize={PAGE_SIZE}
      searchQuery={search}
    />
  );
}
