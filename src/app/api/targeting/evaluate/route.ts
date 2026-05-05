import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = getAdminClient();
    const { searchParams } = new URL(req.url);

    const userId = searchParams.get('user_id');
    const campaignId = searchParams.get('campaign_id');
    const adId = searchParams.get('ad_id');

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const canEvaluate = user.id === userId || profile?.role === 'admin' || profile?.role === 'moderator';
    if (!canEvaluate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const context = {
      timestamp: new Date().toISOString(),
      url_path: searchParams.get('url') || null,
    };

    const { data: matchingRules, error } = await adminClient
      .rpc('get_matching_rules_for_user', {
        p_user_id: userId,
        p_campaign_id: campaignId || null,
        p_ad_id: adId || null,
        p_context: context,
      });

    if (error) {
      console.error('[Targeting Evaluate] RPC error:', error);
      if (error.message.includes('does not exist')) {
        return NextResponse.json({
          rules: [],
          message: 'Targeting rules function not yet deployed. Run phase50 migration.',
        });
      }
      return NextResponse.json({ error: 'Failed to evaluate targeting rules' }, { status: 500 });
    }

    return NextResponse.json({
      user_id: userId,
      campaign_id: campaignId,
      ad_id: adId,
      matching_rules: matchingRules || [],
      total_matches: matchingRules?.length || 0,
    });
  } catch (error) {
    console.error('[Targeting Evaluate] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
