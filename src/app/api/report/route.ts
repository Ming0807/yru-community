import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'กรุณาเข้าสู่ระบบ' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { post_id, comment_id, reason } = body;

    if (!reason) {
      return NextResponse.json(
        { error: 'กรุณาระบุเหตุผล' },
        { status: 400 }
      );
    }

    if (!post_id && !comment_id) {
      return NextResponse.json(
        { error: 'กรุณาระบุกระทู้หรือคอมเมนต์ที่ต้องการรายงาน' },
        { status: 400 }
      );
    }

    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      post_id: post_id ?? null,
      comment_id: comment_id ?? null,
      reason,
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการรายงาน' },
      { status: 500 }
    );
  }
}
