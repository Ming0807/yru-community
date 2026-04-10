import { createClient } from '@/lib/supabase/server';
import { AdminContentTable } from '@/components/admin/tables/AdminContentTable';

export const metadata = { title: 'จัดการเนื้อหา - Admin | YRU Community' };

export default async function AdminContentPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('posts')
    .select('id, title, is_pinned, is_locked, created_at, category_id, category:categories(name)')
    .order('created_at', { ascending: false })
    .range(0, 99);

  if (error) {
    console.error('[AdminContent] Fetch error:', error.message);
  }

  return (
    <AdminContentTable
      initialPosts={(data as any[]) ?? []}
    />
  );
}
