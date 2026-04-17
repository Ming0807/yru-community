import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
try {
const { id } = await params;
const supabase = await createClient();
const { searchParams } = new URL(request.url);
    
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const minScore = parseFloat(searchParams.get('min_score') || '0');

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow users to view their own interests, or admins to view any
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin' && user.id !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build query
    let query = supabase
      .from('user_interests')
      .select(`
        *,
        category:categories(id, name, slug)
      `)
      .eq('user_id', id)
      .order('interest_score', { ascending: false });

    if (minScore > 0) {
      query = query.gte('interest_score', minScore);
    }

    query = query.limit(limit);

    const { data: interests, error } = await query;

    if (error) {
      console.error('Error fetching user interests:', error);
      return NextResponse.json({ error: 'Failed to fetch interests' }, { status: 500 });
    }

    // Get top categories summary
    const { data: topCategories } = await supabase
      .from('interest_summary')
      .select('*')
      .limit(limit)
      .order('total_users', { ascending: false });

    // Format interests
    const formattedInterests = interests?.map(interest => ({
      id: interest.id,
      category_id: interest.category_id,
      category_name: interest.category?.name || 'Unknown',
      interest_score: interest.interest_score,
      interaction_count: interest.interaction_count,
      positive_interactions: interest.positive_interactions,
      negative_interactions: interest.negative_interactions,
      last_interaction_at: interest.last_interaction_at,
      computed_at: interest.computed_at,
    }));

    return NextResponse.json({
      user_id: id,
      interests: formattedInterests || [],
      top_categories: topCategories || [],
      total: interests?.length || 0,
    });
  } catch (error) {
    console.error('User interests API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
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

    // Only allow users to update their own interests
    if (user.id !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { category_id, action, value } = body;

    if (!category_id || !action) {
      return NextResponse.json({ 
        error: 'category_id and action are required' 
      }, { status: 400 });
    }

    // Call the update_user_interest function
    const { data, error } = await supabase
      .rpc('update_user_interest', {
        p_user_id: id,
        p_category_id: category_id,
        p_action: action,
        p_value: value || 1,
      });

    if (error) {
      console.error('Error updating user interest:', error);
      return NextResponse.json({ error: 'Failed to update interest' }, { status: 500 });
    }

    return NextResponse.json({ success: true, result: data });
  } catch (error) {
    console.error('User interests POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}