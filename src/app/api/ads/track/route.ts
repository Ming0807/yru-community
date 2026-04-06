import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { adId, type } = await request.json();

    if (!adId || !['impression', 'click'].includes(type)) {
      return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
    }

    const supabase = await createClient();

    // Use RPC to bypass RLS (security definer function)
    // Fallback: if RPC doesn't exist, skip silently (non-critical tracking)
    const rpcName = type === 'impression' ? 'increment_ad_impressions' : 'increment_ad_clicks';
    
    const { error: rpcError } = await supabase.rpc(rpcName, { ad_id: adId });
    
    if (rpcError) {
      // RPC may not exist yet — log but don't fail the request
      // This is non-critical tracking
      console.warn(`Ad tracking RPC failed (${rpcName}):`, rpcError.message);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Ad track error:', error);
    // Don't fail the request — ad tracking is non-critical
    return NextResponse.json({ success: false, error: error?.message });
  }
}
