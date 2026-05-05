import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, getClientIp, rateLimitHeaders } from '@/lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';

const MAX_QUERY_LENGTH = 80;
const MAX_LIMIT = 12;

interface PostSuggestionRow {
  id: string;
  author_id: string;
  title: string;
  created_at: string;
  is_anonymous: boolean;
}

interface ProfileRow {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

function normalizeQuery(value: string | null): string {
  return (value || '')
    .trim()
    .replace(/[\u0000-\u001F%_,()"'\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, MAX_QUERY_LENGTH);
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const { searchParams } = new URL(request.url);
  const query = normalizeQuery(searchParams.get('q'));
  const limit = Math.min(
    Math.max(Number.parseInt(searchParams.get('limit') || '8', 10) || 8, 1),
    MAX_LIMIT
  );

  if (query.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const rateLimit = checkRateLimit(`search:${ip}:${query.toLowerCase()}`, {
    limit: 45,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many search requests' },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    );
  }

  try {
    const supabase = await createClient();
    const pattern = `%${query}%`;

    const { data: posts, error } = await supabase
      .from('posts')
      .select('id, author_id, title, created_at, is_anonymous')
      .eq('is_draft', false)
      .is('deleted_at', null)
      .or(`title.ilike.${pattern},content_text.ilike.${pattern}`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[Search API] posts query error:', error);
      return NextResponse.json({ error: 'Failed to search' }, { status: 500 });
    }

    const postRows = (posts || []) as PostSuggestionRow[];
    const authorIds = [...new Set(postRows.map((post) => post.author_id).filter(Boolean))];
    const profileMap = new Map<string, ProfileRow>();

    if (authorIds.length > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', authorIds);

      if (profileError) {
        console.warn('[Search API] profile lookup skipped:', profileError);
      }

      for (const profile of (profiles || []) as ProfileRow[]) {
        profileMap.set(profile.id, profile);
      }
    }

    const suggestions = postRows.map((post) => ({
      id: post.id,
      title: post.title,
      created_at: post.created_at,
      is_anonymous: post.is_anonymous,
      author: post.is_anonymous ? null : profileMap.get(post.author_id) || null,
    }));

    return NextResponse.json({ suggestions }, { headers: rateLimitHeaders(rateLimit) });
  } catch (error) {
    console.error('[Search API] error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
