import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { adId, type } = await request.json();

    if (!adId || !['impression', 'click'].includes(type)) {
      return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
    }

    const supabase = await createClient();

    // Call Supabase RPC to atomic increment fields to avoid race conditions
    // If we don't have RPC, we can fallback to simple update but it might lose counts on high concurrency.
    // For simplicity without setting up SQL functions, we do a basic select & update.
    
    // Using a direct rpc function would be better: 
    // const rpcName = type === 'impression' ? 'increment_ad_impressions' : 'increment_ad_clicks';
    // await supabase.rpc(rpcName, { ad_id: adId });
    
    // Basic approach (may drop some counts on extreme concurrency but OK for MVP)
    const { data: ad, error: fetchError } = await supabase
      .from('ads')
      .select('impressions, clicks')
      .eq('id', adId)
      .single();

    if (fetchError || !ad) {
      return NextResponse.json({ error: 'Ad not found' }, { status: 404 });
    }

    const updates = type === 'impression' 
      ? { impressions: ad.impressions + 1 }
      : { clicks: ad.clicks + 1 };

    const { error: updateError } = await supabase
      .from('ads')
      .update(updates)
      .eq('id', adId);

    if (updateError) {
      console.error('Failed to update ad stats', updateError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ad track error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
