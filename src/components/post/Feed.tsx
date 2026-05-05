import InfiniteFeed from '@/components/post/InfiniteFeed';
import { createClient } from '@/lib/supabase/server';
import { POSTS_PER_PAGE } from '@/lib/constants';
import type { Ad, Post, SortOption } from '@/types';

interface FeedProps {
  sort: SortOption;
  page: number;
}

export default async function Feed({ sort, page }: FeedProps) {
  const offset = (page - 1) * POSTS_PER_PAGE;
  const supabase = await createClient();

  // Build query
  let query = supabase
    .from('posts')
    .select('*, author:profiles!posts_author_id_fkey(display_name, avatar_url, id, faculty), category:categories!posts_category_id_fkey(id, name, slug, icon)', { count: 'exact' })
    .eq('is_draft', false)
    .is('deleted_at', null);

  // Sort
  query = query.order('is_pinned', { ascending: false }); // Pinned posts always first

  if (sort === 'top') {
    query = query.order('vote_count', { ascending: false });
  } else if (sort === 'unanswered') {
    query = query.eq('comment_count', 0).order('created_at', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  query = query.range(offset, offset + POSTS_PER_PAGE - 1);

  const { data: posts, count, error } = await query;

  if (error) {
    console.error('[Feed] Query error:', error);
  }

  // Fetch active feed ads
  const { data: ads } = await supabase
    .from('ads')
    .select('*')
    .eq('is_active', true)
    .eq('position', 'feed');

  return (
    <InfiniteFeed
      initialPosts={(posts as Post[]) || []}
      totalCount={count ?? 0}
      sort={sort}
      ads={(ads as Ad[]) || []}
    />
  );
}
