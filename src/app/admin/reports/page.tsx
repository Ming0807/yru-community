import { createClient } from '@/lib/supabase/server';
import { AdminReportsTable } from '@/components/admin/tables/AdminReportsTable';

export const metadata = { title: 'จัดการรายงาน - Admin | YRU Community' };

export default async function AdminReportsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reports')
    .select('id, post_id, reason, status, created_at, post:posts(title)')
    .order('created_at', { ascending: false })
    .range(0, 99);

  if (error) {
    console.error('[AdminReports] Fetch error:', error.message);
  }

  return (
    <AdminReportsTable initialReports={(data as any[]) ?? []} />
  );
}
