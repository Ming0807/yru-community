'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, ChevronDown } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Admin Dashboard Error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 space-y-6">
      <div className="rounded-full bg-red-100 p-4 dark:bg-red-900/30">
        <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
      </div>
      
      <div className="text-center max-w-lg">
        <h2 className="text-2xl font-bold tracking-tight mb-2">เกิดข้อผิดพลาดในการโหลดข้อมูล</h2>
        <p className="text-muted-foreground mb-6">
          เซิร์ฟเวอร์ตอบสนองผิดพลาด อาจเกิดจากการเชื่อมต่อฐานข้อมูลล้มเหลว หรือ เซสชั่นหมดอายุ
        </p>
        
        <div className="flex justify-center gap-4">
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline"
            className="rounded-xl"
          >
            โหลดหน้าใหม่ (F5)
          </Button>
          <Button 
            onClick={() => reset()} 
            className="rounded-xl gap-2 bg-(--color-yru-pink) hover:bg-(--color-yru-pink-dark) text-white"
          >
            <RefreshCw className="h-4 w-4" /> ลองอีกครั้ง
          </Button>
        </div>
      </div>

      <Collapsible className="w-full max-w-lg mt-8 rounded-xl border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20">
        <CollapsibleTrigger className="flex w-full items-center justify-between p-4 font-medium text-red-800 dark:text-red-400 hover:opacity-80">
          <span>ดูรายละเอียด Debug</span>
          <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4">
          <pre className="mt-2 rounded-lg bg-red-950/10 dark:bg-black/50 p-4 text-xs text-red-900 dark:text-red-300 overflow-auto max-h-40 whitespace-pre-wrap font-mono">
            {error.message || 'ไม่มีข้อความอธิบายข้อผิดพลาด\nโปรดตรวจสอบ Network tab หรือเซิร์ฟเวอร์ log'}
          </pre>
          <div className="mt-3 text-xs opacity-70 text-red-800 dark:text-red-400">
            Digest: {error.digest || 'N/A'}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
