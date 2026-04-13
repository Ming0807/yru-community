'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
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
  totalCount: number;
  currentPage?: number;
  pageSize?: number;
  statusFilter?: string;
}

const columnHelper = createColumnHelper<Report>();

export function AdminReportsTable({
  initialReports,
  totalCount,
  currentPage = 1,
  pageSize = 50,
  statusFilter,
}: AdminReportsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: reportsData, refetch } = useQuery({
    queryKey: ['admin', 'reports', 'list', currentPage, pageSize, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize),
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      const res = await fetch(`/api/admin/reports?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const result = await res.json();
      return result as { reports: Report[]; total: number; page: number; totalPages: number };
    },
    initialData: {
      reports: initialReports,
      total: totalCount,
      page: currentPage,
      totalPages: Math.ceil(totalCount / pageSize),
    },
    placeholderData: (prev) => prev,
  });

  const reports = reportsData?.reports ?? [];

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(newPage));
    router.push(`/admin/reports?${params.toString()}`);
  }, [router, searchParams]);

  const updateReportMutation = useMutation({
    mutationFn: async ({ reportId, action }: { reportId: string; action: 'resolve' | 'dismiss' }) => {
      const res = await fetch('/api/admin/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, action }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      toast.success('อัปเดตสำเร็จ');
      refetch();
    },
    onError: () => {
      toast.error('เกิดข้อผิดพลาด');
    },
  });

  const filteredReports = useMemo(() => {
    if (!searchQuery) return reports;
    const q = searchQuery.toLowerCase();
    return reports.filter(r =>
      r.post_title.toLowerCase().includes(q) ||
      r.reason.toLowerCase().includes(q)
    );
  }, [reports, searchQuery]);

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
              className="rounded-lg text-green-600 hover:text-green-700"
              title="แก้ไขแล้ว"
              onClick={() => updateReportMutation.mutate({ reportId: report.id, action: 'resolve' })}
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-lg text-red-500 hover:text-red-600"
              title="ปัดทิ้ง"
              onClick={() => updateReportMutation.mutate({ reportId: report.id, action: 'dismiss' })}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    }),
  ], [updateReportMutation]);

  const handleExport = useCallback((format: 'xlsx' | 'csv' = 'xlsx') => {
    const dataToExport = filteredReports;

    if (format === 'xlsx') {
      const rows = dataToExport.map(r => ({
        'กระทู้': r.post_title,
        'เหตุผล': r.reason,
        'สถานะ': r.status === 'pending' ? 'รอดำเนินการ' : r.status === 'resolved' ? 'แก้ไขแล้ว' : 'ปัดทิ้ง',
        'วันที่': new Date(r.created_at).toLocaleDateString('th-TH'),
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Reports');
      XLSX.writeFile(wb, `reports_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else {
      const headers = ['กระทู้', 'เหตุผล', 'สถานะ', 'วันที่'];
      const csvRows = dataToExport.map(r => [
        r.post_title,
        r.reason,
        r.status === 'pending' ? 'รอดำเนินการ' : r.status === 'resolved' ? 'แก้ไขแล้ว' : 'ปัดทิ้ง',
        new Date(r.created_at).toLocaleDateString('th-TH')
      ]);
      const csv = [headers, ...csvRows].map(r => r.map(c => `"${c || ''}"`).join(',')).join('\n');
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reports_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [filteredReports]);

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-2 sm:justify-between sm:items-center mb-4">
        <p className="text-sm text-muted-foreground">{reportsData?.total ?? totalCount} รายงาน</p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="rounded-xl gap-2">
              <Download className="h-4 w-4" /> Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleExport('xlsx')}>Excel (.xlsx)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('csv')}>CSV (.csv)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AdminDataTable
        data={filteredReports}
        columns={columns}
        pageSize={15}
        searchable
        searchPlaceholder="ค้นหารายงาน..."
        onSearchChange={handleSearch}
        searchQuery={searchQuery}
        onRowClick={(report) => window.location.href = `/post/${report.post_id}`}
        emptyMessage="ไม่พบรายงาน"
      />
    </>
  );
}

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';