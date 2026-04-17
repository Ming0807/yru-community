import { getAdminClient } from '@/lib/supabase/admin';
import AdminAdsClient from '@/components/admin/AdminAdsClient';

export const metadata = { title: 'จัดการโฆษณา - Admin | YRU Community' };

export default async function AdminAdsPage() {
  const adminClient = getAdminClient();

  // Optimized fetch using the ads_with_campaigns view
  // and performance summary to get real-time stats without heavy JS computation
  const { data, error } = await adminClient
    .from('ads_with_campaigns')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[AdminAds] Fetch error:', error.message);
  }

  return (
    <div className="p-6">
      <AdminAdsClient initialAds={(data as any[]) ?? []} />
    </div>
  );
}
