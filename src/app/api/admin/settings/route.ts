import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    let supabase;
    try {
      supabase = getAdminClient();
    } catch (e: any) {
      console.error('[Settings] Admin client error:', e);
      return NextResponse.json({ error: 'Server configuration error (Service Role Key missing)' }, { status: 500 });
    }

    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .order('key', { ascending: true });

    if (error) {
      console.error('[Settings] Fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    }

    const settings: Record<string, any> = {};
    for (const s of (data ?? [])) {
      try {
        settings[s.key] = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
      } catch {
        settings[s.key] = s.value;
      }
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('[Settings] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    let supabase;
    try {
      supabase = getAdminClient();
    } catch (e: any) {
      console.error('[Settings] Admin client error:', e);
      return NextResponse.json({ error: 'Server configuration error (Service Role Key missing)' }, { status: 500 });
    }

    const { user } = auth;
    const body = await req.json();

    for (const [key, value] of Object.entries(body)) {
      const jsonValue = typeof value === 'string' ? value : JSON.stringify(value);
      const { error } = await supabase
        .from('site_settings')
        .upsert({
          key,
          value: jsonValue,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'key' });

      if (error) {
        console.error('[Settings] Update error:', error);
        return NextResponse.json({ error: `Failed to update ${key}` }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Settings] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}