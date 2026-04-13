import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('ad_campaigns')
      .select(`
        *,
        package:ad_packages(*),
        approved_by_profile:profiles!approved_by(id, display_name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('[Campaign] Fetch error:', error);
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Campaign] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    const supabase = await createClient();
    const body = await req.json();

    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    // Handle status changes
    if (updates.status === 'approved') {
      updates.approved_by = auth.user?.id;
      updates.approved_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('ad_campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Campaign] Update error:', error);
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Campaign] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 });
    }

    // Soft delete - just mark as cancelled
    const { error } = await supabase
      .from('ad_campaigns')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[Campaign] Delete error:', error);
      return NextResponse.json({ error: 'Failed to cancel' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Campaign] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}