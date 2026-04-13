import { createClient } from '@/lib/supabase/server';
import { AdminUsersTable } from '@/components/admin/tables/AdminUsersTable';
import type { Profile } from '@/types';

export const metadata = { title: 'จัดการผู้ใช้ - Admin | YRU Community' };

interface Props {
  searchParams: Promise<{ page?: string; search?: string }>;
}

const PAGE_SIZE = 50;

export default async function AdminUsersPage({ searchParams }: Props) {
  const { page: pageParam = '1', search = '' } = await searchParams;
  const page = Math.max(1, parseInt(pageParam) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();

  let query = supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (search) {
    query = query.or(`display_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[AdminUsers] Fetch error:', error.message);
  }

  return (
    <AdminUsersTable
      initialUsers={(data as Profile[]) ?? []}
      totalCount={count ?? 0}
      currentPage={page}
      pageSize={PAGE_SIZE}
      searchQuery={search}
    />
  );
}
