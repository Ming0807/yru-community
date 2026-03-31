'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Trash2, AlertTriangle, Pin, PinOff } from 'lucide-react';
import { toast } from 'sonner';

interface PostOptionsProps {
  postId: string;
  authorId: string;
  currentUserId?: string;
  isAdmin?: boolean;
  isPinned?: boolean;
  onReport?: () => void;
}

import ReportDialog from '@/components/ReportDialog';

export default function PostOptions({
  postId,
  authorId,
  currentUserId,
  isAdmin = false,
  isPinned = false,
}: PostOptionsProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);

  // Consider it an author if current user matches or if admin (we'll add admin role check later, for now just author)
  const isAuthor = currentUserId === authorId;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;
      toast.success('ลบกระทู้เรียบร้อยแล้ว');
      router.push('/');
      router.refresh();
    } catch {
      toast.error('ไม่สามารถลบกระทู้ได้ กรุณาลองใหม่');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleTogglePin = async () => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({ is_pinned: !isPinned })
        .eq('id', postId);
      if (error) throw error;
      toast.success(isPinned ? 'ปลดหมุดกระทู้เรียบร้อยแล้ว' : 'ปักหมุดกระทู้เรียบร้อยแล้ว');
      router.refresh();
    } catch {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
    }
  };

  if (!currentUserId) return null; // Guest shouldn't see options, or maybe just report

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
            <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 rounded-xl">
          {isAuthor && (
            <>
              <DropdownMenuItem
                onClick={() => router.push(`/post/${postId}/edit`)}
                className="gap-2 cursor-pointer"
              >
                <Edit className="h-4 w-4" /> แก้ไขกระทู้
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="gap-2 text-destructive focus:text-destructive cursor-pointer"
              >
                <Trash2 className="h-4 w-4" /> ลบกระทู้
              </DropdownMenuItem>
            </>
          )}
          
          {isAdmin && (
            <>
              {isAuthor && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onClick={handleTogglePin}
                className="gap-2 cursor-pointer text-orange-600 focus:text-orange-600"
              >
                {isPinned ? (
                  <><PinOff className="h-4 w-4" /> เลิกปักหมุดกระทู้</>
                ) : (
                  <><Pin className="h-4 w-4" /> ปักหมุดกระทู้</>
                )}
              </DropdownMenuItem>
            </>
          )}
          
          {!isAuthor && (
            <>
              {isAdmin && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onClick={() => setShowReportDialog(true)}
                className="gap-2 text-orange-600 focus:text-orange-600 cursor-pointer"
              >
                <AlertTriangle className="h-4 w-4" /> รายงานความไม่เหมาะสม
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ยืนยันการลบกระทู้</DialogTitle>
            <DialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการลบกระทู้นี้?
              การกระทำนี้จะลบคอมเมนต์ทั้งหมดด้วย และไม่สามารถย้อนกลับได้
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
              className="rounded-xl"
            >
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded-xl"
            >
              {isDeleting ? 'กำลังลบ...' : 'ลบกระทู้'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReportDialog
        isOpen={showReportDialog}
        onOpenChange={setShowReportDialog}
        postId={postId}
      />
    </>
  );
}
