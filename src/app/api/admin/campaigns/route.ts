import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth'; // ✅ ใช้ requireAdmin ให้ตรงกับไฟล์อื่นในโปรเจกต์
import { getAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  try {
    // 🔐 เช็กสิทธิ์แอดมินก่อนดึงข้อมูลแคมเปญโฆษณา
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    let adminSupabase;
    try {
      adminSupabase = getAdminClient();
    } catch (e: any) {
      console.error('[Campaigns] Admin client error:', e);
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);

    const status = searchParams.get('status');
    const packageId = searchParams.get('package_id');

    let query = adminSupabase
      .from('ad_campaigns')
      .select(`
        *,
        package:ad_packages(id, name, tier, color),
        profile:profiles!approved_by(id, display_name)
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (packageId) {
      query = query.eq('package_id', packageId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Campaigns] Fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('[Campaigns] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // 🔐 เช็กสิทธิ์แอดมินก่อนสร้างแคมเปญใหม่
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    let adminSupabase;
    try {
      adminSupabase = getAdminClient();
    } catch (e: any) {
      console.error('[Campaigns] Admin client error:', e);
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const body = await req.json();

    const {
      campaign_name,
      advertiser_name,
      advertiser_contact,
      package_id,
      pricing_model,
      final_price,
      notes,
      start_date,
      end_date,
      target_faculties,
      target_interests,
      target_categories,
      target_years,
      target_genders,
      budget,
      daily_budget
    } = body;

    if (!campaign_name || !package_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await adminSupabase
      .from('ad_campaigns')
      .insert([{
        campaign_name,
        advertiser_name,
        advertiser_contact,
        package_id,
        pricing_model: pricing_model || 'fixed',
        final_price,
        notes,
        start_date: start_date ? new Date(start_date).toISOString() : null,
        end_date: end_date ? new Date(end_date).toISOString() : null,
        target_faculties: target_faculties || [],
        target_interests: target_interests || [],
        target_categories: target_categories || [],
        target_years: target_years || [],
        target_genders: target_genders || [],
        budget,
        daily_budget,
        status: 'pending_approval'
      }])
      .select()
      .single();

    if (error) {
      console.error('[Campaigns] Insert error:', error);
      return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Campaigns] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}