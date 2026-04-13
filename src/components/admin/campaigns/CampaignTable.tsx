'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
import {
  CAMPAIGN_STATUS_CONFIG,
  type AdCampaign,
  type AdPackage,
} from '@/types/advertising';
import { MoreHorizontal, Pencil, Check, X, AlertCircle, Megaphone } from 'lucide-react';

interface Props {
  campaigns: AdCampaign[];
  onEdit: (campaign: AdCampaign) => void;
  onApprove: (id: string) => void;
  onCancel: (id: string) => void;
  isApproving?: boolean;
  isCancelling?: boolean;
}

export function CampaignTable({
  campaigns,
  onEdit,
  onApprove,
  onCancel,
  isApproving,
  isCancelling,
}: Props) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(amount);

  if (campaigns.length === 0) {
    return (
      <Card className="card-shadow border-border/40">
        <CardContent className="py-20 text-center text-muted-foreground">
          <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">ไม่พบข้อมูลแคมเปญ</p>
          <p className="text-sm mt-1">ลองเปลี่ยนตัวกรองหรือสร้างแคมเปญใหม่</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-shadow border-border/40">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b border-border/60">
              <tr>
                <th className="px-6 py-4 font-medium">แคมเปญ</th>
                <th className="px-4 py-4 font-medium">แพ็กเกจ</th>
                <th className="px-4 py-4 font-medium">การกำหนดเป้าหมาย</th>
                <th className="px-4 py-4 font-medium text-center">ระยะเวลา</th>
                <th className="px-4 py-4 font-medium text-right">ราคา</th>
                <th className="px-4 py-4 font-medium text-center">สถานะ</th>
                <th className="px-6 py-4 font-medium text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {campaigns.map((campaign) => {
                const status = CAMPAIGN_STATUS_CONFIG[campaign.status];
                return (
                  <tr key={campaign.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold">{campaign.campaign_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {campaign.advertiser_name || 'ไม่ระบุผู้ลงโฆษณา'}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {campaign.package ? (
                        <Badge
                          variant="outline"
                          style={{
                            borderColor: campaign.package.color,
                            color: campaign.package.color,
                          }}
                        >
                          {campaign.package.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <TargetingBadges campaign={campaign} />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <DateRange start={campaign.start_date} end={campaign.end_date} />
                    </td>
                    <td className="px-4 py-4 text-right font-medium text-green-600">
                      {campaign.final_price ? formatCurrency(campaign.final_price) : '-'}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Badge className={`${status.bg} ${status.color} border-0`}>
                        {status.label}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <CampaignActions
                        campaign={campaign}
                        onEdit={onEdit}
                        onApprove={onApprove}
                        onCancel={onCancel}
                        isApproving={isApproving}
                        isCancelling={isCancelling}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function TargetingBadges({ campaign }: { campaign: AdCampaign }) {
  return (
    <div className="flex flex-wrap gap-1">
      {campaign.target_faculties?.length > 0 && (
        <Badge variant="secondary" className="text-xs">
          {campaign.target_faculties.length} คณะ
        </Badge>
      )}
      {campaign.target_interests?.length > 0 && (
        <Badge variant="secondary" className="text-xs">
          {campaign.target_interests.length} ความสนใจ
        </Badge>
      )}
      {campaign.target_years?.length > 0 && (
        <Badge variant="secondary" className="text-xs">
          {campaign.target_years.length} ชั้นปี
        </Badge>
      )}
      {!campaign.target_faculties?.length &&
        !campaign.target_interests?.length &&
        !campaign.target_years?.length && (
          <span className="text-xs text-muted-foreground">ทั่วไป</span>
        )}
    </div>
  );
}

function DateRange({ start, end }: { start: string | null; end: string | null }) {
  if (!start) return <span className="text-muted-foreground">-</span>;

  return (
    <div className="text-xs">
      <div>{new Date(start).toLocaleDateString('th-TH')}</div>
      {end && <div className="text-muted-foreground">- {new Date(end).toLocaleDateString('th-TH')}</div>}
    </div>
  );
}

interface CampaignActionsProps {
  campaign: AdCampaign;
  onEdit: (campaign: AdCampaign) => void;
  onApprove: (id: string) => void;
  onCancel: (id: string) => void;
  isApproving?: boolean;
  isCancelling?: boolean;
}

function CampaignActions({
  campaign,
  onEdit,
  onApprove,
  onCancel,
  isApproving,
  isCancelling,
}: CampaignActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-md hover:bg-background shadow-sm border border-border/40"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 rounded-xl">
        <DropdownMenuItem onClick={() => onEdit(campaign)} className="cursor-pointer gap-2">
          <Pencil className="h-4 w-4" />
          แก้ไข
        </DropdownMenuItem>
        {campaign.status === 'pending_approval' && (
          <DropdownMenuItem
            onClick={() => onApprove(campaign.id)}
            className="cursor-pointer gap-2 text-green-600"
          >
            <Check className="h-4 w-4" />
            อนุมัติ
          </DropdownMenuItem>
        )}
        {campaign.status === 'active' && (
          <DropdownMenuItem
            onClick={() => onEdit({ ...campaign, status: 'paused' })}
            className="cursor-pointer gap-2"
          >
            <AlertCircle className="h-4 w-4" />
            หยุดชั่วคราว
          </DropdownMenuItem>
        )}
        {['active', 'paused', 'pending_approval'].includes(campaign.status) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                if (confirm('ยืนยันการยกเลิกแคมเปญนี้?')) {
                  onCancel(campaign.id);
                }
              }}
              className="cursor-pointer gap-2 text-red-600"
            >
              <X className="h-4 w-4" />
              ยกเลิก
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}