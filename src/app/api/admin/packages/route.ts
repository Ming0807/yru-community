import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('active') === 'true';

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    let isAdmin = false;

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      isAdmin = profile?.role === 'admin' || profile?.role === 'moderator';
    }

    let adminSupabase;
    try {
      adminSupabase = getAdminClient();
    } catch (e: any) {
      console.error('[Packages] Admin client error:', e);
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Admin sees all packages, regular users only see active ones
    let query = adminSupabase
      .from('ad_packages')
      .select('*')
      .order('sort_order', { ascending: true });

    if (activeOnly || !isAdmin) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Packages] Fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('[Packages] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    let adminSupabase;
    try {
      adminSupabase = getAdminClient();
    } catch (e: any) {
      console.error('[Packages] Admin client error:', e);
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const body = await req.json();

    const {
      name,
      description,
      tier,
      base_price,
      price_per_impression,
      price_per_click,
      price_per_day,
      min_duration_days,
      max_duration_days,
      features,
      max_impressions,
      max_clicks,
      max_campaigns,
      targeting_included,
      color,
      icon,
      is_active,
      is_featured,
      sort_order
    } = body;

    if (!name || !tier || base_price === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await adminSupabase
      .from('ad_packages')
      .insert([{
        name,
        description,
        tier,
        base_price,
        price_per_impression,
        price_per_click,
        price_per_day,
        min_duration_days: min_duration_days || 7,
        max_duration_days: max_duration_days || 30,
        features: features || [],
        max_impressions,
        max_clicks,
        max_campaigns: max_campaigns || 1,
        targeting_included: targeting_included || [],
        color,
        icon,
        is_active: is_active ?? true,
        is_featured: is_featured ?? false,
        sort_order: sort_order || 0
      }])
      .select()
      .single();

    if (error) {
      console.error('[Packages] Insert error:', error);
      return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Packages] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    let adminSupabase;
    try {
      adminSupabase = getAdminClient();
    } catch (e: any) {
      console.error('[Packages] Admin client error:', e);
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Package ID required' }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await adminSupabase
      .from('ad_packages')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Packages] Update error:', error);
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Packages] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    let adminSupabase;
    try {
      adminSupabase = getAdminClient();
    } catch (e: any) {
      console.error('[Packages] Admin client error:', e);
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Package ID required' }, { status: 400 });
    }

    // Check if package is in use
    const { data: usage } = await adminSupabase
      .from('ad_campaigns')
      .select('id')
      .eq('package_id', id)
      .limit(1);

    if (usage && usage.length > 0) {
      // Soft delete - just deactivate
      await adminSupabase
        .from('ad_packages')
        .update({ is_active: false })
        .eq('id', id);
      
      return NextResponse.json({ message: 'Package deactivated (in use)' });
    }

    const { error } = await adminSupabase
      .from('ad_packages')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Packages] Delete error:', error);
      return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Packages] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}