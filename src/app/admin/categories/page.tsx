import { createClient } from '@/lib/supabase/server';
import AdminCategoriesClient from '@/components/admin/AdminCategoriesClient';

export const metadata = { title: 'จัดการหมวดหมู่ - Admin | YRU Community' };

export default async function AdminCategoriesPage() {
  const supabase = await createClient();

  const { data: categories, error } = await supabase
    .from('categories')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.error('[AdminCategories] Fetch error:', error.message);
  }

  return (
    <AdminCategoriesClient initialCategories={(categories as any[]) ?? []} />
  );
}
