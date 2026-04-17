'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CohortMetrics } from '@/types/analytics/segments';

interface Props {
  data: CohortMetrics[];
  cohortType?: 'weekly' | 'monthly' | 'daily';
  title?: string;
}

export function CohortTable({ data, cohortType = 'weekly', title = 'Cohort Analysis' }: Props) {
  const maxWeeks = useMemo(() => {
    if (data.length === 0) return 8;
    return Math.max(...data.map(d => d.retention.length));
  }, [data]);

  const weeks = useMemo(() => {
    return Array.from({ length: maxWeeks }, (_, i) => i);
  }, [maxWeeks]);

  const getRetentionColor = (retention: number) => {
    if (retention >= 80) return 'bg-green-500';
    if (retention >= 50) return 'bg-green-400';
    if (retention >= 30) return 'bg-yellow-400';
    if (retention >= 20) return 'bg-orange-400';
    return 'bg-red-400';
  };

  const getRetentionTextColor = (retention: number) => {
    if (retention >= 80) return 'text-green-600';
    if (retention >= 50) return 'text-green-500';
    if (retention >= 30) return 'text-yellow-600';
    if (retention >= 20) return 'text-orange-500';
    return 'text-red-500';
  };

  if (data.length === 0) {
    return (
      <Card className="card-shadow border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">ไม่มีข้อมูล Cohort</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-shadow border-border/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border/60">
                <th className="px-4 py-3 text-left font-medium w-[200px]">
                  {cohortType === 'weekly' ? 'สัปดาห์' : cohortType === 'monthly' ? 'เดือน' : 'วันที่'}
                </th>
                <th className="px-4 py-3 text-center font-medium w-[80px]">ขนาด</th>
                {weeks.map(week => (
                  <th key={week} className="px-4 py-3 text-center font-medium min-w-[70px]">
                    {week === 0 ? 'เริ่มต้น' : `สัปดาห์ ${week}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((cohort, idx) => (
                <tr 
                  key={cohort.cohort_date} 
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[var(--color-yru-pink)]/10 text-[var(--color-yru-pink)] text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-medium">{cohort.cohort_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-muted-foreground">
                    {cohort.size.toLocaleString('th-TH')}
                  </td>
                  {weeks.map(week => (
                    <td key={week} className="px-4 py-3 text-center">
                      {week < cohort.retention.length ? (
                        <div className="flex flex-col items-center">
                          <div 
                            className={`w-12 h-6 rounded-md ${getRetentionColor(cohort.retention[week])} text-white text-xs font-medium flex items-center justify-center`}
                            title={`${cohort.retention[week].toFixed(1)}%`}
                          >
                            {cohort.retention[week].toFixed(0)}%
                          </div>
                          <span className={`text-[10px] mt-0.5 ${getRetentionTextColor(cohort.retention[week])}`}>
                            {week > 0 ? `${cohort.size * cohort.retention[week] / 100 | 0}` : ''}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Summary */}
        <div className="mt-4 p-4 bg-muted/30 border-t border-border/60">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">ทั้งหมด {data.length} cohorts</p>
              <p className="text-lg font-semibold">{data.reduce((sum, c) => sum + c.size, 0).toLocaleString('th-TH')}</p>
              <p className="text-xs text-muted-foreground">ผู้ใช้รวม</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">เฉลี่ย Week 1</p>
              <p className="text-lg font-semibold text-green-600">
                {data.length > 0 
                  ? (data.reduce((sum, c) => sum + (c.retention[1] || 0), 0) / data.length).toFixed(1)
                  : 0}%
              </p>
              <p className="text-xs text-muted-foreground">Retention</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">เฉลี่ย Week 4</p>
              <p className="text-lg font-semibold text-yellow-600">
                {data.length > 0 
                  ? (data.reduce((sum, c) => sum + (c.retention[4] || c.retention[c.retention.length - 1] || 0), 0) / data.length).toFixed(1)
                  : 0}%
              </p>
              <p className="text-xs text-muted-foreground">Retention</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">ค่าเฉลี่ย Retention</p>
              <p className="text-lg font-semibold">
                {data.length > 0 
                  ? (data.reduce((sum, c) => sum + c.avg_retention, 0) / data.length).toFixed(1)
                  : 0}%
              </p>
              <p className="text-xs text-muted-foreground">ทุกสัปดาห์</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}