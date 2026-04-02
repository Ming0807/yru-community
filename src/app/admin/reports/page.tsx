import { createClient } from '@/lib/supabase/server';
import AdminReportsClient from '@/components/admin/AdminReportsClient';

export const metadata = { title: 'จัดการรายงาน - Admin | YRU Community' };

export default async function AdminReportsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reports')
    .select(`
      *,
      reporter:profiles!reporter_id(display_name),
      post:posts(title),
      comment:comments(content)
    `)
    .order('created_at', { ascending: false })
    .range(0, 99);

  if (error) {
    console.error('[AdminReports] Fetch error:', error.message);
  }

  return (
    <AdminReportsClient initialReports={(data as any[]) ?? []} />
  );
}
