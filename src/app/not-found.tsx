import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileQuestion } from 'lucide-react';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center pt-24 pb-32">
        <div className="animate-fade-in-up max-w-md w-full">
          <div className="bg-muted/30 p-4 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            <FileQuestion className="w-12 h-12 text-[var(--color-yru-pink)]" />
          </div>
          <h1 className="text-6xl font-bold tracking-tight mb-2 text-foreground">
            404
          </h1>
          <h2 className="text-2xl font-semibold mb-4 text-foreground/80">
            ไม่พบหน้าที่คุณตามหา
          </h2>
          <p className="text-muted-foreground mb-8">
            หน้าที่คุณกำลังพยายามเข้าถึงอาจถูกลบ ย้าย
            หรือไม่มีอยู่จริงในระบบของเรา
          </p>
          <Link href="/">
            <Button className="h-12 px-8 rounded-xl bg-gradient-to-r from-[var(--color-yru-pink)] to-[var(--color-yru-pink-dark)] text-white font-medium shadow-lg hover:opacity-90 transition-all">
              กลับสู่หน้าหลัก
            </Button>
          </Link>
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
