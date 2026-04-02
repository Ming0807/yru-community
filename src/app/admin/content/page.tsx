import { createClient } from '@/lib/supabase/server';
import AdminContentClient from '@/components/admin/AdminContentClient';

export const metadata = { title: 'จัดการเนื้อหา - Admin | YRU Community' };

export default async function AdminContentPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('posts')
    .select('id, title, content_text, is_anonymous, created_at, author:profiles!author_id(display_name), category:categories(name, slug)')
    .order('created_at', { ascending: false })
    .range(0, 99);

  if (error) {
    console.error('[AdminContent] Fetch error:', error.message);
  }

  const { count } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true });

  return (
    <AdminContentClient
      initialPosts={(data as any[]) ?? []}
      totalCount={count ?? 0}
    />
  );
}
