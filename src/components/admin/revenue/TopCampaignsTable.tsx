'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useState, useCallback } from 'react';
import type { CampaignPerformance } from '@/types/advertising';

interface Props {
  data: CampaignPerformance[];
  title?: string;
}

type SortField = 'revenue' | 'impressions' | 'clicks' | 'ctr';
type SortOrder = 'asc' | 'desc';

const tierColors: Record<string, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  custom: '#7EC8A4',
};

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending_approval: { label: 'รออนุมัติ', color: 'text-yellow-600', bg: 'bg-yellow-500/10' },
  approved: { label: 'อนุมัติแล้ว', color: 'text-blue-600', bg: 'bg-blue-500/10' },
  rejected: { label: 'ปฏิเสธ', color: 'text-red-600', bg: 'bg-red-500/10' },
  active: { label: 'กำลังแสดง', color: 'text-green-600', bg: 'bg-green-500/10' },
  paused: { label: 'หยุดชั่วคราว', color: 'text-gray-600', bg: 'bg-gray-500/10' },
  completed: { label: 'เสร็จสิ้น', color: 'text-purple-600', bg: 'bg-purple-500/10' },
  cancelled: { label: 'ยกเลิก', color: 'text-red-600', bg: 'bg-red-500/10' },
};

function SortIconComponent({ field, sortField, sortOrder }: { field: SortField; sortField: SortField; sortOrder: SortOrder }) {
  if (sortField !== field) {
    return <ArrowUpDown className="h-3 w-3 text-muted-foreground ml-1 inline" />;
  }
  return sortOrder === 'asc' ? (
    <ArrowUp className="h-3 w-3 text-[var(--color-yru-pink)] ml-1 inline" />
  ) : (
    <ArrowDown className="h-3 w-3 text-[var(--color-yru-pink)] ml-1 inline" />
  );
}

function StatusBadgeComponent({ status }: { status: string }) {
  const c = statusConfig[status] || statusConfig.pending_approval;
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.color}`}>
      {c.label}
    </span>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(num: number): string {
  return num.toLocaleString('th-TH');
}

export function TopCampaignsTable({ data, title = 'Top 10 แคมเปญ' }: Props) {
  const [sortField, setSortField] = useState<SortField>('revenue');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  }, [sortField]);

  const sortedData = [...data].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    }
    return aVal < bVal ? 1 : -1;
  });

  return (
    <Card className="card-shadow border-border/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
<table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b border-border/60">
            <tr>
              <th className="px-4 py-3 text-left font-medium w-12">#</th>
              <th className="px-4 py-3 text-left font-medium">แคมเปญ</th>
              <th className="px-4 py-3 text-center font-medium">แพ็กเกจ</th>
              <th className="px-4 py-3 text-center font-medium">สถานะ</th>
              <th
                className="px-4 py-3 text-right font-medium cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('revenue')}
              >
                <span className="flex items-center justify-end">
                  รายได้
                  <SortIconComponent field="revenue" sortField={sortField} sortOrder={sortOrder} />
                </span>
              </th>
              <th
                className="px-4 py-3 text-right font-medium cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('impressions')}
              >
                <span className="flex items-center justify-end">
                  ยอดแสดง
                  <SortIconComponent field="impressions" sortField={sortField} sortOrder={sortOrder} />
                </span>
              </th>
              <th
                className="px-4 py-3 text-right font-medium cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('clicks')}
              >
                <span className="flex items-center justify-end">
                  คลิก
                  <SortIconComponent field="clicks" sortField={sortField} sortOrder={sortOrder} />
                </span>
              </th>
              <th
                className="px-4 py-3 text-right font-medium cursor-pointer hover:text-foreground transition-colors"
                onClick={() => handleSort('ctr')}
              >
                <span className="flex items-center justify-end">
                  CTR
                  <SortIconComponent field="ctr" sortField={sortField} sortOrder={sortOrder} />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-muted-foreground">
                  ไม่มีข้อมูลแคมเปญ
                </td>
              </tr>
            ) : (
              sortedData.map((campaign, index) => (
                <tr key={campaign.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground font-medium">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div className="max-w-[200px]">
                      <p className="font-medium text-foreground truncate">{campaign.campaignName}</p>
                      {campaign.startDate && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(campaign.startDate).toLocaleDateString('th-TH')}
                          {campaign.endDate && ` - ${new Date(campaign.endDate).toLocaleDateString('th-TH')}`}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: tierColors[campaign.tier] || '#888',
                        color: tierColors[campaign.tier] || '#888',
                      }}
                      className="font-medium"
                    >
                      {campaign.packageName}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadgeComponent status={campaign.status} />
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-green-600">
                    {formatCurrency(campaign.revenue)}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {formatNumber(campaign.impressions)}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {formatNumber(campaign.clicks)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`font-medium ${
                        campaign.ctr >= 5
                          ? 'text-green-600'
                          : campaign.ctr >= 2
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}
                    >
                      {campaign.ctr.toFixed(2)}%
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </CardContent>
    </Card>
  );
}