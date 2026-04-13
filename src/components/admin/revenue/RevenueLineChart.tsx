'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { RevenuePeriod } from '@/types/advertising';

interface Props {
  data: RevenuePeriod[];
  title?: string;
  showImpressions?: boolean;
  showClicks?: boolean;
  showCtr?: boolean;
}

export function RevenueLineChart({
  data,
  title = 'รายได้รายวัน',
  showImpressions = false,
  showClicks = false,
  showCtr = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    updateDimensions();

    const observer = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const chartData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      dateLabel: new Date(d.date).toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
      }),
    }));
  }, [data]);

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toString();
  };

  const formatTooltip = (value: number, name: string) => {
    if (name === 'revenue') {
      return [new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(value), 'รายได้'];
    }
    return [value.toLocaleString(), name === 'impressions' ? 'ยอดแสดงผล' : name === 'clicks' ? 'ยอดคลิก' : 'CTR'];
  };

  return (
    <Card className="card-shadow border-border/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
<CardContent>
      <div ref={containerRef} className="h-[300px] w-full min-w-0">
        {dimensions.width === 0 || dimensions.height === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            กำลังโหลด...
          </div>
        ) : (
          <ResponsiveContainer width={dimensions.width} height={dimensions.height}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-yru-pink)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-yru-pink)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--border)' }}
                dy={10}
              />
              <YAxis
                yAxisId="left"
                tickFormatter={formatCurrency}
                tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                tickLine={false}
                axisLine={false}
              />
              {showImpressions && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
                  tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  axisLine={false}
                />
              )}
              <Tooltip
                formatter={(value, name) => formatTooltip(Number(value), String(name))}
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                labelStyle={{ color: 'var(--foreground)', fontWeight: 600, marginBottom: 4 }}
              />
              <Legend
                wrapperStyle={{ paddingTop: 20 }}
                iconType="circle"
                iconSize={8}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="var(--color-yru-pink)"
                strokeWidth={2}
                fill="url(#colorRevenue)"
                yAxisId="left"
                name="รายได้"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              {showImpressions && (
                <Area
                  type="monotone"
                  dataKey="impressions"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fill="url(#colorImpressions)"
                  yAxisId="right"
                  name="ยอดแสดงผล"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              )}
              {showClicks && (
                <Area
                  type="monotone"
                  dataKey="clicks"
                  stroke="#22C55E"
                  strokeWidth={2}
                  fill="url(#colorClicks)"
                  yAxisId="left"
                  name="ยอดคลิก"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </CardContent>
    </Card>
  );
}