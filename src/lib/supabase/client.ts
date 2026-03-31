import { createBrowserClient } from '@supabase/ssr';

// Singleton pattern: reuse the same Supabase client instance across the app
// This prevents auth race conditions where multiple instances independently
// try to verify sessions, causing intermittent empty query results.
let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (client) return client;

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return client;
}
