import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);

    const action = searchParams.get('action');
    const cacheType = searchParams.get('type');
    const cacheKey = searchParams.get('key');

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin' && profile?.role !== 'moderator') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (action === 'stats') {
      const { data: stats, error } = await supabase.rpc('get_cache_stats');
      if (error) throw error;

      const { data: totalCount } = await supabase
        .from('query_cache')
        .select('*', { count: 'exact', head: true })
        .gt('expires_at', new Date().toISOString());

      return NextResponse.json({
        stats: stats || [],
        total_active_entries: totalCount || 0,
      });
    }

    if (action === 'entries') {
      let query = supabase
        .from('active_cache_entries')
        .select('*')
        .limit(50);

      if (cacheType) {
        query = query.eq('cache_type', cacheType);
      }

      const { data: entries, error } = await query;
      if (error) throw error;

      return NextResponse.json({ entries: entries || [] });
    }

    if (cacheKey) {
      const { data: entry, error } = await supabase
        .from('query_cache')
        .select('*')
        .eq('cache_key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (entry) {
        await supabase.rpc('invalidate_cache', { p_cache_key: cacheKey });
        return NextResponse.json({
          success: true,
          message: 'Cache entry refreshed',
          entry: entry.cache_data
        });
      }
    }

    return NextResponse.json({ error: 'Invalid action or key' }, { status: 400 });
  } catch (error) {
    console.error('[Cache API] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();
    const { action, cache_key, cache_type, tags, ttl_seconds, data } = body;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (action === 'set') {
      if (!cache_key || !data) {
        return NextResponse.json({ error: 'cache_key and data required' }, { status: 400 });
      }

      const ttl = ttl_seconds || 300;
      const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
      const tagArray = tags || [];

      const { error } = await supabase
        .from('query_cache')
        .upsert({
          cache_key,
          cache_type: cache_type || 'general',
          cache_data: data,
          expires_at: expiresAt,
          tags: tagArray,
          created_at: new Date().toISOString(),
          hit_count: 0,
        }, { onConflict: 'cache_key' });

      if (error) throw error;

      for (const tag of tagArray) {
        await supabase
          .from('cache_tags')
          .upsert({ tag, cache_key }, { onConflict: 'tag,cache_key' });
      }

      return NextResponse.json({
        success: true,
        message: `Cache set for ${ttl} seconds`,
        cache_key,
        expires_at: expiresAt
      });
    }

    if (action === 'invalidate') {
      if (cache_key) {
        await supabase.rpc('invalidate_cache', { p_cache_key: cache_key });
        return NextResponse.json({ success: true, message: 'Cache invalidated', cache_key });
      }

      if (tags && Array.isArray(tags)) {
        await supabase.rpc('invalidate_cache_by_tags', { p_tags: tags });
        return NextResponse.json({ success: true, message: 'Cache invalidated by tags', tags });
      }

      if (cache_type) {
        await supabase.rpc('invalidate_cache_by_type', { p_cache_type: cache_type });
        return NextResponse.json({ success: true, message: 'Cache invalidated by type', cache_type });
      }

      return NextResponse.json({ error: 'cache_key, tags, or cache_type required' }, { status: 400 });
    }

    if (action === 'clean') {
      const { data: deleted } = await supabase.rpc('clean_expired_cache');
      return NextResponse.json({
        success: true,
        message: 'Expired cache cleaned',
        deleted_entries: deleted
      });
    }

    if (action === 'warmup') {
      await supabase.rpc('warmup_common_caches');
      return NextResponse.json({
        success: true,
        message: 'Cache warmup initiated'
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[Cache API POST] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}