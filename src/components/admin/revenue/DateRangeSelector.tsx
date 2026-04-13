'use client';

import { Button } from '@/components/ui/button';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { DateRangePreset } from '@/types/advertising';

interface Props {
  value: DateRangePreset;
  onChange: (value: DateRangePreset) => void;
}

const presets: { value: DateRangePreset; label: string }[] = [
  { value: '7d', label: '7 วันล่าสุด' },
  { value: '30d', label: '30 วันล่าสุด' },
  { value: '90d', label: '90 วันล่าสุด' },
  { value: 'this_month', label: 'เดือนนี้' },
  { value: 'last_month', label: 'เดือนที่แล้ว' },
  { value: 'this_year', label: 'ปีนี้' },
];

export function DateRangeSelector({ value, onChange }: Props) {
  const currentLabel = presets.find((p) => p.value === value)?.label || 'เลือกช่วงเวลา';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 rounded-xl">
          <Calendar className="h-4 w-4" />
          {currentLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-xl">
        {presets.map((preset) => (
          <DropdownMenuItem
            key={preset.value}
            onClick={() => onChange(preset.value)}
            className={`cursor-pointer rounded-lg ${
              value === preset.value ? 'bg-[var(--color-yru-pink)]/10 text-[var(--color-yru-pink)]' : ''
            }`}
          >
            {preset.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}