'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { RevenueByTier } from '@/types/advertising';

interface Props {
  data: RevenueByTier[];
  title?: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: RevenueByTier }>;
  total: number;
}

function CustomTooltipComponent({ active, payload, total }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    const percent = total > 0 ? (d.revenue / total) * 100 : 0;
    return (
      <div className="bg-card border border-border rounded-xl p-3 shadow-lg">
        <p className="font-semibold text-foreground">{d.tierName}</p>
        <p className="text-sm text-muted-foreground mt-1">
          รายได้: <span className="font-medium text-foreground">{formatCurrency(d.revenue)}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          จำนวน: <span className="font-medium text-foreground">{d.count} แคมเปญ</span>
        </p>
        <p className="text-sm text-muted-foreground">
          สัดส่วน: <span className="font-medium text-foreground">{formatPercent(percent)}</span>
        </p>
      </div>
    );
  }
  return null;
}

interface RenderLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}

function renderCustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: RenderLabelProps) {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export function RevenueByTierChart({ data, title = 'รายได้ตามระดับแพ็กเกจ' }: Props) {
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

  const total = useMemo(() => data.reduce((sum, d) => sum + d.revenue, 0), [data]);

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
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={100}
                  innerRadius={50}
                  paddingAngle={2}
                  dataKey="revenue"
                  nameKey="tierName"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltipComponent total={total} />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  iconSize={10}
                  formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="mt-4 pt-4 border-t border-border/60">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">รายได้รวม</span>
            <span className="text-lg font-bold text-[var(--color-yru-pink)]">{formatCurrency(total)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}