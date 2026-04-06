'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, ExternalLink, MessageSquare, FileText, CheckCircle, Flag } from 'lucide-react';
import { toast } from 'sonner';
import { timeAgo } from '@/lib/utils';

interface ReportItem {
  id: string;
  post_id: string | null;
  comment_id: string | null;
  reporter_id: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved';
  created_at: string;
  reporter: { display_name: string } | null;
  post: { title: string } | null;
  comment: { content: string } | null;
}

interface Props {
  initialReports: ReportItem[];
}

export default function AdminReportsClient({ initialReports }: Props) {
  const [reports, setReports] = useState<ReportItem[]>(initialReports);

  const resolveReport = async (reportId: string) => {
    try {
      const res = await fetch('/api/admin/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, action: 'resolve' }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed');
      }

      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: 'resolved' as const } : r))
      );

      toast.success('ทำเครื่องหมายว่าจัดการแล้ว');
    } catch {
      toast.error('เกิดข้อผิดพลาดในการจัดการรายงาน');
    }
  };

  const deleteContentAndReport = async (report: ReportItem) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบเนื้อหานี้และปิดรายงาน?')) return;

    try {
      const res = await fetch('/api/admin/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: report.id, action: 'delete_content' }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed');
      }

      setReports((prev) => prev.filter((r) => r.id !== report.id));
      toast.success('ลบเนื้อหาและจัดการรายงานสำเร็จ');
    } catch {
      toast.error('เกิดข้อผิดพลาดในการลบเนื้อหา');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Flag className="h-6 w-6 text-red-500" />
          รายงานปัญหา
        </h1>
        <p className="text-muted-foreground">
          ตรวจสอบรายงานเนื้อหาที่ผิดกฎหรือนโยบาย ({reports.length} รายการ)
        </p>
      </div>

      <div className="rounded-2xl border border-border/60 bg-background overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b border-border/60">
              <tr>
                <th className="px-6 py-4 font-medium">เนื้อหาที่ถูกรายงาน</th>
                <th className="px-6 py-4 font-medium">ประเภท</th>
                <th className="px-6 py-4 font-medium">เหตุผลที่แจ้ง</th>
                <th className="px-6 py-4 font-medium">ผู้แจ้ง</th>
                <th className="px-6 py-4 font-medium">วันที่แจ้ง</th>
                <th className="px-6 py-4 font-medium text-right">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <Flag className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    ไม่มีรายงานใหม่ 🎉
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 max-w-[250px]">
                      {report.post_id ? (
                        <div className="truncate font-medium text-foreground">
                          {report.post?.title || <span className="text-muted-foreground italic">กระทู้ถูกลบไปแล้ว</span>}
                        </div>
                      ) : (
                        <div className="truncate text-foreground">
                          {report.comment?.content?.replace(/<[^>]+>/g, '') || <span className="text-muted-foreground italic">ความคิดเห็นถูกลบไปแล้ว</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {report.post_id ? (
                        <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-600 border-green-500/20">
                          <FileText className="h-3 w-3" /> กระทู้
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 bg-purple-500/10 text-purple-600 border-purple-500/20">
                          <MessageSquare className="h-3 w-3" /> คอมเมนต์
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-red-600 font-medium text-xs">{report.reason}</span>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {report.reporter?.display_name || 'ไม่ทราบชื่อ'}
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {timeAgo(report.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {report.post_id && report.post && (
                          <Link href={`/post/${report.post_id}`} target="_blank">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          title="ละเว้น/จัดการแล้ว (mark resolved)"
                          className="h-8 w-8 text-muted-foreground hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-950"
                          onClick={() => resolveReport(report.id)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        {(report.post || report.comment) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="ลบเนื้อหานี้"
                            className="h-8 w-8 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                            onClick={() => deleteContentAndReport(report)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
