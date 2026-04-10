'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ArrowRight, BarChart3 } from 'lucide-react';

interface CategoryDistributionProps {
  data: { name: string; value: number }[];
}

const COLORS = ['#E88B9C', '#7EC8A4', '#FFB74D', '#A569BD', '#5DADE2'];

export function CategoryDistribution({ data }: CategoryDistributionProps) {
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
    <div className="flex-1 rounded-2xl border border-border/60 bg-background p-3 sm:p-5 w-full min-w-0 overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-sm sm:text-lg">สัดส่วนหมวดหมู่</h2>
        <Link
          href="/admin/categories"
          className="text-xs text-muted-foreground hover:text-[var(--color-yru-pink)] flex items-center gap-1 transition-colors"
        >
          <span className="hidden sm:inline">จัดการ</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      
      <div 
        ref={containerRef}
        className="relative h-[200px] sm:h-[250px] w-full min-w-0 min-h-0 flex items-center justify-center"
      >
        {!mounted || dimensions.width === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            <div className="text-center">
              <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-1 sm:mb-2 opacity-30" />
              <p className="text-xs sm:text-sm">กำลังโหลด...</p>
            </div>
          </div>
        ) : data.length > 0 ? (
          <ResponsiveContainer width={dimensions.width} height={dimensions.height}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="45%"
                innerRadius={40}
                outerRadius={65}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: 'none',
                  background: 'hsl(var(--card))',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
                  fontSize: '12px',
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                iconSize={6}
                wrapperStyle={{ paddingTop: '10px' }}
                formatter={(value) => (
                  <span className="text-[10px] sm:text-xs text-muted-foreground ml-1">
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            <div className="text-center">
              <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-1 sm:mb-2 opacity-30" />
              <p className="text-xs sm:text-sm">ยังไม่มีข้อมูล</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}