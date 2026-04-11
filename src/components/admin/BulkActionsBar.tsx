'use client';

import { useState, useEffect } from 'react';
import { X, Ban, AlertTriangle, Trash2, Shield, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface BulkAction {
  id: string;
  label: string;
  icon: React.ElementType;
  variant?: 'default' | 'destructive' | 'warning';
  onClick: (ids: string[]) => void | Promise<void>;
  confirmMessage?: string;
}

interface BulkActionsBarProps {
  selectedCount: number;
  selectedIds: string[];
  onClear: () => void;
  actions: BulkAction[];
  className?: string;
}

export function BulkActionsBar({
  selectedCount,
  selectedIds,
  onClear,
  actions,
  className,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
        'flex items-center gap-2',
        'bg-background/95 backdrop-blur-lg border border-border/60 rounded-2xl px-4 py-3 shadow-2xl',
        'animate-in slide-in-from-bottom-5 fade-in duration-200',
        className
      )}
    >
      <span className="text-sm font-medium text-foreground">
        {selectedCount} รายการที่เลือก
      </span>

      <div className="h-5 w-px bg-border mx-1" />

      {actions.map((action) => (
        <Button
          key={action.id}
          variant={action.variant === 'destructive' ? 'destructive' : 'outline'}
          size="sm"
          className="rounded-xl gap-1.5"
          onClick={async () => {
            if (action.confirmMessage) {
              if (!confirm(`${action.confirmMessage} (${selectedCount} รายการ)?`)) {
                return;
              }
            }
            try {
              await action.onClick(selectedIds);
              toast.success(`${action.label} สำเร็จ ${selectedCount} รายการ`);
              onClear();
            } catch (error) {
              toast.error(`ไม่สามารถ${action.label} ได้`);
            }
          }}
        >
          <action.icon className="h-4 w-4" />
          <span className="hidden sm:inline">{action.label}</span>
        </Button>
      ))}

      <div className="h-5 w-px bg-border mx-1" />

      <Button variant="ghost" size="sm" className="rounded-xl" onClick={onClear}>
        <X className="h-4 w-4" />
        <span className="hidden sm:inline">ยกเลิก</span>
      </Button>
    </div>
  );
}