import { createClient } from '@/lib/supabase/server';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import PostCard from '@/components/post/PostCard';
import PostSkeleton from '@/components/post/PostSkeleton';
import SearchBar from '@/components/search/SearchBar';
import { CATEGORIES } from '@/lib/constants';
import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';

interface SearchPageProps {
  searchParams: Promise<{ q?: string; category?: string; sort?: string; date?: string; author?: string }>;
}

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const params = await searchParams;
  return {
    title: params.q ? `ค้นหา "${params.q}"` : 'ค้นหา',
  };
}

async function SearchResults({ 
  query, 
  category, 
  sort,
  date,
  author
}: { 
  query: string; 
  category?: string;
  sort?: string;
  date?: string;
  author?: string;
}) {
  const supabase = await createClient();

  let dbQuery = supabase
    .from('posts')
    .select('*, author:profiles!posts_author_id_fkey(id, display_name, avatar_url, faculty), category:categories!posts_category_id_fkey(id, name, slug, icon)');

  // Text search
  if (query) {
    dbQuery = dbQuery.textSearch('search_vector', query, { type: 'plain' });
  }

  // Author filter
  if (author) {
    dbQuery = dbQuery.ilike('author.display_name', `%${author}%`);
  }

  // Category filter
  if (category) {
    const catIdx = CATEGORIES.findIndex(c => c.slug === category);
    if (catIdx !== -1) {
      dbQuery = dbQuery.eq('category_id', catIdx + 1);
    }
  }

  // Date filter
  if (date) {
    const now = new Date();
    let fromDate: Date;
    switch (date) {
      case 'today':
        fromDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        fromDate = new Date(0);
    }
    dbQuery = dbQuery.gte('created_at', fromDate.toISOString());
  }

  // Sort
  if (sort === 'top') {
    dbQuery = dbQuery.order('vote_count', { ascending: false });
  } else if (sort === 'comments') {
    dbQuery = dbQuery.order('comment_count', { ascending: false });
  } else {
    dbQuery = dbQuery.order('created_at', { ascending: false });
  }

  const { data: posts } = await dbQuery.limit(50);

  if (!posts || posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
        <span className="text-5xl mb-4">🔍</span>
        <h3 className="font-semibold text-lg mb-1">ไม่พบผลลัพธ์</h3>
        <p className="text-sm text-muted-foreground">
          ลองค้นหาด้วยคำอื่น หรือเปลี่ยนตัวกรอง
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <p className="text-sm text-muted-foreground font-medium">
        พบ {posts.length} กระทู้
      </p>
      <div className="space-y-3">
        {posts.map((post, index) => (
          <PostCard key={post.id} post={post} index={index} />
        ))}
      </div>
    </div>
  );
}

function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
        active
          ? 'bg-foreground text-background shadow-sm'
          : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      {children}
    </Link>
  );
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q?.trim() ?? '';
  const category = params.category ?? '';
  const sort = params.sort ?? 'latest';
  const date = params.date ?? '';
  const author = params.author ?? '';

  // Build URL helper
  const buildUrl = (overrides: Record<string, string>) => {
    const p = new URLSearchParams();
    if (query) p.set('q', query);
    if (category) p.set('category', category);
    if (sort && sort !== 'latest') p.set('sort', sort);
    if (date) p.set('date', date);
    if (author) p.set('author', author);
    Object.entries(overrides).forEach(([k, v]) => {
      if (v) p.set(k, v); else p.delete(k);
    });
    return `/search?${p.toString()}`;
  };

  const sortOptions = [
    { value: 'latest', label: '🕐 ล่าสุด' },
    { value: 'top', label: '🔥 ยอดฮิต' },
    { value: 'comments', label: '💬 คอมเมนต์เยอะ' },
  ];

  const dateOptions = [
    { value: '', label: 'ทั้งหมด' },
    { value: 'today', label: 'วันนี้' },
    { value: 'week', label: 'สัปดาห์นี้' },
    { value: 'month', label: 'เดือนนี้' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-3xl pb-24 sm:pb-8 px-4">
        {/* Mobile search bar */}
        <div className="py-4 md:hidden">
          <SearchBar />
        </div>

        {/* Page Title */}
        <h1 className="text-xl font-bold mb-4 animate-fade-in-up">
          {query ? `ผลการค้นหา "${query}"` : 'ค้นหากระทู้'}
        </h1>

        {/* Filters */}
        <div className="space-y-3 mb-6 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
          {/* Author search input */}
          <div className="flex gap-2">
            <form className="flex-1 flex gap-2" action="/search" method="GET">
              <input type="hidden" name="q" value={query} />
              <input type="hidden" name="category" value={category} />
              <input type="hidden" name="sort" value={sort !== 'latest' ? sort : ''} />
              <input type="hidden" name="date" value={date} />
              <input
                type="text"
                name="author"
                defaultValue={author}
                placeholder="ค้นหาตามชื่อผู้โพสต์..."
                className="flex-1 h-9 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button type="submit" className="px-3 py-1.5 rounded-xl bg-[var(--color-yru-pink)] text-white text-sm font-medium hover:opacity-90">
                ค้นหา
              </button>
            </form>
            {author && (
              <Link href={buildUrl({ author: '' })} className="px-3 py-1.5 rounded-xl border text-sm hover:bg-muted">
                ล้าง
              </Link>
            )}
          </div>

          {/* Category filter */}
          <div className="flex flex-wrap gap-1.5">
            <FilterChip href={buildUrl({ category: '' })} active={!category}>
              ทุกหมวด
            </FilterChip>
            {CATEGORIES.map((cat) => (
              <FilterChip
                key={cat.slug}
                href={buildUrl({ category: cat.slug })}
                active={category === cat.slug}
              >
                {cat.icon} {cat.name}
              </FilterChip>
            ))}
          </div>

          {/* Sort + Date filter row */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground font-medium">เรียง:</span>
              {sortOptions.map(opt => (
                <FilterChip
                  key={opt.value}
                  href={buildUrl({ sort: opt.value === 'latest' ? '' : opt.value })}
                  active={sort === opt.value}
                >
                  {opt.label}
                </FilterChip>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground font-medium">ช่วงเวลา:</span>
              {dateOptions.map(opt => (
                <FilterChip
                  key={opt.value}
                  href={buildUrl({ date: opt.value })}
                  active={date === opt.value}
                >
                  {opt.label}
                </FilterChip>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        {query || category ? (
          <Suspense
            fallback={
              <div className="space-y-3">
                <PostSkeleton />
                <PostSkeleton />
                <PostSkeleton />
              </div>
            }
          >
            <SearchResults query={query} category={category} sort={sort} date={date} author={author} />
          </Suspense>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
            <span className="text-5xl mb-4">🔎</span>
            <h3 className="font-semibold text-lg mb-1">ค้นหากระทู้</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              พิมพ์คำค้นหา หรือเลือกหมวดหมู่ด้านบนเพื่อกรองกระทู้
            </p>
          </div>
        )}
      </main>

      <MobileNav />
    </div>
  );
}
