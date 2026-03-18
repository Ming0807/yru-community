'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, ExternalLink, MessageSquare, FileText, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { timeAgo } from '@/lib/utils';

type ReportItem = {
  id: string;
  post_id: string | null;
  comment_id: string | null;
  reporter_id: string;
  reason: string;
  created_at: string;
  reporter: { display_name: string } | null;
  post: { title: string } | null;
  comment: { content: string } | null;
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('reports')
      .select(`
        *,
        reporter:profiles!reporter_id(display_name),
        post:posts(title),
        comment:comments(content)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('ไม่สามารถโหลดข้อมูลรายงานได้');
    } else {
      setReports(data as unknown as ReportItem[]);
    }
    setLoading(false);
  };

  const deleteReport = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;
      
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      toast.success('ทำเครื่องหมายว่าจัดการแล้ว');
    } catch {
      toast.error('เกิดข้อผิดพลาดในการจัดการรายงาน');
    }
  };

  const deleteContentAndReport = async (report: ReportItem) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบเนื้อหานี้และปิดรายงาน?')) return;

    try {
      if (report.post_id) {
        const { error } = await supabase.from('posts').delete().eq('id', report.post_id);
        if (error) throw error;
      } else if (report.comment_id) {
        const { error } = await supabase.from('comments').delete().eq('id', report.comment_id);
        if (error) throw error;
      }
      
      // Because of ON DELETE CASCADE, deleting the post/comment should automatically delete the report.
      // But we'll remove it from the UI.
      setReports((prev) => prev.filter((r) => r.id !== report.id));
      toast.success('ลบเนื้อหาและจัดการรายงานสำเร็จ');
    } catch {
      toast.error('เกิดข้อผิดพลาดในการลบเนื้อหา');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">รายงานปัญหา</h1>
          <p className="text-muted-foreground">
            ตรวจสอบรายงานเนื้อหาที่ผิดกฎหรือนโยบาย
          </p>
        </div>
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
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
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
                          {report.comment?.content.replace(/<[^>]+>/g, '') || <span className="text-muted-foreground italic">ความคิดเห็นถูกลบไปแล้ว</span>}
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
                          title="ละเว้น/จัดการแล้ว (ลบรายงาน)"
                          className="h-8 w-8 text-muted-foreground hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-950"
                          onClick={() => deleteReport(report.id)}
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
