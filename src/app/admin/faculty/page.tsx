'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Users, BarChart3, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  FacultyOverviewCards,
  FacultyBarChart,
  FacultyTable,
} from '@/components/admin/faculty';
import type { FacultyOverview } from '@/types/advertising';

type MetricKey = 'userCount' | 'activeUsers' | 'postCount' | 'adRevenue';

const metricOptions: { value: MetricKey; label: string }[] = [
  { value: 'activeUsers', label: 'Active Users (30 วัน)' },
  { value: 'userCount', label: 'ผู้ใช้ทั้งหมด' },
  { value: 'postCount', label: 'จำนวนโพสต์' },
  { value: 'adRevenue', label: 'รายได้โฆษณา' },
];

export default function FacultyAnalyticsPage() {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('activeUsers');

  const { data, isLoading, isError, refetch, isFetching } = useQuery<FacultyOverview>({
    queryKey: ['admin', 'faculty-analytics'],
    queryFn: async () => {
      const res = await fetch('/api/admin/faculty');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="p-4 bg-red-500/10 rounded-full mb-4">
          <Users className="h-8 w-8 text-red-500" />
        </div>
        <h3 className="font-semibold text-lg mb-2">ไม่สามารถโหลดข้อมูลคณะ</h3>
        <p className="text-muted-foreground text-sm mb-4">
          กรุณาลองใหม่อีกครั้ง
        </p>
        <Button onClick={() => refetch()} variant="outline" className="rounded-xl gap-2">
          <RefreshCw className="h-4 w-4" />
          ลองใหม่
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Users className="h-7 w-7 text-[var(--color-yru-pink)]" />
            วิเคราะห์ตามคณะ
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            ภาพรวมกิจกรรมและประสิทธิภาพโฆษณาตามคณะที่ศึกษา
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value as MetricKey)}
            className="h-10 rounded-xl border border-input bg-background px-3 py-2 text-sm"
          >
            {metricOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-xl"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <FacultyOverviewCards data={data} />

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <FacultyBarChart
          data={data.faculties}
          metric={selectedMetric}
          title="กราฟเปรียบเทียบตามคณะ"
        />
        <FacultyBarChart
          data={data.faculties}
          metric="adRevenue"
          title="รายได้โฆษณาตามคณะ"
        />
      </div>

      {/* Detail Table */}
      <FacultyTable data={data.faculties} />

      {/* Insights */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="p-4 rounded-xl bg-gradient-to-br from-[var(--color-yru-pink)]/5 to-[var(--color-yru-pink)]/10 border border-[var(--color-yru-pink)]/20">
          <h3 className="font-semibold text-foreground mb-2">คณะที่มีศักยภาพสูงสุดสำหรับ Faculty Targeting</h3>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-[var(--color-yru-pink)]">{data.mostActiveFaculty}</span> มีผู้ใช้ active
            มากที่สุด ซึ่งเป็นกลุ่มเป้าหมายที่ดีสำหรับการยิงโฆษณา
          </p>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-[var(--color-yru-green)]/5 to-[var(--color-yru-green)]/10 border border-[var(--color-yru-green)]/20">
          <h3 className="font-semibold text-foreground mb-2">คณะที่ตอบรับโฆษณาดีที่สุด</h3>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-[var(--color-yru-green-dark)]">{data.topConvertingFaculty}</span> มีอัตรา
            การคลิกโฆษณาสูงสุด ควรพิจารณาจัดสรรงบโฆษณาเพิ่มในคณะนี้
          </p>
        </div>
      </div>
    </div>
  );
}