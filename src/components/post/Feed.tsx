import Link from 'next/link';
import PostCard from '@/components/post/PostCard';
import InfiniteFeed from '@/components/post/InfiniteFeed';
import { createClient } from '@/lib/supabase/server';
import { POSTS_PER_PAGE } from '@/lib/constants';
import type { Post, SortOption } from '@/types';

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
    .select('*, author:profiles(*), category:categories(*)', { count: 'exact' });

  // Sort
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

  return (
    <InfiniteFeed
      initialPosts={(posts as Post[]) || []}
      totalCount={count ?? 0}
      sort={sort}
    />
  );
}
