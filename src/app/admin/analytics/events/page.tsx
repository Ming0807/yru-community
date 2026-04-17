'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
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
} from 'recharts';
import {
  Activity,
  Users,
  Eye,
  MousePointerClick,
  Clock,
  Monitor,
  Smartphone,
  Tablet,
  TrendingUp,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

const DEVICE_COLORS = ['#5DADE2', '#E88B9C', '#F4D03F', '#27AE60'];

interface AnalyticsData {
  period: {
    days: number;
    start: string;
    end: string;
  };
  summary: {
    total_events: number;
    unique_sessions: number;
    avg_events_per_session: string;
  };
  event_types: Array<{
    event_type: string;
    total_events: number;
    unique_sessions: number;
  }>;
  ad_performance: Array<{
    ad_id: string;
    position: string;
    impressions: number;
    clicks: number;
    hovers: number;
    ctr: string;
  }>;
  recent_events: Array<{
    id: string;
    event_type: string;
    page_path?: string;
    device_type?: string;
    scroll_depth?: number;
    time_on_page?: number;
    created_at: string;
  }>;
  device_breakdown: Array<{
    device: string;
    count: number;
  }>;
  top_pages: Array<{
    page_path: string;
    page_views: number;
    unique_views: number;
  }>;
}

export default function AdminAnalyticsEventsPage() {
  const [days, setDays] = useState(7);

  const { data, isLoading, error, refetch, isFetching } = useQuery<AnalyticsData>({
    queryKey: ['admin', 'analytics', 'events', days],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/events?days=${days}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-muted-foreground">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
        <p className="text-sm text-muted-foreground">
          ตรวจสอบว่าได้รัน SQL migration สำหรับ user_analytics_events แล้ว
        </p>
      </div>
    );
  }

  const formatNumber = (num: number) => num.toLocaleString();

  const getDeviceIcon = (device: string) => {
    switch (device.toLowerCase()) {
      case 'desktop':
        return <Monitor className="h-4 w-4" />;
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Tablet className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            สถิติพฤติกรรมผู้ใช้ (Event-Driven)
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            วิเคราะห์เหตุการณ์และการโต้ตอบของผู้ใช้อย่างละเอียด
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-card border rounded-xl p-1">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  d === days
                    ? 'bg-[var(--color-yru-pink)] text-white'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {d} วัน
              </button>
            ))}
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-xl border bg-card hover:bg-muted transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="card-shadow border-border/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              เหตุการณ์ทั้งหมด
            </CardTitle>
            <div className="p-2 bg-blue-100 text-blue-600 rounded-full dark:bg-blue-900/30 dark:text-blue-400">
              <Activity className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatNumber(data.summary.total_events)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ในช่วง {days} วันที่ผ่านมา
            </p>
          </CardContent>
        </Card>

        <Card className="card-shadow border-border/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              เซสชันเฉพาะ
            </CardTitle>
            <div className="p-2 bg-green-100 text-green-600 rounded-full dark:bg-green-900/30 dark:text-green-400">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatNumber(data.summary.unique_sessions)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ค่าเฉลี่ย {data.summary.avg_events_per_session} เหตุการณ์/เซสชัน
            </p>
          </CardContent>
        </Card>

        <Card className="card-shadow border-border/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              หน้าที่เข้าชมมากสุด
            </CardTitle>
            <div className="p-2 bg-purple-100 text-purple-600 rounded-full dark:bg-purple-900/30 dark:text-purple-400">
              <Eye className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">
              {data.top_pages[0]?.page_path || '-'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatNumber(data.top_pages[0]?.page_views || 0)} วิว
            </p>
          </CardContent>
        </Card>

        <Card className="card-shadow border-border/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              อัตราการคลิกเฉลี่ย
            </CardTitle>
            <div className="p-2 bg-orange-100 text-orange-600 rounded-full dark:bg-orange-900/30 dark:text-orange-400">
              <MousePointerClick className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {data.ad_performance.length > 0
                ? (
                    data.ad_performance.reduce(
                      (sum, ad) => sum + (parseFloat(ad.ctr) || 0),
                      0
                    ) / data.ad_performance.length
                  ).toFixed(2)
                : '0.00'}
              %
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              จาก {data.ad_performance.length} แคมเปญ
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Event Types Bar Chart */}
        <Card className="card-shadow border-border/40">
          <CardHeader>
            <CardTitle>ประเภทเหตุการณ์</CardTitle>
            <CardDescription>ความถี่ของแต่ละประเภทเหตุการณ์</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {data.event_types.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.event_types.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <YAxis
                      type="category"
                      dataKey="event_type"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11 }}
                      width={120}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid hsl(var(--border))',
                        background: 'hsl(var(--card))',
                      }}
                    />
                    <Bar dataKey="total_events" fill="var(--color-yru-pink)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  ไม่มีข้อมูลเหตุการณ์
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Device Breakdown Pie Chart */}
        <Card className="card-shadow border-border/40">
          <CardHeader>
            <CardTitle>อุปกรณ์ที่ใช้งาน</CardTitle>
            <CardDescription>สัดส่วนประเภทอุปกรณ์ของผู้ใช้</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full flex items-center justify-center">
              {data.device_breakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
<PieChart>
            <Pie
              data={data.device_breakdown}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="count"
              nameKey="device"
              label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}
              labelLine={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
            >
              {data.device_breakdown.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={DEVICE_COLORS[index % DEVICE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid hsl(var(--border))',
                background: 'hsl(var(--card))',
              }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => formatNumber(Number(value))}
            />
          </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  ไม่มีข้อมูลอุปกรณ์
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Pages */}
      <Card className="card-shadow border-border/40">
        <CardHeader>
          <CardTitle>หน้าที่เข้าชมมากที่สุด (Top 10)</CardTitle>
          <CardDescription>พิกัดที่ผู้ใช้เข้าชมบ่อยที่สุดในระบบ</CardDescription>
        </CardHeader>
        <CardContent>
          {data.top_pages.length > 0 ? (
            <div className="space-y-3">
              {data.top_pages.map((page, idx) => (
                <div
                  key={page.page_path}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-muted-foreground w-6">
                      {idx + 1}
                    </span>
                    <span className="font-medium truncate max-w-md">{page.page_path}</span>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-right">
                      <span className="font-semibold">{formatNumber(page.page_views)}</span>
                      <span className="text-muted-foreground ml-1">วิว</span>
                    </div>
                    <div className="text-right min-w-[80px]">
                      <span className="text-muted-foreground">{formatNumber(page.unique_views)}</span>
                      <span className="text-muted-foreground ml-1 text-xs">เฉพาะ</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              ไม่มีข้อมูลการเข้าชม
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ad Performance */}
      <Card className="card-shadow border-border/40">
        <CardHeader>
          <CardTitle>ประสิทธิภาพโฆษณา</CardTitle>
          <CardDescription>สถิติการแสดงและการคลิกโฆษณา</CardDescription>
        </CardHeader>
        <CardContent>
          {data.ad_performance.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-xs text-muted-foreground uppercase">
                    <th className="text-left py-3 px-4">แคมเปญ</th>
                    <th className="text-center py-3 px-4">ตำแหน่ง</th>
                    <th className="text-center py-3 px-4">เห็น (Impressions)</th>
                    <th className="text-center py-3 px-4">คลิก (Clicks)</th>
                    <th className="text-center py-3 px-4">Hover</th>
                    <th className="text-center py-3 px-4">CTR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {data.ad_performance.map((ad) => (
                    <tr key={ad.ad_id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-medium">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            ad.impressions > 100 ? 'bg-green-500' :
                            ad.impressions > 50 ? 'bg-yellow-500' : 'bg-gray-400'
                          }`} />
                          {ad.ad_id.slice(0, 8)}...
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-1 bg-muted rounded-md text-xs">
                          {ad.position || 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">{formatNumber(ad.impressions)}</td>
                      <td className="py-3 px-4 text-center text-[var(--color-yru-pink)] font-semibold">
                        {formatNumber(ad.clicks)}
                      </td>
                      <td className="py-3 px-4 text-center text-muted-foreground">
                        {formatNumber(ad.hovers)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="font-bold">{ad.ctr}%</span>
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[var(--color-yru-pink)] to-[var(--color-yru-green)] rounded-full"
                              style={{ width: `${Math.min(parseFloat(ad.ctr) * 10, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              ไม่มีข้อมูลการแสดงโฆษณา
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Events */}
      <Card className="card-shadow border-border/40">
        <CardHeader>
          <CardTitle>เหตุการณ์ล่าสุด</CardTitle>
          <CardDescription>ดูรายละเอียดเหตุการณ์ที่เกิดขึ้นล่าสุดในระบบ</CardDescription>
        </CardHeader>
        <CardContent>
          {data.recent_events.length > 0 ? (
            <div className="space-y-2">
              {data.recent_events.map((event, idx) => (
                <div
                  key={`${event.id}-${idx}`}
                  className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors"
                >
                  <div className="w-2 h-2 mt-2 rounded-full bg-[var(--color-yru-pink)] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{event.event_type}</span>
                      {event.page_path && (
                        <span className="text-xs text-muted-foreground truncate">
                          {event.page_path}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {event.device_type && (
                        <span className="flex items-center gap-1">
                          {getDeviceIcon(event.device_type)}
                          {event.device_type}
                        </span>
                      )}
                      {event.scroll_depth && (
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {event.scroll_depth}% scroll
                        </span>
                      )}
                      {event.time_on_page && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {event.time_on_page}s on page
                        </span>
                      )}
                      <span className="ml-auto">
                        {new Date(event.created_at).toLocaleTimeString('th-TH', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              ไม่มีเหตุการณ์ล่าสุด
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}