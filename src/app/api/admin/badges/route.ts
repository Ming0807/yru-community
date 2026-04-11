import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getAdminClient } from '@/lib/supabase/admin';

// GET - Get all badges
export async function GET() {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    let supabase;
    try {
      supabase = getAdminClient();
    } catch (e: any) {
      console.error('[Badges] Admin client error:', e);
      return NextResponse.json({ error: 'Server configuration error (Service Role Key missing)' }, { status: 500 });
    }
    
    // Check if badges query works
    const badgesQuery = await supabase
      .from('badges')
      .select('*')
      .order('created_at', { ascending: false });

    if (badgesQuery.error) {
      console.error('[Badges] Fetch error:', badgesQuery.error);
      return NextResponse.json({ error: `Failed to fetch badges: ${badgesQuery.error.message}` }, { status: 500 });
    }

    // Get user badge counts
    const userBadgesQuery = await supabase
      .from('user_badges')
      .select('badge_id');

    if (userBadgesQuery.error) {
       console.error('[Badges] Fetch user_badges error:', userBadgesQuery.error);
       // We can just log it and default to empty so it doesn't break everything, or return error. Returning error is better to force fix.
       return NextResponse.json({ error: `Failed to fetch user_badges: ${userBadgesQuery.error.message}` }, { status: 500 });
    }

    const badgeCounts = (userBadgesQuery.data || []).reduce((acc, ub) => {
      acc[ub.badge_id] = (acc[ub.badge_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) ?? {};

    const badgesWithCounts = (badgesQuery.data ?? []).map(b => ({
      ...b,
      user_count: badgeCounts[b.id] || 0,
    }));

    return NextResponse.json(badgesWithCounts);
  } catch (error) {
    console.error('[Badges] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST - Create badge
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    let supabase;
    try {
      supabase = getAdminClient();
    } catch (e: any) {
      console.error('[Badges] Admin client error:', e);
      return NextResponse.json({ error: 'Server configuration error (Service Role Key missing)' }, { status: 500 });
    }

    const body = await req.json();
    const { name, description, icon, color, criteria } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('badges')
      .insert({ name, description, icon, color, criteria })
      .select()
      .single();

    if (error) {
      console.error('[Badges] Insert error:', error);
      return NextResponse.json({ error: 'Failed to create badge' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Badges] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}