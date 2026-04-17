import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
try {
const { id } = await params;
const supabase = await createClient();

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow users to view their own segments, or admins to view any
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin' && user.id !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get user's segments
    const { data: segments, error } = await supabase
      .from('user_segments')
      .select('*')
      .eq('user_id', id)
      .gte('computed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Within last 24 hours
      .order('segment_type', { ascending: true });

    if (error) {
      console.error('Error fetching user segments:', error);
      return NextResponse.json({ error: 'Failed to fetch segments' }, { status: 500 });
    }

    // Format segments into a more useful structure
    const formattedSegments = segments?.reduce((acc, seg) => {
      acc[seg.segment_type] = {
        value: seg.segment_value,
        confidence: seg.confidence,
        computed_at: seg.computed_at,
        expires_at: seg.expires_at,
      };
      return acc;
    }, {} as Record<string, { value: unknown; confidence: number; computed_at: string; expires_at: string | null }>);

    return NextResponse.json({
      user_id: id,
      segments: formattedSegments || {},
      computed_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('User segments API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}