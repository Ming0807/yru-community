import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // ตรวจสอบโดเมนอีเมล @yru.ac.th
      const email = data.user.email ?? '';
      if (!email.endsWith('@yru.ac.th')) {
        // ลบ session ถ้าอีเมลไม่ถูกต้อง
        await supabase.auth.signOut();
        return NextResponse.redirect(
          `${origin}/login?error=invalid_domain&message=${encodeURIComponent(
            'กรุณาใช้อีเมล @yru.ac.th เท่านั้น'
          )}`
        );
      }

      // ตรวจสอบว่ามี profile หรือยัง
      const { data: profile, error: profileLookupError } = await supabase
        .from('profiles')
        .select('id, display_name, faculty')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profileLookupError) {
        console.error('[AuthCallback] Profile lookup failed:', profileLookupError);
      }

      if (!profile) {
        // สร้าง profile เบื้องต้น
        const { error: createProfileError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          email: data.user.email!,
          display_name:
            data.user.user_metadata?.full_name ??
            data.user.email?.split('@')[0] ??
            'ผู้ใช้ใหม่',
          avatar_url: data.user.user_metadata?.avatar_url ?? null,
        }, { onConflict: 'id' });

        if (createProfileError) {
          console.error('[AuthCallback] Initial profile upsert failed:', createProfileError);
        }

        // ไปหน้าตั้งค่าโปรไฟล์
        return NextResponse.redirect(`${origin}/profile/setup`);
      }

      if (!profile.display_name?.trim() || !profile.faculty) {
        return NextResponse.redirect(`${origin}/profile/setup`);
      }

      // ล็อกอินสำเร็จ ไปหน้าที่ต้องการ
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // กรณี error ให้กลับไปหน้า login
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
