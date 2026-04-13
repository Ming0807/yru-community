'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AdCampaign } from '@/types/advertising';
import { Megaphone } from 'lucide-react';

interface Props {
  campaigns: AdCampaign[];
}

export function CampaignStats({ campaigns }: Props) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(amount);

  const totalRevenue = campaigns.reduce((sum, c) => sum + (c.final_price || 0), 0);
  const pendingCount = campaigns.filter((c) => c.status === 'pending_approval').length;
  const activeCount = campaigns.filter((c) => c.status === 'active').length;
  const completedCount = campaigns.filter((c) => c.status === 'completed').length;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <StatCard
        title="ทั้งหมด"
        value={campaigns.length}
        icon={<Megaphone className="h-4 w-4" />}
      />
      <StatCard
        title="รออนุมัติ"
        value={pendingCount}
        variant="warning"
      />
      <StatCard
        title="กำลังแสดง"
        value={activeCount}
        variant="success"
      />
      <StatCard
        title="รายได้รวม"
        value={formatCurrency(totalRevenue)}
        variant="pink"
      />
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon?: React.ReactNode;
  variant?: 'default' | 'warning' | 'success' | 'pink';
}

function StatCard({ title, value, icon, variant = 'default' }: StatCardProps) {
  const valueColorClass = {
    default: '',
    warning: 'text-yellow-600',
    success: 'text-green-600',
    pink: 'text-[var(--color-yru-pink)]',
  }[variant];

  return (
    <Card className="card-shadow border-border/40">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon && (
          <div className="p-2 bg-muted rounded-full text-muted-foreground">{icon}</div>
        )}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${valueColorClass}`}>{value}</div>
      </CardContent>
    </Card>
  );
}