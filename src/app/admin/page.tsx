import { createClient } from '@/lib/supabase/server';
import AdminOverviewClient from '@/components/admin/AdminOverviewClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Admin Dashboard - YRU Community',
};

interface Stat {
  title: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
}

interface ActivityItem {
  id: string;
  type: 'post' | 'comment' | 'user' | 'report';
  title: string;
  user: string;
  time: string;
  status?: 'pending' | 'resolved';
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [
    { count: usersCount },
    { count: postsCount },
    { count: commentsCount },
    { count: reportsCount },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('posts').select('*', { count: 'exact', head: true }),
    supabase.from('comments').select('*', { count: 'exact', head: true }),
    supabase.from('reports').select('*', { count: 'exact', head: true }),
  ]);

  const stats: Stat[] = [
    { title: 'ผู้ใช้ทั้งหมด', value: usersCount || 0, change: 0, trend: 'neutral' },
    { title: 'กระทู้ทั้งหมด', value: postsCount || 0, change: 0, trend: 'neutral' },
    { title: 'ความคิดเห็น', value: commentsCount || 0, change: 0, trend: 'neutral' },
    { title: 'แจ้งปัญหารอดำเนินการ', value: reportsCount || 0, change: 0, trend: 'neutral' },
  ];

  const days = 7;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [{ data: recentPosts }, { data: recentComments }, { data: recentReports }] = await Promise.all([
    supabase
      .from('posts')
      .select('id, title, author_id, created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('comments')
      .select('id, post_id, user_id, created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('reports')
      .select('id, reason, reporter_id, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, username');

  const profileMap = new Map(
    profiles?.map((p) => [p.id, p.display_name || p.username || 'ผู้ใช้']) || []
  );

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'เมื่อสักครู่';
    if (diffMins < 60) return `${diffMins} นาที`;
    if (diffHours < 24) return `${diffHours} ชั่วโมง`;
    return `${diffDays} วัน`;
  };

  const activityItems: ActivityItem[] = [];
  
  recentPosts?.forEach((p) => {
    activityItems.push({
      id: `post-${p.id}`,
      type: 'post',
      title: p.title || 'กระทู้ใหม่',
      user: profileMap.get(p.author_id) || 'ผู้ใช้',
      time: getTimeAgo(p.created_at),
    });
  });

  recentComments?.forEach((c) => {
    activityItems.push({
      id: `comment-${c.id}`,
      type: 'comment',
      title: `ความคิดเห็นในกระทู้ #${c.post_id}`,
      user: profileMap.get(c.user_id) || 'ผู้ใช้',
      time: getTimeAgo(c.created_at),
    });
  });

  recentReports?.forEach((r) => {
    activityItems.push({
      id: `report-${r.id}`,
      type: 'report',
      title: r.reason || 'รายงานปัญหา',
      user: profileMap.get(r.reporter_id) || 'ผู้ใช้',
      time: getTimeAgo(r.created_at),
      status: r.status === 'resolved' ? 'resolved' : 'pending',
    });
  });

  activityItems.sort((a, b) => {
    const timeA = parseActivityTime(a.time);
    const timeB = parseActivityTime(b.time);
    return timeA - timeB;
  });

  function parseActivityTime(time: string): number {
    const num = parseInt(time.split(' ')[0]);
    if (time.includes('วัน')) return num * 24 * 60;
    if (time.includes('ชั่วโมง')) return num * 60;
    if (time.includes('นาที')) return num;
    return 0;
  }

  const activityDays: Record<string, { posts: number; comments: number }> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = d.toLocaleDateString('th-TH', { weekday: 'short' });
    activityDays[dayStr] = { posts: 0, comments: 0 };
  }

  recentPosts?.forEach((p) => {
    const dayStr = new Date(p.created_at).toLocaleDateString('th-TH', { weekday: 'short' });
    if (activityDays[dayStr]) activityDays[dayStr].posts++;
  });

  recentComments?.forEach((c) => {
    const dayStr = new Date(c.created_at).toLocaleDateString('th-TH', { weekday: 'short' });
    if (activityDays[dayStr]) activityDays[dayStr].comments++;
  });

  const activityData = Object.keys(activityDays).map((day) => ({
    name: day,
    posts: activityDays[day].posts,
    comments: activityDays[day].comments,
  }));

  const { data: postsCat } = await supabase.from('posts').select('category_id');
  const catCount: Record<number, number> = {};
  postsCat?.forEach((p) => {
    catCount[p.category_id] = (catCount[p.category_id] || 0) + 1;
  });

  const { data: categories } = await supabase.from('categories').select('id, name');
  const catNameMap = new Map(categories?.map((c) => [c.id, c.name]) || []);

  const categoryData = Object.keys(catCount).map((id) => ({
    name: catNameMap.get(Number(id)) || `หมวด ${id}`,
    value: catCount[Number(id)],
  }));

  return (
    <AdminOverviewClient
      stats={stats}
      activityData={activityData}
      categoryData={categoryData}
      recentActivity={activityItems}
      pendingReports={reportsCount || 0}
    />
  );
}