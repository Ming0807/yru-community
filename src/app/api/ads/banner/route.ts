import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { selectAd, RotatableAd } from '@/lib/ads/rotation';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const position = searchParams.get('position') || 'banner';
    
    const supabase = await createClient();
    const adminClient = getAdminClient();
    
    // 1. Get current user for targeting (Optional but recommended)
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    // 2. Fetch Active Ads for this position
    // We fetch a bit more than 1 to allow for rotation and targeting
    const { data: ads, error: adsError } = await supabase
      .from('ads')
      .select(`
        id, 
        campaign_id, 
        campaign_name, 
        image_url, 
        target_url, 
        position, 
        is_active, 
        impressions, 
        clicks,
        created_at
      `)
      .eq('position', position)
      .eq('is_active', true)
      .gte('start_date', new Date().toISOString().split('T')[0])
      .or(`end_date.is.null,end_date.gte.${new Date().toISOString().split('T')[0]}`)
      .limit(20);

    if (adsError) {
      console.error('[Banner API] Ads fetch error:', adsError);
      return NextResponse.json({ error: 'Failed to fetch ads' }, { status: 500 });
    }

    if (!ads || ads.length === 0) {
      return NextResponse.json({ ad: null, message: 'No ads available' });
    }

    // 3. Apply Targeting & Weighting Logic
    let processedAds: RotatableAd[] = ads.map(ad => ({
      ...ad,
      weight: 1.0 // Default weight
    }));

    if (userId) {
      try {
        // Use RPC to get matching rules and their effects (Bid Adjustments)
        const { data: targetingResults, error: targetError } = await adminClient
          .rpc('apply_targeting_rules', {
            p_user_id: userId,
            p_context: { 
              device_type: request.headers.get('user-agent')?.includes('Mobile') ? 'mobile' : 'desktop',
              hour: new Date().getHours()
            }
        });

        if (!targetError && targetingResults) {
          const { bid_adjustment } = targetingResults;
          
          // Apply bid adjustment to all ads that match targeting criteria
          // In a more complex setup, we'd check if specific ads match specific rules
          processedAds = processedAds.map(ad => ({
            ...ad,
            weight: ad.weight! * (bid_adjustment || 1.0)
          }));
        }
      } catch {
        console.warn('[Banner API] Targeting evaluation failed, falling back to even rotation');
      }
    }

    // 4. Frequency Capping Filter
    // Filter out ads that have reached their frequency cap for this user
    const finalCandidates: RotatableAd[] = [];
    
    for (const ad of processedAds) {
      if (userId) {
        const { data: freqCheck } = await adminClient.rpc('check_ad_frequency_cap', {
          p_ad_id: ad.id,
          p_user_identifier: userId,
          p_max_views: 5, // Default cap, could be dynamic from targeting rules
          p_window_hours: 24
        });
        
        if (freqCheck && freqCheck.capped) {
          continue; // Skip this ad
        }
      }
      finalCandidates.push(ad);
    }

    // 5. Select Ad using Weighted Rotation
    const selection = selectAd(
      finalCandidates.length > 0 ? finalCandidates : processedAds, 
      'weighted'
    );

    if (!selection.selectedAd) {
      return NextResponse.json({ ad: null, message: 'No candidates after filtering' });
    }

    return NextResponse.json({
      ad: {
        id: selection.selectedAd.id,
        campaign_name: selection.selectedAd.campaign_name,
        image_url: selection.selectedAd.image_url,
        target_url: selection.selectedAd.target_url,
        position: selection.selectedAd.position,
      },
      rotation: {
        total_candidates: selection.total_candidates,
        type: selection.rotation_type,
        message: selection.message
      }
    });

  } catch (error) {
    console.error('[Banner API] Internal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
