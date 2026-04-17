'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, BarChart3, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AttributionChart, AttributionSelector } from '@/components/admin/analytics/AttributionChart';

interface AttributionResponse {
  model: string;
  date_range: { start: string; end: string };
  summary: {
    total_conversions: number;
    total_conversion_value: number;
    unique_campaigns: number;
    unique_ads: number;
  };
  by_campaign: Array<{
    campaign_id: string;
    campaign_name: string;
    credit: number;
    conversions: number;
    value: number;
    conversion_credit: number;
    revenue_credit: number;
    percentage_of_credit: number;
  }>;
  by_ad: Array<{
    ad_id: string;
    ad_title: string;
    credit: number;
    conversions: number;
    value: number;
    conversion_credit: number;
    revenue_credit: number;
    percentage_of_credit: number;
  }>;
  model_descriptions: Record<string, string>;
}

export default function AttributionPage() {
  const [model, setModel] = useState('last_click');

  const { data, isLoading, isError, refetch, isFetching } = useQuery<AttributionResponse>({
    queryKey: ['admin', 'attribution', model],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/attribution?model=${model}`);
      if (!res.ok) throw new Error('Failed to fetch attribution data');
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <BarChart3 className="h-7 w-7 text-[var(--color-yru-pink)]" />
            Attribution Analysis
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            วิเคราะห์การปันส่วนเครดิต Conversion ให้กับแต่ละ Touchpoint
          </p>
        </div>

        <div className="flex items-center gap-3">
          <AttributionSelector value={model} onChange={setModel} />
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

      {/* Main Chart */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : isError || !data ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 bg-red-500/10 rounded-full mb-4">
            <BarChart3 className="h-8 w-8 text-red-500" />
          </div>
          <h3 className="font-semibold text-lg mb-2">ไม่สามารถโหลดข้อมูล</h3>
          <p className="text-muted-foreground text-sm mb-4">
            กรุณาลองใหม่อีกครั้ง
          </p>
          <Button onClick={() => refetch()} variant="outline" className="rounded-xl gap-2">
            <RefreshCw className="h-4 w-4" />
            ลองใหม่
          </Button>
        </div>
      ) : (
        <AttributionChart data={data} isLoading={false} />
      )}
    </div>
  );
}