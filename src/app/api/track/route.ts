import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const CUSTOM_EVENT_TYPES = [
  'form_submit', 'video_view', 'share', 'download',
  'search', 'print', 'external_click'
];

function parseEvent(body: Record<string, unknown>) {
  const {
    event_id,
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

  return {
    event_id: event_id || null,
    event_type: event_type as string,
    event_data: event_data as Record<string, unknown>,
    session_id: session_id || null,
    page_path: page_path || null,
    referrer: referrer || null,
    device_type: device_type || null,
    browser: browser || null,
    os: os || null,
    scroll_depth: scroll_depth ? Number(scroll_depth) : null,
    time_on_page: time_on_page ? Number(time_on_page) : null,
    hover_duration: hover_duration ? Number(hover_duration) : null,
    post_id: post_id || null,
    category_id: category_id ? Number(category_id) : null,
    ad_id: ad_id || null,
    ad_impression_id: ad_impression_id || null,
    ad_position: ad_position || null,
    ad_visibility: ad_visibility || null,
    event_timestamp: event_timestamp ? new Date(event_timestamp as string).toISOString() : new Date().toISOString(),
  };
}

function parseCustomEvent(body: Record<string, unknown>) {
  const {
    event_type,
    session_id,
    anonymous_id,
    user_id,
    page_path,
    referrer,
    device_type,
    browser,
    os,
    form_id, form_name, form_type,
    video_id, video_title, duration_watched, total_duration, progress_percent,
    content_type, content_id, share_method,
    file_id, file_name, file_type, file_size,
    search_query, results_count,
    url, link_text,
    event_data = {},
    event_timestamp
  } = body;

  return {
    event_type: event_type as string,
    session_id: session_id || null,
    anonymous_id: anonymous_id || null,
    user_id: user_id || null,
    page_path: page_path || null,
    referrer: referrer || null,
    device_type: device_type || null,
    browser: browser || null,
    os: os || null,
    form_id: form_id || null,
    form_name: form_name || null,
    form_type: form_type || null,
    video_id: video_id || null,
    video_title: video_title || null,
    duration_watched: duration_watched ? Number(duration_watched) : null,
    total_duration: total_duration ? Number(total_duration) : null,
    progress_percent: progress_percent ? Number(progress_percent) : null,
    content_type: content_type || null,
    content_id: content_id || null,
    share_method: share_method || null,
    file_id: file_id || null,
    file_name: file_name || null,
    file_type: file_type || null,
    file_size: file_size ? Number(file_size) : null,
    search_query: search_query || null,
    results_count: results_count ? Number(results_count) : null,
    url: url || null,
    link_text: link_text || null,
    event_data: event_data as Record<string, unknown>,
    event_timestamp: event_timestamp ? new Date(event_timestamp as string).toISOString() : new Date().toISOString(),
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = await createClient();
    const eventType = body.event_type as string;

    if (body.batch && Array.isArray(body.events)) {
      const standardEvents = body.events.filter((e: Record<string, unknown>) => !CUSTOM_EVENT_TYPES.includes(e.event_type as string));
      const customEvents = body.events.filter((e: Record<string, unknown>) => CUSTOM_EVENT_TYPES.includes(e.event_type as string));

      let standardCount = 0;
      let customCount = 0;

      if (standardEvents.length > 0) {
        const eventRecords = standardEvents.map(parseEvent);
        const { error } = await supabase
          .from('user_analytics_events')
          .insert(eventRecords);
        if (error) {
          console.error('[Track] Batch insert error:', error);
          return NextResponse.json({ error: 'Failed to track batch events' }, { status: 500 });
        }
        standardCount = eventRecords.length;
      }

      if (customEvents.length > 0) {
        const customRecords = customEvents.map(parseCustomEvent);
        const { error } = await supabase
          .from('custom_events')
          .insert(customRecords);
        if (error) {
          console.error('[Track] Custom events insert error:', error);
          return NextResponse.json({ error: 'Failed to track custom events' }, { status: 500 });
        }
        customCount = customRecords.length;
      }

      return NextResponse.json({ success: true, standard: standardCount, custom: customCount });
    }

    if (CUSTOM_EVENT_TYPES.includes(eventType)) {
      const customRecord = parseCustomEvent(body);
      const { error } = await supabase
        .from('custom_events')
        .insert([customRecord]);

      if (error) {
        console.error('[Track] Custom event insert error:', error);
        return NextResponse.json({ error: 'Failed to track custom event' }, { status: 500 });
      }

      return NextResponse.json({ success: true, custom: true });
    }

    const eventRecord = parseEvent(body);

    if (!eventRecord.event_type) {
      return NextResponse.json({ error: 'event_type required' }, { status: 400 });
    }

    if (eventRecord.event_id) {
      try {
        const { data: existing } = await supabase
          .from('user_analytics_events')
          .select('id')
          .eq('event_id', eventRecord.event_id)
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (existing && existing.length > 0) {
          return NextResponse.json({ success: true, deduplicated: true });
        }
      } catch (err) {
        console.warn('[Track] Deduplication skipped:', err);
      }
    }

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
    const customOnly = searchParams.get('custom') === 'true';
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (customOnly) {
      let query = supabase
        .from('custom_events')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (eventType) {
        query = query.eq('event_type', eventType);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('[Track GET] Custom events fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
      }

      return NextResponse.json({
        events: data,
        total: count,
        limit,
        offset,
        custom: true
      });
    }

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