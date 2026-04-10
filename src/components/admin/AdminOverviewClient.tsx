'use client';

import { useState } from 'react';
import {
  StatCards,
  ActivityChart,
  CategoryDistribution,
  RecentActivity,
  QuickActions,
  ReportsAlert,
} from './overview';
import type { OverviewData } from './overview/types';

interface Props extends OverviewData {}

function OverviewHeader() {
  const [period, setPeriod] = useState(7);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">ภาพรวมระบบ</h1>
        <p className="text-sm text-muted-foreground mt-1">
          ดูสถิติและสถานะปัจจุบันของแพลตฟอร์ม YRU Community
        </p>
      </div>
      <div className="flex items-center">
        <select
          value={period}
          onChange={(e) => setPeriod(Number(e.target.value))}
          className="h-10 rounded-xl border border-border/60 bg-background/50 backdrop-blur-sm px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-yru-pink)] transition-all cursor-pointer hover:bg-muted shadow-sm"
        >
          <option value={7}>สัปดาห์ล่าสุด (7 วัน)</option>
          <option value={30}>เดือนล่าสุด (30 วัน)</option>
          <option value={90}>ไตรมาสล่าสุด (90 วัน)</option>
        </select>
      </div>
    </div>
  );
}

export default function AdminOverviewClient({
  stats,
  activityData,
  categoryData,
  recentActivity,
  pendingReports,
}: Props) {
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <OverviewHeader />
      
      {/* ส่วนที่ 1: การ์ดสถิติ */}
      <StatCards stats={stats} />
      
      {/* ส่วนที่ 2: กราฟ (7 คอลัมน์) */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4 sm:gap-6 w-full min-w-0">
        {/* 🟢 แก้ปัญหา UI พังตรงนี้: ใส่ lg:col-span-4 บังคับให้กราฟกินพื้นที่ 4 ส่วน */}
        <div className="lg:col-span-4 min-w-0 w-full">
          <ActivityChart data={activityData} />
        </div>
        
        <div className="lg:col-span-3 flex flex-col gap-4 sm:gap-6 min-w-0 w-full">
          <ReportsAlert count={pendingReports} />
          <CategoryDistribution data={categoryData} />
        </div>
      </div>
      
      {/* ส่วนที่ 3: กิจกรรมล่าสุด และ ทางลัด (3 คอลัมน์) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 w-full min-w-0">
        {/* 🟢 เพิ่ม min-w-0 เพื่อป้องกัน Layout ระเบิด */}
        <div className="lg:col-span-2 min-w-0 w-full">
          <RecentActivity items={recentActivity} />
        </div>
        <div className="lg:col-span-1 min-w-0 w-full">
          <QuickActions />
        </div>
      </div>
    </div>
  );
}