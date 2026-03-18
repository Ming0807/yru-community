import { Loader2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';

export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center text-muted-foreground pb-24">
        <Loader2 className="w-10 h-10 animate-spin text-[var(--color-yru-pink)] mb-4" />
        <p className="text-sm font-medium animate-pulse">กำลังโหลดข้อมูล...</p>
      </main>
      <MobileNav />
    </div>
  );
}
