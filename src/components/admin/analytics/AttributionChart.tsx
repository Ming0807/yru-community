'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface AttributionData {
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

interface Props {
  data: AttributionData | null;
  isLoading?: boolean;
  title?: string;
}

const modelOptions = [
  { value: 'last_click', label: 'Last Click' },
  { value: 'first_click', label: 'First Click' },
  { value: 'linear', label: 'Linear' },
  { value: 'time_decay', label: 'Time Decay' },
];

const modelColors: Record<string, string> = {
  last_click: '#E88B9C',
  first_click: '#7EC8A4',
  linear: '#F6C90E',
  time_decay: '#3B82F6',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString('th-TH');
}

export function AttributionChart({ data, isLoading, title = 'Attribution Analysis' }: Props) {
  const [activeTab, setActiveTab] = useState<'campaign' | 'ad'>('campaign');

  if (isLoading) {
    return (
      <Card className="card-shadow border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">กำลังโหลดข้อมูล...</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="card-shadow border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">ไม่มีข้อมูล Attribution</p>
        </CardContent>
      </Card>
    );
  }

  const displayItems = activeTab === 'campaign' ? data.by_campaign : data.by_ad;
  const maxCredit = Math.max(...displayItems.map(i => i.credit), 1);

  return (
    <Card className="card-shadow border-border/40">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {data.model_descriptions[data.model]}
            </p>
          </div>
          <Badge
            className="text-white"
            style={{ backgroundColor: modelColors[data.model] || '#888' }}
          >
            {modelOptions.find(m => m.value === data.model)?.label || data.model}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Conversions ทั้งหมด</p>
            <p className="text-lg font-bold text-[var(--color-yru-pink)]">
              {formatNumber(data.summary.total_conversions)}
            </p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">มูลค่ารวม</p>
            <p className="text-lg font-bold text-green-600">
              {formatCurrency(data.summary.total_conversion_value)}
            </p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">แคมเปญ</p>
            <p className="text-lg font-bold">{data.summary.unique_campaigns}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">แอด</p>
            <p className="text-lg font-bold">{data.summary.unique_ads}</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('campaign')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'campaign'
                ? 'bg-[var(--color-yru-pink)] text-white'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            ตามแคมเปญ
          </button>
          <button
            onClick={() => setActiveTab('ad')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === 'ad'
                ? 'bg-[var(--color-yru-pink)] text-white'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            ตามแอด
          </button>
        </div>

        {/* Attribution List */}
        <div className="space-y-3">
          {displayItems.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              ไม่มีข้อมูล{activeTab === 'campaign' ? 'แคมเปญ' : 'แอด'}
            </p>
          ) : activeTab === 'campaign' ? (
            (data.by_campaign).map((item, idx) => (
              <div
                key={item.campaign_id}
                className="border border-border/60 rounded-lg p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[var(--color-yru-pink)]/10 text-[var(--color-yru-pink)] text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="font-medium">{item.campaign_name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold" style={{ color: modelColors[data.model] }}>
                      {item.credit.toFixed(1)} credits
                    </span>
                    <span className="text-muted-foreground text-sm ml-2">
                      ({item.percentage_of_credit.toFixed(1)}%)
                    </span>
                  </div>
                </div>

                {/* Credit Bar */}
                <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${(item.credit / maxCredit) * 100}%`,
                      backgroundColor: modelColors[data.model] || '#888',
                    }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Conversions</p>
                    <p className="font-medium">{item.conversions}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">มูลค่า</p>
                    <p className="font-medium">{formatCurrency(item.value)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Credit/Conv</p>
                    <p className="font-medium">
                      {(item.conversions > 0 ? item.credit / item.conversions : 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            data.by_ad.map((item, idx) => (
              <div
                key={item.ad_id}
                className="border border-border/60 rounded-lg p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[var(--color-yru-pink)]/10 text-[var(--color-yru-pink)] text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="font-medium">{item.ad_title}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold" style={{ color: modelColors[data.model] }}>
                      {item.credit.toFixed(1)} credits
                    </span>
                    <span className="text-muted-foreground text-sm ml-2">
                      ({item.percentage_of_credit.toFixed(1)}%)
                    </span>
                  </div>
                </div>

                {/* Credit Bar */}
                <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${(item.credit / maxCredit) * 100}%`,
                      backgroundColor: modelColors[data.model] || '#888',
                    }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Conversions</p>
                    <p className="font-medium">{item.conversions}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">มูลค่า</p>
                    <p className="font-medium">{formatCurrency(item.value)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Credit/Conv</p>
                    <p className="font-medium">
                      {(item.conversions > 0 ? item.credit / item.conversions : 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Model Comparison */}
        <div className="mt-6 pt-4 border-t border-border/60">
          <h4 className="text-sm font-medium mb-3">เปรียบเทียบ Attribution Models</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {modelOptions.map((model) => (
              <div
                key={model.value}
                className={cn(
                  'p-3 rounded-lg border-2 transition-colors',
                  data.model === model.value
                    ? 'border-[var(--color-yru-pink)] bg-[var(--color-yru-pink)]/5'
                    : 'border-border/60'
                )}
              >
                <div
                  className="w-3 h-3 rounded-full mb-2"
                  style={{ backgroundColor: modelColors[model.value] }}
                />
                <p className="font-medium text-sm">{model.label}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.model_descriptions[model.value]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AttributionSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (model: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[180px] rounded-xl">
        <SelectValue placeholder="เลือกโมเดล" />
      </SelectTrigger>
      <SelectContent>
        {modelOptions.map((model) => (
          <SelectItem key={model.value} value={model.value}>
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: modelColors[model.value] }}
              />
              {model.label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}