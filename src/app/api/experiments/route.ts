import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const activeOnly = searchParams.get('active') === 'true';

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

    let query = supabase
      .from('experiments')
      .select('*')
      .order('created_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('status', 'running');
    }

    const { data: experiments, error } = await query;

    if (error) {
      console.error('[Experiments GET] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch experiments' }, { status: 500 });
    }

    return NextResponse.json({ experiments: experiments || [], total: experiments?.length || 0 });
  } catch (error) {
    console.error('[Experiments GET] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

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

    const body = await request.json();
    const { name, description, variants, primary_metric, start_date, end_date } = body;

    if (!name || !variants || !Array.isArray(variants) || variants.length < 2) {
      return NextResponse.json({
        error: 'Name and at least 2 variants are required'
      }, { status: 400 });
    }

    const newExperiment = {
      name,
      description: description || null,
      status: 'draft',
      variants,
      primary_metric: primary_metric || 'conversion',
      start_date: start_date || null,
      end_date: end_date || null,
      created_by: user.id,
    };

    const { data: experiment, error } = await supabase
      .from('experiments')
      .insert(newExperiment)
      .select()
      .single();

    if (error) {
      console.error('[Experiments POST] Error:', error);
      return NextResponse.json({ error: 'Failed to create experiment' }, { status: 500 });
    }

    return NextResponse.json({ experiment }, { status: 201 });
  } catch (error) {
    console.error('[Experiments POST] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}