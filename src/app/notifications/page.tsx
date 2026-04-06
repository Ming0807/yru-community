import { Suspense } from 'react';
import NotificationsPageClient from './NotificationsPageClient';

export const metadata = { title: 'การแจ้งเตือน | YRU Community' };

export default function NotificationsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <NotificationsPageClient />
    </Suspense>
  );
}

function Loader2({ className }: { className?: string }) {
  return <div className={className}>⏳</div>;
}
