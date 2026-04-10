import { createClient } from '@/lib/supabase/server';
import { AdminUsersTable } from '@/components/admin/tables/AdminUsersTable';

export const metadata = { title: 'จัดการผู้ใช้ - Admin | YRU Community' };

export default async function AdminUsersPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .range(0, 99);

  if (error) {
    console.error('[AdminUsers] Fetch error:', error.message);
  }

  const { count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  return (
    <AdminUsersTable
      initialUsers={(data as any[]) ?? []}
      totalCount={count ?? 0}
    />
  );
}
