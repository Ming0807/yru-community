import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET() {
  try {
    const { error: authError } = await requireAdmin();
    if (authError) return authError;

    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('word_filters')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[WordFilter] Fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error('[WordFilter] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { error: authError } = await requireAdmin();
    if (authError) return authError;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const body = await req.json();
    const { word, severity = 'medium', action = 'warn' } = body;

    if (!word || typeof word !== 'string') {
      return NextResponse.json({ error: 'Word is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('word_filters')
      .insert({
        word: word.trim(),
        severity,
        action,
        created_by: user?.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'คำนี้มีอยู่แล้ว' }, { status: 400 });
      }
      console.error('[WordFilter] Insert error:', error);
      return NextResponse.json({ error: 'Failed to add word' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[WordFilter] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { error: authError } = await requireAdmin();
    if (authError) return authError;

    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const wordId = searchParams.get('id');

    if (!wordId) {
      return NextResponse.json({ error: 'Word ID required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('word_filters')
      .update({ is_active: false })
      .eq('id', wordId);

    if (error) {
      console.error('[WordFilter] Delete error:', error);
      return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[WordFilter] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}