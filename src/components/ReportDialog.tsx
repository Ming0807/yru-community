'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface ReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  postId?: string;
  commentId?: string;
}

export default function ReportDialog({
  isOpen,
  onOpenChange,
  postId,
  commentId,
}: ReportDialogProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error('กรุณาระบุเหตุผลที่รายงาน');
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error('กรุณาเข้าสู่ระบบก่อนรายงาน');
        return;
      }

      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: postId,
          comment_id: commentId,
          reason: reason.trim(),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to report');
      }

      toast.success('แจ้งรายงานความไม่เหมาะสมเรียบร้อยแล้ว');
      setReason('');
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>รายงานความไม่เหมาะสม</DialogTitle>
          <DialogDescription>
            กรุณาระบุเหตุผลที่รายงานเนื้อหานี้ ทีมงานจะตรวจสอบและดำเนินการให้เร็วที่สุด
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            placeholder="อธิบายเหตุผล เช่น เนื้อหาไม่เหมาะสม, สแปม, คุกคามผู้อื่น..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-[100px] resize-none rounded-xl"
            maxLength={500}
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="rounded-xl"
          >
            ยกเลิก
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={submitting || !reason.trim()}
            className="rounded-xl"
          >
            {submitting ? 'กำลังส่ง...' : 'ส่งรายงาน'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
