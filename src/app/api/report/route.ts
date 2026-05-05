import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, getClientIp, rateLimitHeaders } from '@/lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_REASON_LENGTH = 1000;

function readId(value: unknown): string | null {
  return typeof value === 'string' && UUID_PATTERN.test(value) ? value : null;
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

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

    const rateLimit = checkRateLimit(`report:${ip}:${user.id}`, {
      limit: 10,
      windowMs: 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'ส่งรายงานถี่เกินไป กรุณาลองใหม่อีกครั้ง' },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      );
    }

    const body: unknown = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'ข้อมูลรายงานไม่ถูกต้อง' }, { status: 400 });
    }

    const { post_id, comment_id, reason } = body as Record<string, unknown>;
    const postId = readId(post_id);
    const commentId = readId(comment_id);
    const cleanReason = typeof reason === 'string' ? reason.trim().slice(0, MAX_REASON_LENGTH) : '';

    if (!cleanReason) {
      return NextResponse.json(
        { error: 'กรุณาระบุเหตุผล' },
        { status: 400 }
      );
    }

    if (!postId && !commentId) {
      return NextResponse.json(
        { error: 'กรุณาระบุกระทู้หรือคอมเมนต์ที่ต้องการรายงาน' },
        { status: 400 }
      );
    }

    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      post_id: postId,
      comment_id: commentId,
      reason: cleanReason,
    });

    if (error) throw error;

    return NextResponse.json({ success: true }, { headers: rateLimitHeaders(rateLimit) });
  } catch {
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการรายงาน' },
      { status: 500 }
    );
  }
}
