'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center pt-24 pb-32">
        <div className="animate-fade-in-up max-w-md w-full">
          <div className="bg-destructive/10 p-4 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            <AlertCircle className="w-12 h-12 text-destructive" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 text-foreground">
            โอ๊ะโอ! ระบบเกิดข้อผิดพลาด
          </h1>
          <p className="text-muted-foreground mb-8">
            ขออภัยในความไม่สะดวก เราพบปัญหาระหว่างการประมวลผลคำขอของคุณ
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              onClick={() => reset()}
              className="h-12 px-8 rounded-xl bg-gradient-to-r from-[var(--color-yru-pink)] to-[var(--color-yru-pink-dark)] text-white font-medium shadow-lg hover:opacity-90 transition-all"
            >
              ลองใหม่อีกครั้ง
            </Button>
          </div>
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
