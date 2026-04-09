import { Suspense } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import CategoryTabs from '@/components/category/CategoryTabs';
import RightSidebar from '@/components/layout/RightSidebar';
import FAB from '@/components/FAB';
import Feed from '@/components/post/Feed';
import PostSkeleton from '@/components/post/PostSkeleton';
import type { SortOption } from '@/types';

export const dynamic = 'force-dynamic';

interface HomePageProps {
  searchParams: Promise<{ sort?: string; page?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const sort = (params.sort as SortOption) ?? 'latest';
  const page = parseInt(params.page ?? '1', 10);

  const sortOptions = [
    { value: 'latest', label: '🕐 ล่าสุด' },
    { value: 'top', label: '🔥 ยอดฮิต' },
    { value: 'unanswered', label: '💬 ยังไม่มีคนตอบ' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="mx-auto flex max-w-[1200px] items-start gap-8 pt-6 px-4 pb-24 sm:pb-8">
        <main className="flex-1 min-w-0">
          {/* Category Tabs */}
          <div className="-mx-4 sm:mx-0">
            <CategoryTabs />
          </div>

          {/* Sort Options */}
          <div className="flex items-center gap-2 pb-3 mt-4">
            {sortOptions.map((opt) => (
              <Link
                key={opt.value}
                href={`/?sort=${opt.value}`}
                prefetch={false}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  sort === opt.value
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {opt.label}
              </Link>
            ))}
          </div>

          {/* Feed with Suspense */}
          <div className="mt-2 min-h-[500px]">
            <Suspense
              key={`${sort}-${page}`}
              fallback={
                <div className="space-y-3">
                  <PostSkeleton />
                  <PostSkeleton />
                  <PostSkeleton />
                  <PostSkeleton />
                  <PostSkeleton />
                </div>
              }
            >
              <Feed sort={sort} page={page} />
            </Suspense>
          </div>
        </main>

        <RightSidebar />
      </div>

      <FAB />
      <MobileNav />
    </div>
  );
}
