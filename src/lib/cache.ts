import type { SupabaseClient } from '@supabase/supabase-js';

interface CachedQueryOptions {
  cacheKey: string;
  cacheType: string;
  ttlSeconds: number;
  tags?: string[];
  forceRefresh?: boolean;
}

export async function withCache<T>(
  supabase: SupabaseClient,
  options: CachedQueryOptions,
  queryFn: () => Promise<T>
): Promise<T> {
  const { cacheKey, cacheType, ttlSeconds, tags, forceRefresh } = options;

  if (forceRefresh) {
    await supabase.rpc('invalidate_cache', { p_cache_key: cacheKey });
    return queryFn();
  }

  const { data: cached, error } = await supabase
    .from('query_cache')
    .select('cache_data, hit_count')
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (!error && cached) {
    const nextHitCount = ((cached.hit_count as number | null) || 0) + 1;
    await supabase
      .from('query_cache')
      .update({
        hit_count: nextHitCount,
        last_hit_at: new Date().toISOString(),
      })
      .eq('cache_key', cacheKey);

    return cached.cache_data as T;
  }

  const data = await queryFn();

  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  await supabase
    .from('query_cache')
    .upsert({
      cache_key: cacheKey,
      cache_type: cacheType,
      cache_data: data,
      expires_at: expiresAt,
      tags: tags || [],
      created_at: new Date().toISOString(),
      hit_count: 0,
    }, { onConflict: 'cache_key' });

  return data;
}

export function generateCacheKey(
  prefix: string,
  params: Record<string, string | number | boolean | null | undefined>
): string {
  const sortedParams = Object.keys(params).sort()
    .filter(k => params[k] !== undefined && params[k] !== null)
    .map(k => `${k}=${params[k]}`)
    .join('&');
  return `${prefix}?${sortedParams}`;
}
