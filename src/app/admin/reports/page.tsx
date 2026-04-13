import { createClient } from '@/lib/supabase/server';
import { AdminReportsTable } from '@/components/admin/tables/AdminReportsTable';

export const metadata = { title: 'จัดการรายงาน - Admin | YRU Community' };

interface Props {
  searchParams: Promise<{ page?: string; status?: string }>;
}

const PAGE_SIZE = 50;

export default async function AdminReportsPage({ searchParams }: Props) {
  const { page: pageParam = '1', status } = await searchParams;
  const page = Math.max(1, parseInt(pageParam) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();

  let query = supabase
    .from('reports')
    .select('id, post_id, reason, status, created_at, post:posts(title)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[AdminReports] Fetch error:', error.message);
  }

  return (
    <AdminReportsTable
      initialReports={(data as any[]) ?? []}
      totalCount={count ?? 0}
      currentPage={page}
      pageSize={PAGE_SIZE}
      statusFilter={status}
    />
  );
}
