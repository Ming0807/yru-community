'use client';

import { Input } from '@/components/ui/input';
import { Filter, Megaphone } from 'lucide-react';

interface Props {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
}

export function CampaignHeader({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
}: Props) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Megaphone className="h-7 w-7 text-[var(--color-yru-pink)]" />
          แคมเปญโฆษณา
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          จัดการแคมเปญโฆษณาทั้งหมดในระบบ
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative w-full sm:w-64">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหาแคมเปญ..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 rounded-xl"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          className="h-10 rounded-xl border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">ทุกสถานะ</option>
          <option value="pending_approval">รออนุมัติ</option>
          <option value="approved">อนุมัติแล้ว</option>
          <option value="active">กำลังแสดง</option>
          <option value="paused">หยุดชั่วคราว</option>
          <option value="completed">เสร็จสิ้น</option>
          <option value="cancelled">ยกเลิก</option>
        </select>
      </div>
    </div>
  );
}