import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
try {
const supabase = await createClient();
const adminClient = getAdminClient();
const { searchParams } = new URL(req.url);
    
    const segmentType = searchParams.get('type'); // activity, engagement, faculty, etc.
    const days = parseInt(searchParams.get('days') || '30', 10);

    // Verify admin access
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build query
    let query = adminClient
      .from('user_segments')
      .select('*')
      .gte('computed_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

    if (segmentType) {
      query = query.eq('segment_type', segmentType);
    }

    const { data: segments, error } = await query;

    if (error) {
      console.error('Error fetching segments:', error);
      return NextResponse.json({ error: 'Failed to fetch segments' }, { status: 500 });
    }

    // Aggregate by segment type and level
    const segmentCounts: Record<string, { total: number; byLevel: Record<string, number> }> = {};
    const now = new Date();
    let totalUsers = 0;

    for (const seg of segments || []) {
      if (!segmentCounts[seg.segment_type]) {
        segmentCounts[seg.segment_type] = { total: 0, byLevel: {} };
      }
      const level = seg.segment_value?.level || 'unknown';
      segmentCounts[seg.segment_type].total += 1;
      segmentCounts[seg.segment_type].byLevel[level] = (segmentCounts[seg.segment_type].byLevel[level] || 0) + 1;
      totalUsers += 1;
    }

    // Format response
    const summary = Object.entries(segmentCounts).map(([type, data]) => ({
      segment_type: type,
      levels: Object.entries(data.byLevel).map(([level, count]) => ({
        level,
        user_count: count,
        percentage: Math.round((count / data.total) * 10000) / 100,
      })),
      total_users: data.total,
    }));

    return NextResponse.json({
      segments: summary,
      total_users: totalUsers,
      computed_at: now.toISOString(),
      date_range_days: days,
    });
  } catch (error) {
    console.error('Segments API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}