'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, BarChart3, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  RevenueOverviewCards,
  RevenueLineChart,
  RevenueByTierChart,
  TopCampaignsTable,
  DateRangeSelector,
} from '@/components/admin/revenue';
import type { RevenueStats, DateRangePreset } from '@/types/advertising';

export default function RevenueDashboardPage() {
  const [dateRange, setDateRange] = useState<DateRangePreset>('30d');

  const { data, isLoading, isError, refetch, isFetching } = useQuery<RevenueStats>({
    queryKey: ['admin', 'revenue', dateRange],
    queryFn: async () => {
      const res = await fetch(`/api/admin/revenue?range=${dateRange}`);
      if (!res.ok) throw new Error('Failed to fetch revenue data');
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
          <BarChart3 className="h-8 w-8 text-red-500" />
        </div>
        <h3 className="font-semibold text-lg mb-2">ไม่สามารถโหลดข้อมูลรายได้</h3>
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
            <BarChart3 className="h-7 w-7 text-[var(--color-yru-pink)]" />
            รายงานรายได้
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            ภาพรวมรายได้และประสิทธิภาพโฆษณา
          </p>
        </div>

        <div className="flex items-center gap-3">
          <DateRangeSelector value={dateRange} onChange={setDateRange} />
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
      <RevenueOverviewCards
        overview={data.overview}
        comparison={data.periodComparison}
      />

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RevenueLineChart
          data={data.daily}
          title="รายได้รายวัน"
          showClicks={true}
        />
        <RevenueByTierChart
          data={data.byTier}
          title="รายได้ตามระดับแพ็กเกจ"
        />
      </div>

      {/* Additional Charts */}
      {data.byPosition.length > 0 && (
        <RevenueLineChart
          data={data.daily}
          title="ยอดแสดงผลและคลิก"
          showImpressions={true}
          showCtr={true}
        />
      )}

      {/* Top Campaigns */}
      <TopCampaignsTable data={data.topCampaigns} />

      {/* Export Section */}
      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" className="rounded-xl gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
        <Button className="rounded-xl gap-2 bg-[var(--color-yru-pink)] hover:bg-[var(--color-yru-pink-dark)] text-white">
          <Download className="h-4 w-4" />
          Export PDF Report
        </Button>
      </div>
    </div>
  );
}