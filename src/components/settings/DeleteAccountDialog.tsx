'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface DeleteAccountDialogProps {
  userId: string;
}

export default function DeleteAccountDialog({ userId }: DeleteAccountDialogProps) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleDelete = async () => {
    if (confirmText !== 'ลบบัญชีของฉัน') {
      toast.error('กรุณาพิมพ์ "ลบบัญชีของฉัน" เพื่อยืนยัน');
      return;
    }

    setDeleting(true);
    try {
      const { error } = await supabase.rpc('delete_user_account', {
        p_user_id: userId,
      });

      if (error) throw error;

      // Sign out
      await supabase.auth.signOut();
      toast.success('ลบบัญชีเรียบร้อยแล้ว');
      router.push('/');
    } catch (error: any) {
      console.error('Delete account error:', error);
      toast.error(error.message || 'ไม่สามารถลบบัญชีได้');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive rounded-xl">
          <Trash2 className="h-4 w-4" />
          ลบบัญชี
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <DialogTitle className="text-destructive">ลบบัญชีถาวร</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            การกระทำนี้ไม่สามารถยกเลิกได้ ข้อมูลทั้งหมดของคุณจะถูกลบหรือทำให้ไม่ระบุตัวตน:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>โปรไฟล์และข้อมูลส่วนตัวจะถูกลบ</li>
            <li>กระทู้ของคุณจะถูกทำให้ไม่ระบุตัวตน</li>
            <li>ความคิดเห็นของคุณจะถูกทำให้ไม่ระบุตัวตน</li>
            <li>ข้อความทั้งหมดจะถูกลบ</li>
            <li>การแจ้งเตือนและการติดตามจะถูกลบ</li>
          </ul>
          <div className="space-y-2 pt-2">
            <label className="text-sm font-medium text-destructive">
              พิมพ์ &quot;ลบบัญชีของฉัน&quot; เพื่อยืนยัน
            </label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="ลบบัญชีของฉัน"
              className="rounded-xl"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => { setOpen(false); setConfirmText(''); }}
            disabled={deleting}
            className="rounded-xl"
          >
            ยกเลิก
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting || confirmText !== 'ลบบัญชีของฉัน'}
            className="gap-2 rounded-xl"
          >
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                กำลังลบ...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                ลบบัญชีถาวร
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
