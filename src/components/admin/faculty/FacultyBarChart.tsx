'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FacultyStats } from '@/types/advertising';

interface Props {
  data: FacultyStats[];
  metric: 'userCount' | 'activeUsers' | 'postCount' | 'adRevenue';
  title?: string;
}

const metricLabels: Record<string, string> = {
  userCount: 'จำนวนผู้ใช้',
  activeUsers: 'ผู้ใช้ active',
  postCount: 'จำนวนโพสต์',
  adRevenue: 'รายได้โฆษณา',
};

const yruColors = [
  '#E88B9C',
  '#7EC8A4',
  '#F6C90E',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#10B981',
  '#F59E0B',
];

export function FacultyBarChart({ data, metric, title }: Props) {
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
    return [...data]
      .sort((a, b) => b[metric] - a[metric])
      .slice(0, 10)
      .map((item, index) => ({
        faculty: item.faculty.length > 15 ? item.faculty.substring(0, 15) + '...' : item.faculty,
        fullFaculty: item.faculty,
        value: item[metric],
        index,
      }));
  }, [data, metric]);

  const formatValue = (value: number) => {
    if (metric === 'adRevenue') {
      return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }
    return value.toLocaleString('th-TH');
  };

  const formatTooltipValue = (value: number, name: string) => {
    if (metric === 'adRevenue') {
      return [new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(value), metricLabels[metric] || metric];
    }
    return [value.toLocaleString('th-TH'), metricLabels[metric] || metric];
  };

  return (
    <Card className="card-shadow border-border/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title || `${metricLabels[metric]}ตามคณะ`}</CardTitle>
      </CardHeader>
<CardContent>
      <div ref={containerRef} className="h-[350px] w-full min-w-0">
        {dimensions.width === 0 || dimensions.height === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            กำลังโหลด...
          </div>
        ) : (
          <ResponsiveContainer width={dimensions.width} height={dimensions.height}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={true} vertical={false} />
              <XAxis
                type="number"
                tickFormatter={(v) => metric === 'adRevenue' && v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
                tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--border)' }}
              />
              <YAxis
                type="category"
                dataKey="faculty"
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                tickLine={false}
                axisLine={false}
                width={100}
              />
<Tooltip
              formatter={(value, name) => formatTooltipValue(Number(value), String(name))}
                labelFormatter={(label, payload) => payload?.[0]?.payload?.fullFaculty || label}
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                labelStyle={{ color: 'var(--foreground)', fontWeight: 600, marginBottom: 4 }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={40}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={yruColors[index % yruColors.length]} />
                ))}
              </Bar>
</BarChart>
          </ResponsiveContainer>
        )}
      </div>
      </CardContent>
    </Card>
  );
}