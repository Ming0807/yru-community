import { Loader2 } from 'lucide-react';

export default function AdminLoading() {
  return (
    <div className="flex h-[70vh] flex-col items-center justify-center space-y-4 animate-fade-in-up">
      <div className="relative">
        <div className="absolute inset-0 rounded-full blur-xl bg-(--color-yru-pink)/20 animate-pulse" />
        <Loader2 className="h-10 w-10 animate-spin text-(--color-yru-pink) relative z-10" />
      </div>
      <p className="text-muted-foreground animate-pulse text-sm font-medium">
        ระบบกำลังโหลดข้อมูล กรุณารอสักครู่...
      </p>
    </div>
  );
}
