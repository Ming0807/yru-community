'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ArrowRight } from 'lucide-react';

interface ActivityChartProps {
  data: { name: string; posts: number; comments: number }[];
}

export function ActivityChart({ data }: ActivityChartProps) {
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setMounted(true);
    
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

  return (
    <div className="rounded-2xl border border-border/60 bg-background p-3 sm:p-5 w-full min-w-0">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div>
          <h2 className="font-semibold text-base sm:text-lg">กิจกรรมในระบบ</h2>
          <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">แนวโน้มการตั้งกระทู้และคอมเมนต์</p>
        </div>
        <Link
          href="/admin/analytics"
          className="text-xs text-muted-foreground hover:text-[var(--color-yru-pink)] flex items-center gap-1 transition-colors"
        >
          <span className="hidden sm:inline">ดูเพิ่มเติม</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      
      <div 
        ref={containerRef}
        className="h-[250px] sm:h-[300px] lg:h-[420px] w-full mt-2"
      >
        {!mounted || dimensions.width === 0 ? (
          <div className="h-full flex items-center justify-center">
            <span className="text-sm text-muted-foreground">กำลังโหลด...</span>
          </div>
        ) : (
          <ResponsiveContainer width={dimensions.width} height={dimensions.height}>
            <AreaChart
              data={data}
              margin={{ top: 10, right: 5, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorPostsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7EC8A4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7EC8A4" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCommentsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E88B9C" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#E88B9C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                dy={6}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid hsl(var(--border))',
                  background: 'hsl(var(--card))',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="posts"
                stroke="#7EC8A4"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorPostsGrad)"
                name="กระทู้ใหม่"
              />
              <Area
                type="monotone"
                dataKey="comments"
                stroke="#E88B9C"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCommentsGrad)"
                name="คอมเมนต์"
              />
              <Legend
                verticalAlign="top"
                height={24}
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span className="text-xs text-muted-foreground">{value}</span>
                )}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}