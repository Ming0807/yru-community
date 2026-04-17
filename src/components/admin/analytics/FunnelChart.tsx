'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FunnelStage, FunnelData } from '@/types/analytics/segments';
import { cn } from '@/lib/utils';

interface Props {
  data: FunnelData;
  title?: string;
  showComparison?: boolean;
  previousData?: FunnelData | null;
}

const stageLabels: Record<FunnelStage, string> = {
  impression: 'แสดงผล',
  click: 'คลิก',
  landing: 'เข้าหน้าเป้าหมาย',
  action: 'ดำเนินการ',
  conversion: 'สำเร็จ',
};

const stageColors: Record<FunnelStage, string> = {
  impression: '#E88B9C', // yru-pink
  click: '#7EC8A4', // yru-green
  landing: '#F6C90E', // yellow
  action: '#3B82F6', // blue
  conversion: '#8B5CF6', // purple
};

export function FunnelChart({ data, title = 'Funnel Analysis', showComparison = false, previousData }: Props) {
  const maxCount = useMemo(() => {
    return Math.max(...data.steps.map(s => s.count), 1);
  }, [data]);

  const funnelWidth = (count: number) => {
    return Math.max(20, (count / maxCount) * 100);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString('th-TH');
  };

  const getDropoffSeverity = (rate: number) => {
    if (rate >= 80) return 'text-red-600 bg-red-50';
    if (rate >= 50) return 'text-orange-600 bg-orange-50';
    if (rate >= 30) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  if (data.steps.length === 0) {
    return (
      <Card className="card-shadow border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">ไม่มีข้อมูล Funnel</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-shadow border-border/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {data.campaign_name && (
          <p className="text-sm text-muted-foreground">{data.campaign_name}</p>
        )}
      </CardHeader>
      <CardContent>
        {/* Funnel Visualization */}
        <div className="relative py-4">
          {data.steps.map((step, idx) => {
            const width = funnelWidth(step.count);
            const prevStep = idx > 0 ? data.steps[idx - 1] : null;
            const dropRate = prevStep ? ((prevStep.count - step.count) / prevStep.count) * 100 : 0;
            
            return (
              <div key={step.stage} className="relative mb-2">
                {/* Connection line to previous step */}
                {idx > 0 && (
                  <div className="absolute left-1/2 -top-2 w-0.5 bg-border z-10" style={{ height: '8px' }} />
                )}
                
                <div className="flex items-center gap-4">
                  {/* Stage label */}
                  <div className="w-28 text-sm font-medium text-right">
                    {stageLabels[step.stage]}
                  </div>
                  
                  {/* Funnel bar */}
                  <div className="flex-1 flex justify-center">
                    <div 
                      className="h-10 rounded-lg transition-all duration-300 flex items-center justify-center text-white font-medium text-sm"
                      style={{ 
                        width: `${width}%`, 
                        minWidth: '60px',
                        backgroundColor: stageColors[step.stage],
                      }}
                    >
                      {formatNumber(step.count)}
                    </div>
                  </div>
                  
                  {/* Rate badges */}
                  <div className="w-32 flex items-center gap-2">
                    {step.conversion_rate > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {step.conversion_rate.toFixed(2)}%
                      </span>
                    )}
                    {step.dropoff_rate > 0 && (
                      <span className={cn('text-xs px-2 py-0.5 rounded-full', getDropoffSeverity(dropRate))}>
                        -{dropRate.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6 pt-4 border-t border-border/60">
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Impressions</p>
            <p className="text-lg font-bold" style={{ color: stageColors.impression }}>
              {formatNumber(data.summary.total_impressions)}
            </p>
            <p className="text-xs text-muted-foreground">ยอดแสดงผล</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Clicks</p>
            <p className="text-lg font-bold" style={{ color: stageColors.click }}>
              {formatNumber(data.summary.total_clicks)}
            </p>
            <p className="text-xs text-muted-foreground">CTR: {data.summary.overall_ctr}%</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Landing</p>
            <p className="text-lg font-bold" style={{ color: stageColors.landing }}>
              {formatNumber(data.summary.total_landings)}
            </p>
            <p className="text-xs text-muted-foreground">เข้าหน้าเป้าหมาย</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Actions</p>
            <p className="text-lg font-bold" style={{ color: stageColors.action }}>
              {formatNumber(data.summary.total_actions)}
            </p>
            <p className="text-xs text-muted-foreground">ดำเนินการ</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Conversions</p>
            <p className="text-lg font-bold" style={{ color: stageColors.conversion }}>
              {formatNumber(data.summary.total_conversions)}
            </p>
            <p className="text-xs text-muted-foreground">Rate: {data.summary.overall_conversion_rate}%</p>
          </div>
        </div>

        {/* Insights */}
        {data.summary.avg_dropoff_stage && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">
              <strong>พบจุดที่มีการ dropout สูง:</strong> มากที่สุดที่ stage "{stageLabels[data.summary.avg_dropoff_stage]}"
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}