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
import { FunnelChart } from '@/components/admin/analytics';
import { RefreshCw, Target, MousePointer, Eye, ShoppingCart } from 'lucide-react';
import type { FunnelData } from '@/types/analytics/segments';

export default function FunnelPage() {
  const [campaignId, setCampaignId] = useState<string>('all');
  const [days, setDays] = useState('30');

  const { data, isLoading, error, refetch } = useQuery<FunnelData>({
    queryKey: ['admin', 'analytics', 'funnel', campaignId, days],
    queryFn: async () => {
      const params = new URLSearchParams({
        days,
        ...(campaignId !== 'all' ? { campaign_id: campaignId } : {}),
      });
      const res = await fetch(`/api/admin/analytics/funnel?${params}`);
      if (!res.ok) throw new Error('Failed to fetch funnel data');
      return res.json();
    },
  });

  // Calculate derived metrics
  const metrics = data ? {
    impressions: data.summary.total_impressions,
    clicks: data.summary.total_clicks,
    landing: data.summary.total_landings,
    actions: data.summary.total_actions,
    conversions: data.summary.total_conversions,
    ctr: data.summary.overall_ctr,
    conversionRate: data.summary.overall_conversion_rate,
    revenue: data.steps.find(s => s.stage === 'conversion')?.count || 0, // Simplified
  } : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Funnel Analysis</h1>
          <p className="text-muted-foreground">
            วิเคราะห์ Conversion Funnel ตั้งแต่ Impression → Click → Conversion
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <Select value={campaignId} onValueChange={setCampaignId}>
          <SelectTrigger className="w-[200px] h-10 rounded-xl">
            <SelectValue placeholder="เลือกแคมเปญ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกแคมเปญ</SelectItem>
          </SelectContent>
        </Select>

        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-[140px] h-10 rounded-xl">
            <SelectValue placeholder="ช่วงเวลา" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 วัน</SelectItem>
            <SelectItem value="14">14 วัน</SelectItem>
            <SelectItem value="30">30 วัน</SelectItem>
            <SelectItem value="60">60 วัน</SelectItem>
            <SelectItem value="90">90 วัน</SelectItem>
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

      {/* KPI Cards */}
      {metrics && (
        <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-8">
          <div className="bg-gradient-to-br from-pink-500/10 to-pink-500/5 border border-pink-500/20 rounded-xl p-3">
            <div className="flex items-center gap-2 text-pink-600 mb-1">
              <Eye className="h-4 w-4" />
              <span className="text-xs font-medium">Impressions</span>
            </div>
            <p className="text-xl font-bold">{metrics.impressions.toLocaleString('th-TH')}</p>
          </div>
          <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-xl p-3">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <MousePointer className="h-4 w-4" />
              <span className="text-xs font-medium">Clicks</span>
            </div>
            <p className="text-xl font-bold">{metrics.clicks.toLocaleString('th-TH')}</p>
            <p className="text-[10px] text-muted-foreground">CTR: {metrics.ctr}%</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20 rounded-xl p-3">
            <div className="flex items-center gap-2 text-yellow-600 mb-1">
              <span className="text-xs font-medium">Landing</span>
            </div>
            <p className="text-xl font-bold">{metrics.landing.toLocaleString('th-TH')}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-3">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Target className="h-4 w-4" />
              <span className="text-xs font-medium">Actions</span>
            </div>
            <p className="text-xl font-bold">{metrics.actions.toLocaleString('th-TH')}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-xl p-3">
            <div className="flex items-center gap-2 text-purple-600 mb-1">
              <ShoppingCart className="h-4 w-4" />
              <span className="text-xs font-medium">Conversions</span>
            </div>
            <p className="text-xl font-bold">{metrics.conversions.toLocaleString('th-TH')}</p>
            <p className="text-[10px] text-muted-foreground">Rate: {metrics.conversionRate}%</p>
          </div>
          <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20 rounded-xl p-3">
            <div className="flex items-center gap-2 text-cyan-600 mb-1">
              <span className="text-xs font-medium">Imp→Click</span>
            </div>
            <p className="text-xl font-bold">{metrics.ctr}%</p>
            <p className="text-[10px] text-muted-foreground">Conversion</p>
          </div>
          <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20 rounded-xl p-3">
            <div className="flex items-center gap-2 text-orange-600 mb-1">
              <span className="text-xs font-medium">Click→Conv</span>
            </div>
            <p className="text-xl font-bold">
              {metrics.clicks > 0 ? ((metrics.conversions / metrics.clicks) * 100).toFixed(2) : 0}%
            </p>
            <p className="text-[10px] text-muted-foreground">Conversion</p>
          </div>
          <div className="bg-gradient-to-br from-teal-500/10 to-teal-500/5 border border-teal-500/20 rounded-xl p-3">
            <div className="flex items-center gap-2 text-teal-600 mb-1">
              <span className="text-xs font-medium">Overall</span>
            </div>
            <p className="text-xl font-bold">
              {metrics.impressions > 0 ? ((metrics.conversions / metrics.impressions) * 100).toFixed(3) : 0}%
            </p>
            <p className="text-[10px] text-muted-foreground">Impression→Conv</p>
          </div>
        </div>
      )}

      {/* Funnel Chart */}
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
      ) : data ? (
        <FunnelChart 
          data={data}
          title="Conversion Funnel"
        />
      ) : null}

      {/* Insights */}
      {data && data.steps.length > 0 && (
        <div className="bg-muted/30 rounded-xl p-4 border border-border/40">
          <h3 className="font-semibold mb-3">ข้อมูลเชิงลึก</h3>
          
          {/* Drop-off Analysis */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="text-sm font-medium mb-2 text-muted-foreground">จุดที่มีการ Drop-off สูง</h4>
              <ul className="space-y-2 text-sm">
                {data.steps.slice(0, -1).map((step, idx) => {
                  const prevStep = idx > 0 ? data.steps[idx - 1] : null;
                  const dropRate = prevStep && prevStep.count > 0 
                    ? ((prevStep.count - step.count) / prevStep.count) * 100 
                    : 0;
                  
                  if (dropRate < 30) return null;
                  
                  return (
                    <li key={step.stage} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      <span>
                        <strong>{step.step_name}</strong>: มีการ dropout {dropRate.toFixed(1)}%
                        {dropRate >= 80 && ' (ปัญหาหนัก)'}
                        {dropRate >= 50 && dropRate < 80 && ' (ควรปรับปรุง)'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-2 text-muted-foreground">คำแนะนำ</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {data.summary.avg_dropoff_stage === 'click' && (
                  <li>• ควรปรับปรุง creative และ targeting เพื่อเพิ่ม CTR</li>
                )}
                {data.summary.avg_dropoff_stage === 'landing' && (
                  <li>• ควรปรับปรุง landing page ให้ตรงกับ ad content</li>
                )}
                {data.summary.avg_dropoff_stage === 'action' && (
                  <li>• ควรลดขั้นตอนการดำเนินการ (simplify checkout/form)</li>
                )}
                {metrics && metrics.ctr < 2 && (
                  <li>• CTR ต่ำกว่า avg ({metrics.ctr}%) - ควรทดสอบ creative ใหม่</li>
                )}
                {metrics && metrics.conversionRate < 1 && (
                  <li>• Conversion rate ต่ำ - ควรปรับปรุง landing page และ UX</li>
                )}
                {metrics && metrics.ctr > 5 && (
                  <li>• CTR สูงมาก ({metrics.ctr}%) - targeting ดีมาก</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}