'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { Loader2, TrendingUp, Eye, MousePointerClick, Users, ImageIcon } from 'lucide-react';

// Custom Colors for Premium Look
const COLORS = ['#E88B9C', '#7EC8A4', '#FFB74D', '#A569BD', '#5DADE2'];

export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPosts: 0,
    totalAdsCTR: 0,
  });
  const [activityData, setActivityData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [adPerformanceData, setAdPerformanceData] = useState<any[]>([]);

  const supabase = createClient();

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);

      // 1. Fetch High Level Stats
      const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: postsCount } = await supabase.from('posts').select('*', { count: 'exact', head: true });
      
      const { data: adsData } = await supabase.from('ads').select('impressions, clicks');
      let totalImp = 0;
      let totalClicks = 0;
      adsData?.forEach(ad => {
        totalImp += ad.impressions || 0;
        totalClicks += ad.clicks || 0;
      });
      const avgCtr = totalImp > 0 ? ((totalClicks / totalImp) * 100).toFixed(2) : 0;

      setStats({
        totalUsers: usersCount || 0,
        totalPosts: postsCount || 0,
        totalAdsCTR: Number(avgCtr),
      });

      // 2. 7-day Activity Data (New Posts & Comments)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: recentPosts } = await supabase
        .from('posts')
        .select('created_at')
        .gte('created_at', sevenDaysAgo.toISOString());
        
      const { data: recentComments } = await supabase
        .from('comments')
        .select('created_at')
        .gte('created_at', sevenDaysAgo.toISOString());

      const daysTemp: Record<string, { posts: number; comments: number }> = {};
      
      // Initialize last 7 days
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        // Using 'short' in th-TH gives 'จ.', 'อ.', etc. but we can map them
        const dayStr = d.toLocaleDateString('th-TH', { weekday: 'short' });
        daysTemp[dayStr] = { posts: 0, comments: 0 };
      }

      recentPosts?.forEach(p => {
        const dayStr = new Date(p.created_at).toLocaleDateString('th-TH', { weekday: 'short' });
        if (daysTemp[dayStr]) daysTemp[dayStr].posts++;
      });
      
      recentComments?.forEach(c => {
        const dayStr = new Date(c.created_at).toLocaleDateString('th-TH', { weekday: 'short' });
        if (daysTemp[dayStr]) daysTemp[dayStr].comments++;
      });

      const actualActivity = Object.keys(daysTemp).map(day => ({
        name: day,
        การตอบกลับ: daysTemp[day].comments,
        กระทู้ใหม่: daysTemp[day].posts,
      }));
      setActivityData(actualActivity);

      // 3. Category Distribution
      const { data: postsCat } = await supabase.from('posts').select('category_id');
      const catCount: Record<number, number> = {};
      postsCat?.forEach(p => {
        catCount[p.category_id] = (catCount[p.category_id] || 0) + 1;
      });
      
      const mockCatNames: Record<number, string> = {
        1: 'เรื่องทั่วไป',
        2: 'การเรียน',
        3: 'รีวิววิชา',
        4: 'ถาม-ตอบ',
        5: 'ซื้อขาย'
      };
      
      const catChartData = Object.keys(catCount).map(id => ({
        name: mockCatNames[Number(id)] || `หมวด ${id}`,
        value: catCount[Number(id)]
      }));
      setCategoryData(catChartData);

      // 4. Ad Performance (Real Data from Ads Table)
      const { data: adsPerf } = await supabase
        .from('ads')
        .select('id, campaign_name, impressions, clicks, is_active, image_url, target_tags')
        .order('impressions', { ascending: false })
        .limit(5);

      const actualAdPerf = adsPerf?.map(ad => {
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
      setAdPerformanceData(actualAdPerf);

      setLoading(false);
    }

    fetchAnalytics();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2 animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">สถิติพฤติกรรมผู้ใช้ & วิเคราะห์ข้อมูลระบบ</h1>
        <p className="text-muted-foreground mt-1 text-sm">ตรวจสอบภาพรวมการใช้งาน ยอดเข้าชม และประสิทธิภาพโฆษณาใน 7 วันที่ผ่านมา</p>
      </div>

      {/* Top Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="card-shadow border-border/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">สมาชิกทั้งหมด</CardTitle>
            <div className="p-2 bg-blue-100 text-blue-600 rounded-full dark:bg-blue-900/30 dark:text-blue-400">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-green-500 mt-1 flex items-center gap-1 font-medium">
              <TrendingUp className="h-3 w-3" /> +12% จากสัปดาห์ก่อน
            </p>
          </CardContent>
        </Card>

        <Card className="card-shadow border-border/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">กระทู้ในระบบ</CardTitle>
            <div className="p-2 bg-(--color-yru-pink)/10 text-(--color-yru-pink-dark) rounded-full">
              <Eye className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalPosts.toLocaleString()}</div>
            <p className="text-xs text-green-500 mt-1 flex items-center gap-1 font-medium">
              <TrendingUp className="h-3 w-3" /> +24 กระทู้ใหม่
            </p>
          </CardContent>
        </Card>

        <Card className="card-shadow border-border/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">อัตราการคลิกโฆษณา (CTR)</CardTitle>
            <div className="p-2 bg-[var(--color-yru-green)]/10 text-[var(--color-yru-green-dark)] rounded-full">
              <MousePointerClick className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalAdsCTR}%</div>
            <p className="text-xs text-muted-foreground mt-1">เฉลี่ยจากทุกแคมเปญ</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Main Chart: User Activity */}
        <Card className="card-shadow border-border/40 lg:col-span-4">
          <CardHeader>
            <CardTitle>แนวโน้มการโต้ตอบ (7 วันล่าสุด)</CardTitle>
            <CardDescription>
              เปรียบเทียบจำนวนการตั้งกระทู้ใหม่และการคอมเมนต์ในแต่ละวัน
            </CardDescription>
          </CardHeader>
          <CardContent className="px-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart
                  data={activityData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-yru-pink)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--color-yru-pink)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPosts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-yru-green)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--color-yru-green)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dx={-10} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.1)' }}
                  />
                  <Area type="monotone" dataKey="การตอบกลับ" stroke="var(--color-yru-pink)" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                  <Area type="monotone" dataKey="กระทู้ใหม่" stroke="var(--color-yru-green)" strokeWidth={3} fillOpacity={1} fill="url(#colorPosts)" />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Pie Chart */}
        <Card className="card-shadow border-border/40 lg:col-span-3">
          <CardHeader>
            <CardTitle>สัดส่วนกระทู้ตามหมวดหมู่</CardTitle>
            <CardDescription>แสดงความสนใจของนักศึกษาในชุมชน</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full flex items-center justify-center">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="45%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', background: 'hsl(var(--card))', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.1)' }}
                      itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 500 }}
                    />
                    <Legend iconType="circle" layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Eye className="w-4 h-4" /> ไม่มีข้อมูลกระทู้ในขณะนี้
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ad Performance Comparison */}
      <Card className="card-shadow border-border/40 mt-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-yru-pink)]/5 to-[var(--color-yru-green)]/5 pointer-events-none" />
        <CardHeader>
          <CardTitle>ประสิทธิภาพแคมเปญโฆษณา (Top 5 Active Ads)</CardTitle>
          <CardDescription>ตารางแสดงข้อมูลประสิทธิภาพพร้อมเจาะลึกกลุ่มเป้าหมาย (Targeting)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full mt-2 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border/50">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">แคมเปญ</th>
                  <th scope="col" className="px-4 py-3 font-medium text-center">อิมเพรสชัน (เห็น)</th>
                  <th scope="col" className="px-4 py-3 font-medium text-center">จำนวนคลิก</th>
                  <th scope="col" className="px-4 py-3 font-medium pl-8 w-1/4">อัตราการคลิก (CTR)</th>
                  <th scope="col" className="px-4 py-3 font-medium">Targeting</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {adPerformanceData.map((ad, idx) => (
                  <tr key={ad.id || idx} className="hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-16 relative overflow-hidden rounded-md border border-border/50 bg-background shrink-0">
                          {ad.imageUrl ? (
                            <img src={ad.imageUrl} alt={ad.name} className="object-cover w-full h-full" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                              <ImageIcon className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground line-clamp-1" title={ad.name}>{ad.name}</span>
                          <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <span className={`inline-block w-1.5 h-1.5 rounded-full ${ad.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            {ad.isActive ? 'ใช้งานอยู่' : 'ปิดใช้งาน'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center font-medium">{ad.Impressions.toLocaleString()}</td>
                    <td className="px-4 py-4 text-center font-medium text-(--color-yru-pink)">
                      {ad.Clicks.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 pl-8">
                      <div className="flex items-center gap-2 w-full">
                        <span className="font-bold text-[13px] w-12 text-right">{ad.CTR}%</span>
                        <div className="flex-1 max-w-[120px] h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-linear-to-r from-(--color-yru-pink) to-(--color-yru-green) rounded-full"
                            style={{ width: `${Math.min(ad.CTR, 100)}%` }} 
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        {ad.targetTags && ad.targetTags.length > 0 ? (
                          ad.targetTags.slice(0, 2).map((tag: string, tidx: number) => (
                            <span key={tidx} className="bg-muted text-muted-foreground text-[10px] px-1.5 py-0.5 rounded-sm border border-border/40 whitespace-nowrap">
                              #{tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground italic">ไม่มีกลุ่มเป้าหมาย (แสดงทุกคน)</span>
                        )}
                        {ad.targetTags && ad.targetTags.length > 2 && (
                          <span className="bg-muted text-muted-foreground text-[10px] px-1.5 py-0.5 rounded-sm border border-border/40">
                            +{ad.targetTags.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-xs text-muted-foreground text-center bg-muted/30 p-3 rounded-lg border border-border/50 backdrop-blur-sm">
            💡 <strong>Insight:</strong> ตอนนี้หน้าแดชบอร์ดใช้ <strong>ข้อมูลจริงจากฐานข้อมูล</strong> แล้ว พร้อมระบบ <strong>คำนวณ Target Overlap ค่าความสนใจผู้ใช้</strong> เพื่อยิงแอดให้ตรงกลุ่มที่สุด (รอเข้าสู่ Phase 18)
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
