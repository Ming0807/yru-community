import { createClient } from '@/lib/supabase/server';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import CategoryTabs from '@/components/category/CategoryTabs';
import PostCard from '@/components/post/PostCard';
import FAB from '@/components/FAB';
import { POSTS_PER_PAGE, CATEGORIES } from '@/lib/constants';
import type { Metadata } from 'next';
import type { SortOption } from '@/types';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; page?: string }>;
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const cat = CATEGORIES.find((c) => c.slug === slug);
  if (!cat) return { title: 'ไม่พบหมวดหมู่' };
  return {
    title: `${cat.icon} ${cat.name}`,
    description: `กระทู้ในหมวดหมู่ ${cat.name} - YRU Community`,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { slug } = await params;
  const sparams = await searchParams;
  const sort = (sparams.sort as SortOption) ?? 'latest';
  const page = parseInt(sparams.page ?? '1', 10);
  const offset = (page - 1) * POSTS_PER_PAGE;

  const cat = CATEGORIES.find((c) => c.slug === slug);
  if (!cat) notFound();

  const supabase = await createClient();

  // Get category ID
  const { data: dbCat } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', slug)
    .single();

  if (!dbCat) notFound();

  let query = supabase
    .from('posts')
    .select('*, author:profiles!posts_author_id_fkey(*), category:categories(*)', { count: 'exact' })
    .eq('category_id', dbCat.id)
    .eq('is_draft', false);

  if (sort === 'top') {
    query = query.order('vote_count', { ascending: false });
  } else if (sort === 'unanswered') {
    query = query.eq('comment_count', 0).order('created_at', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  query = query.range(offset, offset + POSTS_PER_PAGE - 1);

  const { data: posts, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / POSTS_PER_PAGE);

  const sortOptions = [
    { value: 'latest', label: '🕐 ล่าสุด' },
    { value: 'top', label: '🔥 ยอดฮิต' },
    { value: 'unanswered', label: '💬 ยังไม่มีคนตอบ' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-3xl pb-24 sm:pb-8">
        <CategoryTabs activeSlug={slug} />

        {/* Category Header */}
        <div className="px-4 pb-3">
          <h1 className="text-xl font-bold">
            {cat.icon} {cat.name}
          </h1>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 px-4 pb-3">
          {sortOptions.map((opt) => (
            <Link
              key={opt.value}
              href={`/category/${slug}?sort=${opt.value}`}
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

        {/* Posts */}
        <div className="space-y-3 px-4">
          {posts && posts.length > 0 ? (
            posts.map((post) => <PostCard key={post.id} post={post} />)
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <span className="text-5xl mb-4">📭</span>
              <h3 className="font-semibold text-lg mb-1">
                ยังไม่มีกระทู้ในหมวดนี้
              </h3>
              <p className="text-sm text-muted-foreground">
                เป็นคนแรกที่ตั้งกระทู้ใน{cat.name}!
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 px-4 py-8">
            {page > 1 && (
              <Link
                href={`/category/${slug}?sort=${sort}&page=${page - 1}`}
                prefetch={false}
                className="rounded-lg bg-muted px-4 py-2 text-sm hover:bg-muted/80"
              >
                ← ก่อนหน้า
              </Link>
            )}
            <span className="text-sm text-muted-foreground">
              หน้า {page} / {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={`/category/${slug}?sort=${sort}&page=${page + 1}`}
                prefetch={false}
                className="rounded-lg bg-muted px-4 py-2 text-sm hover:bg-muted/80"
              >
                ถัดไป →
              </Link>
            )}
          </div>
        )}
      </main>

      <FAB />
      <MobileNav />
    </div>
  );
}
