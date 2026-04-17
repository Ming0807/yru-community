'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SegmentType, SegmentSummary } from '@/types/analytics/segments';

interface Props {
  segments: Record<string, {
    levels: { level: string; user_count: number; percentage: number }[];
    total_users: number;
  }>;
  totalUsers: number;
  title?: string;
}

const segmentColors: Record<SegmentType, string> = {
  activity: '#E88B9C',
  engagement: '#7EC8A4',
  faculty: '#F6C90E',
  interest: '#3B82F6',
  device: '#8B5CF6',
  time: '#EC4899',
  content: '#10B981',
};

const segmentLabels: Record<SegmentType, string> = {
  activity: 'ระดับกิจกรรม',
  engagement: 'ระดับการมีส่วนร่วม',
  faculty: 'คณะ',
  interest: 'ความสนใจ',
  device: 'อุปกรณ์',
  time: 'เวลา',
  content: 'ประเภทเนื้อหา',
};

const levelLabels: Record<string, string> = {
  active_30d: 'Active 30 วัน',
  active_7d: 'Active 7 วัน',
  active_1d: 'Active วันนี้',
  dormant: 'ไม่ active',
  new: 'ผู้ใช้ใหม่',
  high: 'สูง',
  medium: 'กลาง',
  low: 'ต่ำ',
  ghost: 'ไม่มีกิจกรรม',
};

export function SegmentAnalysis({ segments, totalUsers, title = 'User Segments' }: Props) {
  const segmentData = useMemo(() => {
    return Object.entries(segments).map(([type, data]) => ({
      type: type as SegmentType,
      label: segmentLabels[type as SegmentType] || type,
      color: segmentColors[type as SegmentType] || '#888',
      ...data,
    }));
  }, [segments]);

  const getLevelLabel = (level: string) => {
    return levelLabels[level] || level;
  };

  if (segmentData.length === 0) {
    return (
      <Card className="card-shadow border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">ไม่มีข้อมูล Segments</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-shadow border-border/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">
          ข้อมูลจาก {totalUsers.toLocaleString('th-TH')} ผู้ใช้ทั้งหมด
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {segmentData.map((segment) => (
            <div 
              key={segment.type}
              className="border border-border/60 rounded-xl p-4"
              style={{ borderLeftColor: segment.color, borderLeftWidth: 4 }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{segment.label}</h3>
                <span className="text-sm text-muted-foreground">
                  {segment.total_users.toLocaleString('th-TH')}
                </span>
              </div>
              
              <div className="space-y-2">
                {segment.levels.map((level) => (
                  <div key={level.level} className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">
                          {getLevelLabel(level.level)}
                        </span>
                        <span className="font-medium">
                          {level.percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-300"
                          style={{ 
                            width: `${level.percentage}%`,
                            backgroundColor: segment.color,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Overall Distribution */}
        <div className="mt-6 pt-4 border-t border-border/60">
          <h4 className="text-sm font-medium mb-3">สัดส่วนผู้ใช้ทั้งหมด</h4>
          <div className="flex h-4 rounded-full overflow-hidden">
            {segmentData.map((segment, idx) => (
              <div
                key={segment.type}
                className="relative group"
                style={{ 
                  width: `${(segment.total_users / totalUsers) * 100}%`,
                  backgroundColor: segment.color,
                }}
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover border border-border rounded px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
                  <strong>{segment.label}:</strong> {segment.total_users.toLocaleString('th-TH')}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-4 mt-3">
            {segmentData.map((segment) => (
              <div key={segment.type} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
                <span className="text-xs text-muted-foreground">
                  {segment.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}