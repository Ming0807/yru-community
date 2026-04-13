'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Ban, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { Profile } from '@/types';

interface AdminUserActionsProps {
  user: Profile;
}

type ActionType = 'promote_admin' | 'demote' | 'suspend' | 'activate' | 'ban';

export function AdminUserActions({ user }: AdminUserActionsProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirmAction, setConfirmAction] = useState<ActionType | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<Profile> }) => {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, updates }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => {
      toast.success('อัปเดตสำเร็จ');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setIsDialogOpen(false);
      router.refresh();
    },
    onError: () => {
      toast.error('เกิดข้อผิดพลาด');
    },
  });

  const handleAction = (action: ActionType) => {
    setConfirmAction(action);
    setIsDialogOpen(true);
  };

  const executeAction = () => {
    if (!confirmAction) return;

    const updates: Partial<Profile> = {};
    switch (confirmAction) {
      case 'promote_admin':
        updates.role = 'admin';
        break;
      case 'demote':
        updates.role = 'user';
        break;
      case 'suspend':
        updates.status = 'suspended';
        break;
      case 'activate':
        updates.status = 'active';
        break;
      case 'ban':
        updates.status = 'banned';
        break;
    }

    mutation.mutate({ userId: user.id, updates });
  };

  const getConfirmMessage = () => {
    switch (confirmAction) {
      case 'promote_admin':
        return `ต้องการตั้ง ${user.display_name} เป็นแอดมิน?`;
      case 'demote':
        return `ต้องการถอด ${user.display_name} จากแอดมิน?`;
      case 'suspend':
        return `ต้องการระงับ ${user.display_name} ชั่วคราว?`;
      case 'activate':
        return `ต้องการยกเลิกการระงับ ${user.display_name}?`;
      case 'ban':
        return `ต้องการแบน ${user.display_name} ถาวร?`;
      default:
        return '';
    }
  };

  return (
    <>
      <div className="rounded-2xl border bg-card p-4 shadow-sm mb-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Shield className="h-4 w-4 text-[var(--color-yru-pink)]" />
          จัดการผู้ใช้
        </h2>
        <div className="flex flex-wrap gap-2">
          {user.role !== 'admin' ? (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl gap-2"
              onClick={() => handleAction('promote_admin')}
            >
              <Shield className="h-4 w-4 text-purple-500" />
              ตั้งแอดมิน
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl gap-2"
              onClick={() => handleAction('demote')}
            >
              <Shield className="h-4 w-4" />
              ถอดแอดมิน
            </Button>
          )}

          {user.status === 'active' ? (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl gap-2"
              onClick={() => handleAction('suspend')}
            >
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              ระงับชั่วคราว
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl gap-2"
              onClick={() => handleAction('activate')}
            >
              <CheckCircle className="h-4 w-4 text-green-500" />
              ยกเลิกระงับ
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="rounded-xl gap-2 text-red-600 hover:text-red-600 hover:bg-red-50"
            onClick={() => handleAction('ban')}
          >
            <Ban className="h-4 w-4" />
            แบนถาวร
          </Button>
        </div>

        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">สถานะปัจจุบัน:</span>
            {user.status === 'active' && (
              <Badge className="bg-green-100 text-green-700">ใช้งาน</Badge>
            )}
            {user.status === 'suspended' && (
              <Badge variant="outline" className="border-orange-500 text-orange-500">ระงับชั่วคราว</Badge>
            )}
            {user.status === 'banned' && (
              <Badge variant="destructive">แบนถาวร</Badge>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการดำเนินการ</DialogTitle>
            <DialogDescription>{getConfirmMessage()}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              variant={confirmAction === 'ban' ? 'destructive' : 'default'}
              onClick={executeAction}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              ยืนยัน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}