import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { UPLOAD_LIMITS } from '@/lib/constants';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, getClientIp, rateLimitHeaders } from '@/lib/rate-limit';

export const runtime = 'nodejs';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimit = checkRateLimit(`upload:${user.id}:${getClientIp(request)}`, {
      limit: 30,
      windowMs: 60 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many upload attempts' },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const type = formData.get('type');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    if (type !== 'image') {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    if (!UPLOAD_LIMITS.ALLOWED_IMAGE_TYPES.includes(file.type as typeof UPLOAD_LIMITS.ALLOWED_IMAGE_TYPES[number])) {
      return NextResponse.json({ error: 'Unsupported image type' }, { status: 400 });
    }

    if (file.size > UPLOAD_LIMITS.MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: 'Image is too large' }, { status: 413 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await new Promise<{ secure_url: string }>(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: 'yru-community',
              public_id: `${user.id}/${crypto.randomUUID()}`,
              resource_type: 'image',
              transformation: [
                { quality: 'auto:good', fetch_format: 'auto' },
              ],
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result as { secure_url: string });
            }
          )
          .end(buffer);
      }
    );

    return NextResponse.json({ url: result.secure_url });
  } catch (error) {
    console.error('[Upload] Failed:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}
