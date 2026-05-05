import { createClient } from '@/lib/supabase/server';
import { requireModerator } from '@/lib/admin-auth';
import { checkRateLimit, getClientIp, rateLimitHeaders } from '@/lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';

const CUSTOM_EVENT_TYPES = [
  'form_submit', 'video_view', 'share', 'download',
  'search', 'print', 'external_click'
];

const MAX_BATCH_EVENTS = 25;
const MAX_EVENT_DATA_BYTES = 8 * 1024;
const EVENT_TYPE_PATTERN = /^[a-zA-Z0-9_.:-]{1,64}$/;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_EVENTS = 120;

class TrackValidationError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function readNumber(
  value: unknown,
  options: { min?: number; max?: number; integer?: boolean } = {}
): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return null;

  const rounded = options.integer ? Math.trunc(parsed) : parsed;
  const min = options.min ?? Number.NEGATIVE_INFINITY;
  const max = options.max ?? Number.POSITIVE_INFINITY;
  return Math.min(Math.max(rounded, min), max);
}

function readTimestamp(value: unknown): string {
  if (typeof value !== 'string') return new Date().toISOString();

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();

  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const timestamp = Math.min(Math.max(date.getTime(), now - oneDayMs), now + 5 * 60 * 1000);
  return new Date(timestamp).toISOString();
}

function readEventData(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) return {};

  const serialized = JSON.stringify(value);
  if (serialized.length > MAX_EVENT_DATA_BYTES) {
    throw new TrackValidationError('event_data too large', 413);
  }

  return value;
}

function readEventDataField(body: Record<string, unknown>, key: string): unknown {
  if (body[key] !== undefined) return body[key];
  return isRecord(body.event_data) ? body.event_data[key] : undefined;
}

function readEventType(body: Record<string, unknown>): string {
  const eventType = readString(body.event_type, 64);
  if (!eventType || !EVENT_TYPE_PATTERN.test(eventType)) {
    throw new TrackValidationError('valid event_type required');
  }
  return eventType;
}

function getRateLimitIdentity(body: Record<string, unknown>, ip: string): string {
  if (body.batch && Array.isArray(body.events)) {
    const firstEvent = body.events.find(isRecord);
    if (firstEvent) {
      return readString(firstEvent.session_id, 80) || readString(firstEvent.anonymous_id, 80) || ip;
    }
  }

  return readString(body.session_id, 80) || readString(body.anonymous_id, 80) || ip;
}

function parseEvent(body: Record<string, unknown>) {
  const {
    event_id,
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
    event_id: readString(event_id, 128),
    event_type: readEventType(body),
    event_data: readEventData(event_data),
    session_id: readString(session_id, 80),
    page_path: readString(page_path, 512),
    referrer: readString(referrer, 1024),
    device_type: readString(device_type, 40),
    browser: readString(browser, 80),
    os: readString(os, 80),
    scroll_depth: readNumber(scroll_depth, { min: 0, max: 100 }),
    time_on_page: readNumber(time_on_page, { min: 0, max: 86400, integer: true }),
    hover_duration: readNumber(hover_duration, { min: 0, max: 86400, integer: true }),
    post_id: readString(post_id, 64),
    category_id: readNumber(category_id, { min: 0, max: Number.MAX_SAFE_INTEGER, integer: true }),
    ad_id: readString(ad_id, 64),
    ad_impression_id: readString(ad_impression_id, 64),
    ad_position: readString(ad_position, 80),
    ad_visibility: readString(ad_visibility, 40),
    event_timestamp: readTimestamp(event_timestamp),
  };
}

function parseCustomEvent(body: Record<string, unknown>, authUserId: string | null) {
  const {
    session_id,
    anonymous_id,
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
    event_type: readEventType(body),
    session_id: readString(session_id, 80),
    anonymous_id: readString(anonymous_id, 80),
    user_id: authUserId,
    page_path: readString(page_path, 512),
    referrer: readString(referrer, 1024),
    device_type: readString(device_type, 40),
    browser: readString(browser, 80),
    os: readString(os, 80),
    form_id: readString(form_id ?? readEventDataField(body, 'form_id'), 128),
    form_name: readString(form_name ?? readEventDataField(body, 'form_name'), 255),
    form_type: readString(form_type ?? readEventDataField(body, 'form_type'), 80),
    video_id: readString(video_id ?? readEventDataField(body, 'video_id'), 128),
    video_title: readString(video_title ?? readEventDataField(body, 'video_title'), 255),
    duration_watched: readNumber(duration_watched ?? readEventDataField(body, 'duration_watched'), { min: 0, max: 86400, integer: true }),
    total_duration: readNumber(total_duration ?? readEventDataField(body, 'total_duration'), { min: 0, max: 86400, integer: true }),
    progress_percent: readNumber(progress_percent ?? readEventDataField(body, 'progress_percent'), { min: 0, max: 100 }),
    content_type: readString(content_type ?? readEventDataField(body, 'content_type'), 80),
    content_id: readString(content_id ?? readEventDataField(body, 'content_id'), 128),
    share_method: readString(share_method ?? readEventDataField(body, 'share_method'), 80),
    file_id: readString(file_id ?? readEventDataField(body, 'file_id'), 128),
    file_name: readString(file_name ?? readEventDataField(body, 'file_name'), 255),
    file_type: readString(file_type ?? readEventDataField(body, 'file_type'), 80),
    file_size: readNumber(file_size ?? readEventDataField(body, 'file_size'), { min: 0, max: 1024 * 1024 * 1024, integer: true }),
    search_query: readString(search_query ?? readEventDataField(body, 'search_query'), 255),
    results_count: readNumber(results_count ?? readEventDataField(body, 'results_count'), { min: 0, max: Number.MAX_SAFE_INTEGER, integer: true }),
    url: readString(url ?? readEventDataField(body, 'url'), 1024),
    link_text: readString(link_text ?? readEventDataField(body, 'link_text'), 255),
    event_data: readEventData(event_data),
    event_timestamp: readTimestamp(event_timestamp),
  };
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  try {
    const parsedBody: unknown = await req.json();
    if (!isRecord(parsedBody)) {
      return NextResponse.json({ error: 'Invalid tracking payload' }, { status: 400 });
    }

    const rateLimit = checkRateLimit(
      `track:${ip}:${getRateLimitIdentity(parsedBody, ip)}`,
      { limit: RATE_LIMIT_MAX_EVENTS, windowMs: RATE_LIMIT_WINDOW_MS }
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many tracking events' },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      );
    }

    const body = parsedBody;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const authUserId = user?.id ?? null;
    const eventType = readString(body.event_type, 64) || '';

    if (body.batch && Array.isArray(body.events)) {
      if (body.events.length > MAX_BATCH_EVENTS) {
        return NextResponse.json(
          { error: `Batch cannot exceed ${MAX_BATCH_EVENTS} events` },
          { status: 413, headers: rateLimitHeaders(rateLimit) }
        );
      }

      const cleanEvents = body.events.filter(isRecord);
      if (cleanEvents.length !== body.events.length) {
        return NextResponse.json(
          { error: 'Invalid tracking payload' },
          { status: 400, headers: rateLimitHeaders(rateLimit) }
        );
      }

      const standardEvents = cleanEvents.filter((e) => !CUSTOM_EVENT_TYPES.includes(readString(e.event_type, 64) || ''));
      const customEvents = cleanEvents.filter((e) => CUSTOM_EVENT_TYPES.includes(readString(e.event_type, 64) || ''));

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
        const customRecords = customEvents.map((event) => parseCustomEvent(event, authUserId));
        const { error } = await supabase
          .from('custom_events')
          .insert(customRecords);
        if (error) {
          console.error('[Track] Custom events insert error:', error);
          return NextResponse.json({ error: 'Failed to track custom events' }, { status: 500 });
        }
        customCount = customRecords.length;
      }

      return NextResponse.json(
        { success: true, standard: standardCount, custom: customCount },
        { headers: rateLimitHeaders(rateLimit) }
      );
    }

    if (CUSTOM_EVENT_TYPES.includes(eventType)) {
      const customRecord = parseCustomEvent(body, authUserId);
      const { error } = await supabase
        .from('custom_events')
        .insert([customRecord]);

      if (error) {
        console.error('[Track] Custom event insert error:', error);
        return NextResponse.json({ error: 'Failed to track custom event' }, { status: 500 });
      }

      return NextResponse.json(
        { success: true, custom: true },
        { headers: rateLimitHeaders(rateLimit) }
      );
    }

    const eventRecord = parseEvent(body);

    if (eventRecord.event_id) {
      try {
        const { data: existing } = await supabase
          .from('user_analytics_events')
          .select('id')
          .eq('event_id', eventRecord.event_id)
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (existing && existing.length > 0) {
          return NextResponse.json(
            { success: true, deduplicated: true },
            { headers: rateLimitHeaders(rateLimit) }
          );
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

    return NextResponse.json({ success: true }, { headers: rateLimitHeaders(rateLimit) });
  } catch (error) {
    if (error instanceof TrackValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('[Track] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const moderatorAuth = await requireModerator();
    if (moderatorAuth.error) return moderatorAuth.error;

    const { supabase } = moderatorAuth;
    const { searchParams } = new URL(req.url);
    const rawEventType = searchParams.get('event_type');
    const eventType = rawEventType && EVENT_TYPE_PATTERN.test(rawEventType) ? rawEventType : null;
    const customOnly = searchParams.get('custom') === 'true';
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '100', 10) || 100, 1), 500);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);

    if (rawEventType && !eventType) {
      return NextResponse.json({ error: 'Invalid event_type' }, { status: 400 });
    }

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
