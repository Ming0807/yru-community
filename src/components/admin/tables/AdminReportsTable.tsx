'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { createColumnHelper } from '@tanstack/react-table';
import * as XLSX from 'xlsx';
import { AdminDataTable } from '../AdminDataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, CheckCircle, XCircle, Download } from 'lucide-react';
import { toast } from 'sonner';

interface Report {
  id: string;
  post_id: string;
  post_title: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
}

interface AdminReportsTableProps {
  initialReports: Report[];
}

const columnHelper = createColumnHelper<Report>();

export function AdminReportsTable({ initialReports }: AdminReportsTableProps) {
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredReports = useMemo(() => {
    if (!searchQuery) return reports;
    const q = searchQuery.toLowerCase();
    return reports.filter(r => 
      r.post_title.toLowerCase().includes(q) || 
      r.reason.toLowerCase().includes(q)
    );
  }, [reports, searchQuery]);

  const handleResolve = useCallback(async (reportId: string) => {
    try {
      const res = await fetch('/api/admin/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, status: 'resolved' }),
      });
      if (!res.ok) throw new Error('Failed');
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'resolved' } : r));
      toast.success('อัปเดตสำเร็จ');
    } catch {
      toast.error('เกิดข้อผิดพลาด');
    }
  }, []);

  const handleDismiss = useCallback(async (reportId: string) => {
    try {
      const res = await fetch('/api/admin/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, status: 'dismissed' }),
      });
      if (!res.ok) throw new Error('Failed');
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'dismissed' } : r));
      toast.success('อัปเดตสำเร็จ');
    } catch {
      toast.error('เกิดข้อผิดพลาด');
    }
  }, []);

  const columns = useMemo(() => [
    columnHelper.accessor('post_title', {
      header: 'กระทู้',
      cell: ({ row }) => (
        <Link href={`/post/${row.original.post_id}`} className="hover:text-[var(--color-yru-pink)] hover:underline line-clamp-1">
          {row.original.post_title}
        </Link>
      ),
    }),
    columnHelper.accessor('reason', {
      header: 'เหตุผล',
      cell: ({ row }) => (
        <span className="line-clamp-2 text-muted-foreground">{row.original.reason}</span>
      ),
    }),
    columnHelper.accessor('status', {
      header: 'สถานะ',
      cell: ({ row }) => {
        const status = row.original.status;
        switch (status) {
          case 'pending':
            return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30">รอดำเนินการ</Badge>;
          case 'resolved':
            return <Badge variant="default" className="bg-green-100 text-green-700 dark:bg-green-900/30">แก้ไขแล้ว</Badge>;
          case 'dismissed':
            return <Badge variant="outline">ปัดทิ้ง</Badge>;
          default:
            return <Badge variant="outline">{status}</Badge>;
        }
      },
    }),
    columnHelper.accessor('created_at', {
      header: 'วันที่',
      cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString('th-TH'),
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const report = row.original;
        if (report.status !== 'pending') return null;
        return (
          <div className="flex items-center gap-1">
            <Link href={`/post/${report.post_id}`}>
              <Button variant="ghost" size="icon-sm" className="rounded-lg" title="ดูกระทู้">
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              size="icon-sm" 
              className="rounded-lg text-green-500"
              onClick={() => handleResolve(report.id)}
              title="แก้ไขแล้ว"
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon-sm" 
              className="rounded-lg text-red-500"
              onClick={() => handleDismiss(report.id)}
              title="ปัดทิ้ง"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    }),
  ], [handleResolve, handleDismiss]);

  const pendingCount = reports.filter(r => r.status === 'pending').length;

  const handleExport = useCallback(() => {
    const rows = filteredReports.map(r => ({
      'กระทู้': r.post_title,
      'เหตุผล': r.reason,
      'สถานะ': r.status === 'pending' ? 'รอดำเนินการ' : r.status === 'resolved' ? 'แก้ไขแล้ว' : 'ปัดทิ้ง',
      'วันที่': new Date(r.created_at).toLocaleDateString('th-TH'),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reports');
    XLSX.writeFile(wb, `reports_${new Date().toISOString().split('T')[0]}.xlsx`);
  }, [filteredReports]);

  return (
    <div className="space-y-4">
      {pendingCount > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <span className="text-red-600 dark:text-red-400 font-medium">
            {pendingCount} รายงานที่ต้องดำเนินการ
          </span>
        </div>
      )}
      
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExport} className="rounded-xl gap-2">
          <Download className="h-4 w-4" /> Export Excel
        </Button>
      </div>

      <AdminDataTable
        data={filteredReports}
        columns={columns}
        pageSize={15}
        searchable
        searchPlaceholder="ค้นหารายงาน..."
        onSearchChange={setSearchQuery}
        searchQuery={searchQuery}
        onRowClick={(report) => window.location.href = `/post/${report.post_id}`}
        emptyMessage="ไม่พบรายงาน"
      />
    </div>
  );
}