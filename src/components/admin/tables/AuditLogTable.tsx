'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import * as XLSX from 'xlsx';
import { AdminDataTable } from '../AdminDataTable';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, Trash2, UserX, CheckCircle, ToggleRight, FileText, Download, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { timeAgo } from '@/lib/utils';

interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
  admin?: {
    display_name: string;
    avatar_url: string | null;
  };
}

interface AuditLogTableProps {
  initialLogs: AuditLog[];
}

const columnHelper = createColumnHelper<AuditLog>();

const ACTION_CONFIG: Record<string, { icon: typeof Shield; label: string; color: string }> = {
  DELETE_POST: { icon: Trash2, label: 'ลบกระทู้', color: 'text-red-500 bg-red-500/10' },
  DELETE_COMMENT: { icon: Trash2, label: 'ลบคอมเมนต์', color: 'text-red-400 bg-red-400/10' },
  BAN_USER: { icon: UserX, label: 'แบนผู้ใช้', color: 'text-red-600 bg-red-600/10' },
  SUSPEND_USER: { icon: UserX, label: 'ระงับผู้ใช้', color: 'text-amber-500 bg-amber-500/10' },
  ACTIVATE_USER: { icon: CheckCircle, label: 'เปิดใช้งาน', color: 'text-green-500 bg-green-500/10' },
  RESOLVE_REPORT: { icon: CheckCircle, label: 'จัดการรายงาน', color: 'text-blue-500 bg-blue-500/10' },
  DELETE_REPORT_CONTENT: { icon: Trash2, label: 'ลบเนื้อหาจากรายงาน', color: 'text-orange-500 bg-orange-500/10' },
  TOGGLE_AD: { icon: ToggleRight, label: 'สลับโฆษณา', color: 'text-purple-500 bg-purple-500/10' },
  CREATE_AD: { icon: FileText, label: 'สร้างโฆษณา', color: 'text-emerald-500 bg-emerald-500/10' },
  UPDATE_AD: { icon: FileText, label: 'แก้ไขโฆษณา', color: 'text-emerald-400 bg-emerald-400/10' },
  DELETE_AD: { icon: Trash2, label: 'ลบโฆษณา', color: 'text-red-400 bg-red-400/10' },
  CREATE_CATEGORY: { icon: FileText, label: 'สร้างหมวดหมู่', color: 'text-cyan-500 bg-cyan-500/10' },
  UPDATE_CATEGORY: { icon: FileText, label: 'แก้ไขหมวดหมู่', color: 'text-cyan-400 bg-cyan-400/10' },
  DELETE_CATEGORY: { icon: Trash2, label: 'ลบหมวดหมู่', color: 'text-orange-400 bg-orange-400/10' },
  UPDATE_PROFILE: { icon: Shield, label: 'แก้ไขโปรไฟล์', color: 'text-indigo-500 bg-indigo-500/10' },
  PROMOTE_ADMIN: { icon: Shield, label: 'ตั้งแอดมิน', color: 'text-violet-500 bg-violet-500/10' },
  DEMOTE_ADMIN: { icon: Shield, label: 'ถอดแอดมิน', color: 'text-violet-400 bg-violet-400/10' },
};

function getActionBadge(action: string) {
  const config = ACTION_CONFIG[action];
  if (!config) {
    return <Badge variant="outline" className="text-xs">{action}</Badge>;
  }
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={`text-xs gap-1 ${config.color}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function getDetailText(details: Record<string, unknown>, targetType: string | null) {
  const d = details as Record<string, string>;
  if (d.title) return `"${d.title}"`;
  if (d.user_name) return `ผู้ใช้: ${d.user_name}`;
  if (d.post_title) return `"${d.post_title}"`;
  if (d.category_name) return `หมวด: ${d.category_name}`;
  if (d.report_id) return `Report #${d.report_id}`;
  if (d.ad_title) return `"${d.ad_title}"`;
  return targetType ? `ID: ${targetType}` : '-';
}

export function AuditLogTable({ initialLogs }: AuditLogTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const supabase = useMemo(() => createClient(), []);

  const { data: logs = initialLogs } = useQuery({
    queryKey: ['admin', 'audit', 'list'],
    queryFn: async () => {
      const res = await fetch('/api/admin/audit');
      if (!res.ok) throw new Error('Failed to fetch audit logs');
      const data = await res.json();
      return (data ?? []) as AuditLog[];
    },
    placeholderData: (prev) => prev ?? initialLogs,
  });

  const filteredLogs = useMemo(() => {
    if (!searchQuery) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(log => {
      const details = log.details as Record<string, string>;
      const actionLabel = ACTION_CONFIG[log.action]?.label ?? log.action;
      return (
        actionLabel.toLowerCase().includes(q) ||
        log.admin?.display_name?.toLowerCase().includes(q) ||
        details.title?.toLowerCase().includes(q) ||
        details.user_name?.toLowerCase().includes(q)
      );
    });
  }, [logs, searchQuery]);

  const handleExportExcel = useCallback((onlySelected: boolean = false) => {
    const dataToExport = onlySelected ? filteredLogs : logs;
    
    const rows = dataToExport.map(log => {
      const config = ACTION_CONFIG[log.action];
      const details = log.details as Record<string, string>;
      return {
        'วันที่': new Date(log.created_at).toLocaleString('th-TH'),
        'แอดมิน': log.admin?.display_name ?? 'Unknown',
        'การกระทำ': config?.label ?? log.action,
        'ประเภทเป้าหมาย': log.target_type ?? '-',
        'รายละเอียด': getDetailText(log.details, log.target_type),
        'เหตุผล': details.reason ?? '-',
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Logs');
    
    XLSX.writeFile(wb, `audit_logs_${new Date().toISOString().split('T')[0]}.xlsx`);
  }, [logs, filteredLogs]);

  const columns = useMemo(() => [
    columnHelper.accessor('created_at', {
      header: 'วันที่',
      cell: ({ row }) => (
        <div className="text-xs">
          <div className="font-medium">{new Date(row.original.created_at).toLocaleDateString('th-TH')}</div>
          <div className="text-muted-foreground">{new Date(row.original.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      ),
    }),
    columnHelper.accessor('admin', {
      header: 'แอดมิน',
      cell: ({ row }) => {
        const admin = row.original.admin;
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarImage src={admin?.avatar_url ?? undefined} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {admin?.display_name?.charAt(0) ?? 'A'}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{admin?.display_name ?? 'Unknown'}</span>
          </div>
        );
      },
    }),
    columnHelper.accessor('action', {
      header: 'การกระทำ',
      cell: ({ row }) => getActionBadge(row.original.action),
    }),
    columnHelper.accessor('target_type', {
      header: 'เป้าหมาย',
      cell: ({ row }) => {
        const details = row.original.details as Record<string, string>;
        return (
          <div className="text-sm">
            <div>{row.original.target_type ?? '-'}</div>
            {details.reason && (
              <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                เหตุผล: {details.reason}
              </div>
            )}
          </div>
        );
      },
    }),
    columnHelper.accessor('details', {
      header: 'รายละเอียด',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground line-clamp-1">
          {getDetailText(row.original.details, row.original.target_type)}
        </span>
      ),
    }),
  ], []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:justify-between sm:items-center">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{logs.length} รายการ</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => handleExportExcel(false)} className="rounded-xl gap-2 self-end">
          <Download className="h-4 w-4" /> Export Excel
        </Button>
      </div>

      <AdminDataTable
        data={filteredLogs}
        columns={columns}
        pageSize={15}
        searchable
        searchPlaceholder="ค้นหาการกระทำ, แอดมิน, รายละเอียด..."
        onSearchChange={setSearchQuery}
        searchQuery={searchQuery}
        emptyMessage="ไม่พบบันทึก"
      />
    </div>
  );
}