'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CohortTable } from '@/components/admin/analytics';
import { RefreshCw, Users, TrendingUp, Calendar } from 'lucide-react';
import type { CohortAnalysis } from '@/types/analytics/segments';

export default function CohortsPage() {
  const [cohortType, setCohortType] = useState<'weekly' | 'monthly' | 'daily'>('weekly');
  const [weeks, setWeeks] = useState('8');

  const { data, isLoading, error, refetch } = useQuery<CohortAnalysis>({
    queryKey: ['admin', 'analytics', 'cohorts', cohortType, weeks],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/cohorts?type=${cohortType}&weeks=${weeks}`);
      if (!res.ok) throw new Error('Failed to fetch cohorts');
      return res.json();
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cohort Analysis</h1>
          <p className="text-muted-foreground">
            วิเคราะห์พฤติกรรมผู้ใช้ตามกลุ่ม (Cohort) ตามช่วงเวลา
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <Select value={cohortType} onValueChange={(v) => setCohortType(v as typeof cohortType)}>
          <SelectTrigger className="w-[140px] h-10 rounded-xl">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly">รายสัปดาห์</SelectItem>
            <SelectItem value="monthly">รายเดือน</SelectItem>
            <SelectItem value="daily">รายวัน</SelectItem>
          </SelectContent>
        </Select>

        <Select value={weeks} onValueChange={setWeeks}>
          <SelectTrigger className="w-[140px] h-10 rounded-xl">
            <SelectValue placeholder="จำนวนสัปดาห์" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="4">4 สัปดาห์</SelectItem>
            <SelectItem value="8">8 สัปดาห์</SelectItem>
            <SelectItem value="12">12 สัปดาห์</SelectItem>
            <SelectItem value="24">24 สัปดาห์</SelectItem>
          </SelectContent>
        </Select>

        <Button 
          variant="outline" 
          size="icon" 
          className="h-10 w-10 rounded-xl"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Summary Cards */}
      {data?.summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="bg-gradient-to-br from-pink-500/10 to-pink-500/5 border border-pink-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 text-pink-600 mb-2">
              <Users className="h-5 w-5" />
              <span className="text-sm font-medium">จำนวน Cohorts</span>
            </div>
            <p className="text-2xl font-bold">{data.summary.total_cohorts}</p>
          </div>
          <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 text-green-600 mb-2">
              <TrendingUp className="h-5 w-5" />
              <span className="text-sm font-medium">เฉลี่ย Week 1</span>
            </div>
            <p className="text-2xl font-bold">{data.summary.avg_week_1_retention}%</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 text-yellow-600 mb-2">
              <TrendingUp className="h-5 w-5" />
              <span className="text-sm font-medium">เฉลี่ย Week 4</span>
            </div>
            <p className="text-2xl font-bold">{data.summary.avg_week_4_retention}%</p>
          </div>
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <span className="text-sm font-medium">Best Cohort</span>
            </div>
            <p className="text-lg font-bold truncate">{data.summary.best_cohort || '-'}</p>
          </div>
        </div>
      )}

      {/* Cohort Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted/30 rounded w-48" />
            <div className="h-64 bg-muted/30 rounded w-full" />
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-12 text-red-500">
          เกิดข้อผิดพลาดในการโหลดข้อมูล
        </div>
      ) : (
        <CohortTable 
          data={data?.data || []} 
          cohortType={cohortType}
          title={`${cohortType === 'weekly' ? 'รายสัปดาห์' : cohortType === 'monthly' ? 'รายเดือน' : 'รายวัน'} Cohort Analysis`}
        />
      )}

      {/* Insights */}
      {data && data.data.length > 0 && (
        <div className="bg-muted/30 rounded-xl p-4 border border-border/40">
          <h3 className="font-semibold mb-2">ข้อมูลเชิงลึก</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• <strong>Cohort ที่ดีที่สุด:</strong> {data.summary.best_cohort} - มี retention สูงสุดตลอดเวลา</li>
            <li>• <strong>Cohort ที่ควรปรับปรุง:</strong> {data.summary.worst_cohort} - ควรหา причиныที่ users ไม่กลับมา</li>
            <li>• <strong>Week 1 Retention เฉลี่ย:</strong> {data.summary.avg_week_1_retention}% - ควรมี target อย่างน้อย 50%</li>
            <li>• <strong>Week 4 Retention เฉลี่ย:</strong> {data.summary.avg_week_4_retention}% - ควรมี target อย่างน้อย 20%</li>
          </ul>
        </div>
      )}
    </div>
  );
}