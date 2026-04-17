import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateClick } from '@/lib/ads/antifraud';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { adId, type, viewability_score, in_view_duration_ms, viewable, userIdentifier, timeToClickMs } = body;

    if (!adId || !['impression', 'click'].includes(type)) {
      return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
    }

    const supabase = await createClient();
    const userAgent = request.headers.get('user-agent');
    
    // 1. Anti-Fraud Validation for Clicks
    if (type === 'click') {
      const validation = validateClick(userAgent, timeToClickMs || null, []);
      if (!validation.is_valid) {
        console.warn(`[Ads Track] Fraudulent click rejected: ${validation.message}`);
        return NextResponse.json({ success: false, message: validation.message }, { status: 403 });
      }
    }

    // 2. Log to user_analytics_events (Raw Data for Analytics Phase 57+)
    const { data: { user } } = await supabase.auth.getUser();
    
    const eventRecord = {
      event_type: type === 'impression' ? 'ad_impression' : 'ad_click',
      ad_id: adId,
      user_id: user?.id || null,
      session_id: userIdentifier || null,
      device_type: userAgent?.includes('Mobile') ? 'mobile' : 'desktop',
      browser: userAgent || 'unknown',
      scroll_depth: viewability_score || null,
      time_on_page: in_view_duration_ms || null,
      ad_visibility: viewable ? 'visible' : 'hidden',
      event_timestamp: new Date().toISOString(),
    };

    const { error: analyticsError } = await supabase
      .from('user_analytics_events')
      .insert([eventRecord]);

    if (analyticsError) {
      console.error('[Ads Track] Analytics logging failed:', analyticsError);
    }

    // 3. Update Aggregate Counters (Legacy Support & Quick Lookup)
    try {
      const rpcName = type === 'impression' ? 'increment_ad_impressions' : 'increment_ad_clicks';
      await supabase.rpc(rpcName, { ad_id: adId });
    } catch (err) {
      console.warn(`Ad tracking RPC failed:`, (err as Error).message);
    }

    // 4. Frequency Tracking
    if (type === 'impression' && userIdentifier) {
      try {
        await supabase.rpc('increment_ad_frequency', {
          p_ad_id: adId,
          p_user_identifier: userIdentifier,
        });
      } catch (err) {
        console.warn('[Ads Track] Frequency increment failed:', (err as Error).message);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Ad track error:', error);
    return NextResponse.json({ success: false, error: error?.message });
  }
}

export async function GET(request: Request) {
  // ... (GET method remains the same for frequency checking)
  try {
    const { searchParams } = new URL(request.url);
    const adId = searchParams.get('ad_id');
    const userIdentifier = searchParams.get('user_id') || searchParams.get('user_identifier');

    if (!adId || !userIdentifier) {
      return NextResponse.json({ error: 'ad_id and user_id required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc('check_ad_frequency_cap', {
      p_ad_id: adId,
      p_user_identifier: userIdentifier,
      p_max_views: 5,
      p_window_hours: 24,
    });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Ad frequency check error:', error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
