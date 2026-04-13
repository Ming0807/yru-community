'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pause, Play, Settings } from 'lucide-react';
import { BudgetProgressBar } from './BudgetProgressBar';
import type { BudgetPacing } from '@/types/advertising';

interface Props {
  data: BudgetPacing[];
  title?: string;
  onPauseCampaign?: (id: string) => void;
  onResumeCampaign?: (id: string) => void;
}

const statusConfig = {
  on_track: { label: 'ตามแผน', color: 'text-green-600', bg: 'bg-green-500/10' },
  over_pacing: { label: 'ใช้งบเร็ว', color: 'text-yellow-600', bg: 'bg-yellow-500/10' },
  under_pacing: { label: 'ใช้งบต่ำ', color: 'text-blue-600', bg: 'bg-blue-500/10' },
  exhausted: { label: 'หมดงบ', color: 'text-red-600', bg: 'bg-red-500/10' },
};

export function BudgetTable({ data, title = 'สถานะงบประมาณแคมเปญ', onPauseCampaign, onResumeCampaign }: Props) {
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
              <th className="px-4 py-3 text-left font-medium">แคมเปญ</th>
              <th className="px-4 py-3 text-center font-medium">สถานะ</th>
              <th className="px-4 py-3 text-left font-medium">งบรายวัน</th>
              <th className="px-4 py-3 text-left font-medium">งบทั้งหมด</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-muted-foreground">
                  ไม่มีข้อมูลงบประมาณ
                </td>
              </tr>
            ) : (
              data.map((campaign) => {
                const status = statusConfig[campaign.status];
                return (
                  <tr key={campaign.campaignId} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="max-w-[200px]">
                        <p className="font-medium text-foreground truncate">{campaign.campaignName}</p>
                        {campaign.startDate && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(campaign.startDate).toLocaleDateString('th-TH')}
                            {campaign.endDate && ` - ${new Date(campaign.endDate).toLocaleDateString('th-TH')}`}
                          </p>
                        )}
                        <div className="mt-2 space-y-2">
                          <BudgetProgressBar
                            spent={campaign.dailySpent}
                            budget={campaign.dailyBudget || 0}
                            label="รายวัน"
                            size="sm"
                          />
                          {campaign.totalBudget && campaign.totalBudget > 0 && (
                            <BudgetProgressBar
                              spent={campaign.totalSpent}
                              budget={campaign.totalBudget}
                              label="ทั้งหมด"
                              size="sm"
                            />
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={`${status.bg} ${status.color} border-0`}>
                        {status.label}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        Pacing: {campaign.dailyPacing.toFixed(0)}%
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">
                        {campaign.dailyBudget ? formatCurrency(campaign.dailyBudget) : '-'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ใช้ไป: {formatCurrency(campaign.dailySpent)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">
                        {campaign.totalBudget ? formatCurrency(campaign.totalBudget) : '-'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ใช้ไป: {formatCurrency(campaign.totalSpent)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {campaign.status === 'on_track' ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg hover:bg-yellow-500/10"
                            onClick={() => onPauseCampaign?.(campaign.campaignId)}
                            title="หยุดชั่วคราว"
                          >
                            <Pause className="h-4 w-4 text-yellow-600" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg hover:bg-green-500/10"
                            onClick={() => onResumeCampaign?.(campaign.campaignId)}
                            title="กลับมาใช้งาน"
                          >
                            <Play className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg hover:bg-muted"
                          title="ตั้งค่างบ"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </CardContent>
    </Card>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
  }).format(amount);
}