import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { validateClick } from '@/lib/ads/antifraud';
import { checkRateLimit, getClientIp, rateLimitHeaders } from '@/lib/rate-limit';

type AdEventType = 'impression' | 'click';

interface TrackPayload {
  adId?: unknown;
  type?: unknown;
  viewability_score?: unknown;
  in_view_duration_ms?: unknown;
  viewable?: unknown;
  userIdentifier?: unknown;
  timeToClickMs?: unknown;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_IDENTIFIER_LENGTH = 64;

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const adId = typeof body.adId === 'string' ? body.adId : '';
    const type = parseEventType(body.type);

    if (!UUID_PATTERN.test(adId) || !type) {
      return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
    }

    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(`ads-track:${clientIp}:${adId}:${type}`, {
      limit: type === 'click' ? 30 : 120,
      windowMs: 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many tracking events' },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      );
    }

    const supabase = await createClient();
    const adminClient = getAdminClient();
    const userAgent = request.headers.get('user-agent');
    const { data: { user } } = await supabase.auth.getUser();
    const userIdentifier = normalizeIdentifier(body.userIdentifier, user?.id);
    const timeToClickMs = normalizeNumber(body.timeToClickMs, 0, 24 * 60 * 60 * 1000);
    const viewabilityScore = normalizeNumber(body.viewability_score, 0, 100);
    const inViewDurationMs = normalizeNumber(body.in_view_duration_ms, 0, 24 * 60 * 60 * 1000);
    const viewable = typeof body.viewable === 'boolean' ? body.viewable : null;

    const { data: ad, error: adError } = await adminClient
      .from('ads')
      .select('id, is_active, start_date, end_date')
      .eq('id', adId)
      .maybeSingle();

    if (adError) {
      console.error('[Ads Track] Ad validation failed:', adError);
      return NextResponse.json({ success: false, error: 'Unable to validate ad' }, { status: 500 });
    }

    if (!ad || !isAdActive(ad)) {
      return NextResponse.json({ success: false, error: 'Ad is not active' }, { status: 404 });
    }

    if (type === 'click') {
      const validation = validateClick(userAgent, timeToClickMs, []);
      if (!validation.is_valid || !validation.should_count) {
        console.warn(`[Ads Track] Click rejected: ${validation.message}`);
        return NextResponse.json({ success: false, message: validation.message }, { status: 403 });
      }
    }

    const eventRecord = {
      event_type: type === 'impression' ? 'ad_impression' : 'ad_click',
      ad_id: adId,
      user_id: user?.id || null,
      session_id: userIdentifier,
      device_type: userAgent?.includes('Mobile') ? 'mobile' : 'desktop',
      browser: userAgent || 'unknown',
      scroll_depth: viewabilityScore === null ? null : Math.round(viewabilityScore),
      time_on_page: inViewDurationMs === null ? null : Math.round(inViewDurationMs),
      ad_visibility: viewable === null ? null : (viewable ? 'visible' : 'hidden'),
      event_timestamp: new Date().toISOString(),
    };

    const { error: analyticsError } = await adminClient
      .from('user_analytics_events')
      .insert([eventRecord]);

    if (analyticsError) {
      console.error('[Ads Track] Analytics logging failed:', analyticsError);
    }

    const rpcName = type === 'impression' ? 'increment_ad_impressions' : 'increment_ad_clicks';
    const { error: rpcError } = await adminClient.rpc(rpcName, { ad_id: adId });
    if (rpcError) {
      console.warn('[Ads Track] Counter increment failed:', rpcError.message);
    }

    if (type === 'impression' && userIdentifier) {
      const { error: frequencyError } = await adminClient.rpc('increment_ad_frequency', {
        p_ad_id: adId,
        p_user_identifier: userIdentifier,
      });

      if (frequencyError) {
        console.warn('[Ads Track] Frequency increment failed:', frequencyError.message);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Ads Track] Unexpected error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const adId = searchParams.get('ad_id') || '';
    const userIdentifier = normalizeIdentifier(
      searchParams.get('user_id') || searchParams.get('user_identifier'),
      null
    );

    if (!UUID_PATTERN.test(adId) || !userIdentifier) {
      return NextResponse.json({ error: 'ad_id and user_id required' }, { status: 400 });
    }

    const rateLimit = checkRateLimit(`ads-frequency:${getClientIp(request)}:${adId}`, {
      limit: 120,
      windowMs: 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many frequency checks' },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      );
    }

    const adminClient = getAdminClient();
    const { data, error } = await adminClient.rpc('check_ad_frequency_cap', {
      p_ad_id: adId,
      p_user_identifier: userIdentifier,
      p_max_views: 5,
      p_window_hours: 24,
    });

    if (error) {
      console.error('[Ads Track] Frequency check failed:', error);
      return NextResponse.json({ error: 'Frequency check failed' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Ads Track] Frequency check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function readJson(request: Request): Promise<TrackPayload | null> {
  try {
    const payload = await request.json();
    return payload && typeof payload === 'object' ? payload as TrackPayload : null;
  } catch {
    return null;
  }
}

function parseEventType(value: unknown): AdEventType | null {
  return value === 'impression' || value === 'click' ? value : null;
}

function normalizeIdentifier(value: unknown, fallback: string | null | undefined): string | null {
  const identifier = typeof value === 'string' && value.trim()
    ? value.trim()
    : fallback;

  if (!identifier || identifier.length > MAX_IDENTIFIER_LENGTH) {
    return null;
  }

  return identifier;
}

function normalizeNumber(value: unknown, min: number, max: number): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numberValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numberValue)) {
    return null;
  }

  return Math.min(Math.max(numberValue, min), max);
}

function isAdActive(ad: { is_active: boolean | null; start_date: string | null; end_date: string | null }) {
  if (!ad.is_active) return false;

  const today = new Date().toISOString().slice(0, 10);
  if (ad.start_date && ad.start_date > today) return false;
  if (ad.end_date && ad.end_date < today) return false;

  return true;
}
