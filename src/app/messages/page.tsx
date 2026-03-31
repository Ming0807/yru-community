import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import ChatApp from '@/components/messages/ChatApp';

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get current user profile for ChatApp
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 mx-auto w-full max-w-[1200px] pt-4 px-4 pb-20 sm:pb-4 flex flex-col min-h-0">
        <Suspense fallback={<div className="flex-1 flex items-center justify-center">กำลังโหลดรายชื่อผู้ติดต่อ...</div>}>
          <ChatApp currentUser={profile} />
        </Suspense>
      </main>

      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  );
}
