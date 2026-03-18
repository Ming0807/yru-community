import { createClient } from '@/lib/supabase/server';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import PostCard from '@/components/post/PostCard';
import SearchBar from '@/components/search/SearchBar';
import { Suspense } from 'react';
import type { Metadata } from 'next';

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const params = await searchParams;
  return {
    title: params.q ? `ค้นหา "${params.q}"` : 'ค้นหา',
  };
}

async function SearchResults({ query }: { query: string }) {
  const supabase = await createClient();

  const { data: posts } = await supabase
    .from('posts')
    .select('*, author:profiles(*), category:categories(*)')
    .textSearch('search_vector', query, { type: 'plain' })
    .order('created_at', { ascending: false })
    .limit(50);

  if (!posts || posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-5xl mb-4">🔍</span>
        <h3 className="font-semibold text-lg mb-1">ไม่พบผลลัพธ์</h3>
        <p className="text-sm text-muted-foreground">
          ลองค้นหาด้วยคำอื่น หรือใช้คำที่สั้นกว่านี้
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        พบ {posts.length} กระทู้
      </p>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q?.trim() ?? '';

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-3xl pb-24 sm:pb-8 px-4">
        {/* Mobile search bar */}
        <div className="py-4 md:hidden">
          <SearchBar />
        </div>

        {query ? (
          <>
            <h1 className="text-xl font-bold mb-4">
              ผลการค้นหา &quot;{query}&quot;
            </h1>
            <Suspense
              fallback={
                <div className="py-20 text-center text-muted-foreground">
                  กำลังค้นหา...
                </div>
              }
            >
              <SearchResults query={query} />
            </Suspense>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-5xl mb-4">🔎</span>
            <h3 className="font-semibold text-lg mb-1">ค้นหากระทู้</h3>
            <p className="text-sm text-muted-foreground">
              พิมพ์คำค้นหาเพื่อหากระทู้ ชีทสรุป รีวิววิชา
            </p>
          </div>
        )}
      </main>

      <MobileNav />
    </div>
  );
}
