import { createClient } from '@/lib/supabase/server';
import AdminAnalyticsClient from '@/components/admin/AdminAnalyticsClient';

export const metadata = { title: 'สถิติพฤติกรรมผู้ใช้ - Admin | YRU Community' };

export default async function AdminAnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days: daysParam } = await searchParams;
  const days = parseInt(daysParam || '7');
  const supabase = await createClient();

  // 1. Fetch High Level Stats
  const [
    { count: usersCount },
    { count: postsCount },
    { data: adsData }
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('posts').select('*', { count: 'exact', head: true }),
    supabase.from('ads').select('impressions, clicks')
  ]);

  let totalImp = 0;
  let totalClicks = 0;
  adsData?.forEach((ad: { impressions: number; clicks: number }) => {
    totalImp += ad.impressions || 0;
    totalClicks += ad.clicks || 0;
  });
  const avgCtr = totalImp > 0 ? ((totalClicks / totalImp) * 100).toFixed(2) : 0;

  const stats = {
    totalUsers: usersCount || 0,
    totalPosts: postsCount || 0,
    totalAdsCTR: Number(avgCtr),
  };

  // 2. Activity Data for selected date range
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: recentPosts } = await supabase
    .from('posts')
    .select('created_at')
    .gte('created_at', startDate.toISOString());

  const { data: recentComments } = await supabase
    .from('comments')
    .select('created_at')
    .gte('created_at', startDate.toISOString());

  const daysTemp: Record<string, { posts: number; comments: number }> = {};
  
  // Initialize days
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = d.toLocaleDateString('th-TH', { weekday: 'short' });
    daysTemp[dayStr] = { posts: 0, comments: 0 };
  }

  recentPosts?.forEach((p: { created_at: string }) => {
    const dayStr = new Date(p.created_at).toLocaleDateString('th-TH', { weekday: 'short' });
    if (daysTemp[dayStr]) daysTemp[dayStr].posts++;
  });
  
  recentComments?.forEach((c: { created_at: string }) => {
    const dayStr = new Date(c.created_at).toLocaleDateString('th-TH', { weekday: 'short' });
    if (daysTemp[dayStr]) daysTemp[dayStr].comments++;
  });

  const activityData = Object.keys(daysTemp).map(day => ({
    name: day,
    การตอบกลับ: daysTemp[day].comments,
    กระทู้ใหม่: daysTemp[day].posts,
  }));

  // 3. Category Distribution — fetch real category names from DB
  const { data: postsCat } = await supabase.from('posts').select('category_id');
  const catCount: Record<number, number> = {};
  postsCat?.forEach((p: { category_id: number }) => {
    catCount[p.category_id] = (catCount[p.category_id] || 0) + 1;
  });
  
  // Fetch real category names instead of hardcoding
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name');
  
  const catNameMap: Record<number, string> = {};
  categories?.forEach((c: { id: number; name: string }) => {
    catNameMap[c.id] = c.name;
  });
  
  const categoryData = Object.keys(catCount).map(id => ({
    name: catNameMap[Number(id)] || `หมวด ${id}`,
    value: catCount[Number(id)]
  }));

  // 4. Ad Performance
  const { data: adsPerf } = await supabase
    .from('ads')
    .select('id, campaign_name, impressions, clicks, is_active, image_url, target_tags')
    .order('impressions', { ascending: false })
    .limit(5);

  const adPerformanceData = adsPerf?.map((ad) => {
    const ctr = ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(2) : '0.00';
    return {
      id: ad.id,
      name: ad.campaign_name,
      CTR: Number(ctr),
      Impressions: ad.impressions,
      Clicks: ad.clicks,
      isActive: ad.is_active,
      imageUrl: ad.image_url,
      targetTags: ad.target_tags || []
    };
  }) || [];

  return (
    <AdminAnalyticsClient 
      stats={stats}
      activityData={activityData}
      categoryData={categoryData}
      adPerformanceData={adPerformanceData}
      days={days}
    />
  );
}
