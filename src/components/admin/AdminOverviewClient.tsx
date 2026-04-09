'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AreaChart,
  Area,
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
import {
  Users,
  FileText,
  MessageSquare,
  Flag,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  Eye,
  Settings
} from 'lucide-react';

const COLORS = ['#E88B9C', '#7EC8A4', '#FFB74D', '#A569BD', '#5DADE2'];

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

interface Props {
  stats: Stat[];
  activityData: { name: string; posts: number; comments: number }[];
  categoryData: { name: string; value: number }[];
  recentActivity: ActivityItem[];
  pendingReports: number;
}

export default function AdminOverviewClient({
  stats,
  activityData,
  categoryData,
  recentActivity,
  pendingReports,
}: Props) {
  const [period, setPeriod] = useState(7);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'post':
        return <FileText className="h-4 w-4 text-green-500" />;
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-purple-500" />;
      case 'user':
        return <Users className="h-4 w-4 text-blue-500" />;
      case 'report':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const statConfig = [
    {
      title: 'ผู้ใช้ทั้งหมด',
      key: 'users',
      icon: Users,
      color: 'bg-blue-500/10 border-blue-200 dark:border-blue-900',
      iconColor: 'text-blue-500',
    },
    {
      title: 'กระทู้ทั้งหมด',
      key: 'posts',
      icon: FileText,
      color: 'bg-green-500/10 border-green-200 dark:border-green-900',
      iconColor: 'text-green-500',
    },
    {
      title: 'ความคิดเห็น',
      key: 'comments',
      icon: MessageSquare,
      color: 'bg-purple-500/10 border-purple-200 dark:border-purple-900',
      iconColor: 'text-purple-500',
    },
    {
      title: 'แจ้งปัญหารอ处理',
      key: 'reports',
      icon: Flag,
      color: 'bg-red-500/10 border-red-200 dark:border-red-900',
      iconColor: 'text-red-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">ภาพรวมระบบ</h1>
            <p className="text-muted-foreground">
              ดูสถิติและสถานะปัจจุบันของแพลตฟอร์ม YRU Community
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(Number(e.target.value))}
              className="h-9 rounded-lg border border-border/60 bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-yru-pink)]"
            >
              <option value={7}>7 วัน</option>
              <option value={30}>30 วัน</option>
              <option value={90}>90 วัน</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statConfig.map((config) => {
          const stat = stats.find((s) => s.title === config.title);
          const Icon = config.icon;
          return (
            <Link
              key={config.key}
              href={`/admin/${config.key === 'reports' ? 'reports' : config.key}`}
              className={`group rounded-2xl border p-5 flex flex-col gap-3 transition-all hover:shadow-md hover:-translate-y-0.5 ${config.color} cursor-pointer`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  {config.title}
                </span>
                <div className={`p-1.5 rounded-lg ${config.iconColor} bg-background/50`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div className="text-3xl font-bold">
                  {stat?.value.toLocaleString() || 0}
                </div>
                {stat && stat.trend !== 'neutral' && (
                  <div
                    className={`flex items-center gap-1 text-xs font-medium ${
                      stat.trend === 'up' ? 'text-green-500' : 'text-red-500'
                    }`}
                  >
                    {stat.trend === 'up' ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {Math.abs(stat.change)}%
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Activity Chart */}
        <div className="col-span-4 rounded-2xl border border-border/60 bg-background p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-lg">กิจกรรมในระบบ</h2>
              <p className="text-sm text-muted-foreground">แนวโน้มการตั้งกระทู้และคอมเมนต์</p>
            </div>
            <Link
              href="/admin/analytics"
              className="text-sm text-muted-foreground hover:text-[var(--color-yru-pink)] flex items-center gap-1 transition-colors"
            >
              ดูเพิ่มเติม
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart
                data={activityData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorPostsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7EC8A4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7EC8A4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCommentsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E88B9C" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#E88B9C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid hsl(var(--border))',
                    background: 'hsl(var(--card))',
                    boxShadow: '0 4px 20px -2px rgba(0,0,0,0.1)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="posts"
                  stroke="#7EC8A4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorPostsGrad)"
                  name="กระทู้ใหม่"
                />
                <Area
                  type="monotone"
                  dataKey="comments"
                  stroke="#E88B9C"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCommentsGrad)"
                  name="คอมเมนต์"
                />
                <Legend
                  verticalAlign="top"
                  height={28}
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span className="text-xs text-muted-foreground">{value}</span>
                  )}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column */}
        <div className="col-span-3 flex flex-col gap-4">
          {/* Reports Alert */}
          <div className="rounded-2xl border border-border/60 bg-background p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-lg">รายงานที่ต้องตรวจสอบ</h2>
              <Link
                href="/admin/reports"
                className="text-xs text-muted-foreground hover:text-[var(--color-yru-pink)] flex items-center gap-1 transition-colors"
              >
                ดูทั้งหมด
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {pendingReports === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mb-3 text-green-500 opacity-50" />
                <p className="font-medium">ไม่มีรายงานรอตรวจสอบ</p>
                <p className="text-sm mt-1">ทุกอย่างเรียบร้อยดี</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-6 w-6 text-red-500" />
                  <span className="text-4xl font-bold text-red-500">
                    {pendingReports}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  รายงานที่รอการดำเนินการ
                </p>
                <Link
                  href="/admin/reports"
                  className="w-full py-2.5 px-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium text-center transition-colors flex items-center justify-center gap-2"
                >
                  <Flag className="h-4 w-4" />
                  ตรวจสอบทันที
                </Link>
              </div>
            )}
          </div>

          {/* Category Distribution */}
          <div className="flex-1 rounded-2xl border border-border/60 bg-background p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-lg">สัดส่วนหมวดหมู่</h2>
              <Link
                href="/admin/categories"
                className="text-xs text-muted-foreground hover:text-[var(--color-yru-pink)] flex items-center gap-1 transition-colors"
              >
                จัดการ
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="h-[160px] w-full">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={60}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {categoryData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: 'none',
                        background: 'hsl(var(--card))',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={24}
                      iconType="circle"
                      iconSize={6}
                      formatter={(value) => (
                        <span className="text-[10px] text-muted-foreground truncate">
                          {value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>ยังไม่มีข้อมูล</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent Activity */}
        <div className="col-span-2 rounded-2xl border border-border/60 bg-background p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">กิจกรรมล่าสุด</h2>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
              วันนี้
            </span>
          </div>
          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mb-2 opacity-30" />
                <p>ไม่มีกิจกรรมล่าสุด</p>
              </div>
            ) : (
              recentActivity.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors"
                >
                  <div className="mt-0.5">{getActivityIcon(item.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.user} · {item.time}
                    </p>
                  </div>
                  {item.status && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        item.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      }`}
                    >
                      {item.status === 'pending' ? 'รอดำเนินการ' : 'แก้ไขแล้ว'}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="col-span-1 rounded-2xl border border-border/60 bg-background p-5">
          <h2 className="font-semibold text-lg mb-4">ลัดเข้าถึง</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/admin/users"
              className="flex flex-col items-center justify-center p-4 rounded-xl border border-border/60 hover:bg-muted hover:border-[var(--color-yru-pink)]/50 transition-all group"
            >
              <Users className="h-6 w-6 mb-2 text-blue-500 group-hover:text-[var(--color-yru-pink)] transition-colors" />
              <span className="text-xs font-medium">ผู้ใช้</span>
            </Link>
            <Link
              href="/admin/content"
              className="flex flex-col items-center justify-center p-4 rounded-xl border border-border/60 hover:bg-muted hover:border-[var(--color-yru-pink)]/50 transition-all group"
            >
              <FileText className="h-6 w-6 mb-2 text-green-500 group-hover:text-[var(--color-yru-pink)] transition-colors" />
              <span className="text-xs font-medium">เนื้อหา</span>
            </Link>
            <Link
              href="/admin/categories"
              className="flex flex-col items-center justify-center p-4 rounded-xl border border-border/60 hover:bg-muted hover:border-[var(--color-yru-pink)]/50 transition-all group"
            >
              <Settings className="h-6 w-6 mb-2 text-orange-500 group-hover:text-[var(--color-yru-pink)] transition-colors" />
              <span className="text-xs font-medium">หมวดหมู่</span>
            </Link>
            <Link
              href="/admin/analytics"
              className="flex flex-col items-center justify-center p-4 rounded-xl border border-border/60 hover:bg-muted hover:border-[var(--color-yru-pink)]/50 transition-all group"
            >
              <Eye className="h-6 w-6 mb-2 text-purple-500 group-hover:text-[var(--color-yru-pink)] transition-colors" />
              <span className="text-xs font-medium">สถิติ</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}