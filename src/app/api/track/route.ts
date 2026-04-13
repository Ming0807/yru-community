import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    const {
      event_type,
      event_data = {},
      session_id,
      page_path,
      referrer,
      device_type,
      browser,
      os,
      scroll_depth,
      time_on_page,
      hover_duration,
      post_id,
      category_id,
      ad_id,
      ad_impression_id,
      ad_position,
      ad_visibility,
      event_timestamp
    } = body;

    if (!event_type) {
      return NextResponse.json({ error: 'event_type required' }, { status: 400 });
    }

    const supabase = await createClient();

    const eventRecord = {
      event_type,
      event_data,
      session_id: session_id || null,
      page_path: page_path || null,
      referrer: referrer || null,
      device_type: device_type || null,
      browser: browser || null,
      os: os || null,
      scroll_depth: scroll_depth || null,
      time_on_page: time_on_page || null,
      hover_duration: hover_duration || null,
      post_id: post_id || null,
      category_id: category_id || null,
      ad_id: ad_id || null,
      ad_impression_id: ad_impression_id || null,
      ad_position: ad_position || null,
      ad_visibility: ad_visibility || null,
      event_timestamp: event_timestamp ? new Date(event_timestamp).toISOString() : new Date().toISOString()
    };

    const { error } = await supabase
      .from('user_analytics_events')
      .insert([eventRecord]);

    if (error) {
      console.error('[Track] Insert error:', error);
      return NextResponse.json({ error: 'Failed to track event' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Track] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
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

    const { searchParams } = new URL(req.url);
    const eventType = searchParams.get('event_type');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('user_analytics_events')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[Track GET] Fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    }

    return NextResponse.json({
      events: data,
      total: count,
      limit,
      offset
    });
  } catch (error) {
    console.error('[Track GET] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}