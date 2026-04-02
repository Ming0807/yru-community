import { createClient } from '@/lib/supabase/server';
import AdminAdsClient from '@/components/admin/AdminAdsClient';

export const metadata = { title: 'จัดการโฆษณา - Admin | YRU Community' };

export default async function AdminAdsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('ads')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[AdminAds] Fetch error:', error.message);
  }

  return (
    <AdminAdsClient initialAds={(data as any[]) ?? []} />
  );
}
