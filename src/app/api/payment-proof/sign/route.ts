import { NextResponse } from 'next/server';
import { checkOrigin, enforceRateLimit, readLimitedJson } from '@/lib/request-security';
import { createHash, randomBytes } from 'crypto';
import { z } from 'zod';
import { verifyQuote } from '@/lib/order-flow';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    if (!checkOrigin(request)) return NextResponse.json({ error: 'Origin không hợp lệ' }, { status: 403 });
    await enforceRateLimit(request, 'proof-sign', 20, 600);
    const parsed = z.object({ quoteToken: z.string().min(20).max(120000) }).safeParse(await readLimitedJson(request, 150_000));
    if (!parsed.success) return NextResponse.json({ error: 'Phiên thanh toán không hợp lệ' }, { status: 400 });
    const quote = verifyQuote(parsed.data.quoteToken);
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !apiKey || !apiSecret || !uploadPreset) return NextResponse.json({ error: 'Tiệm chưa cấu hình Cloudinary' }, { status: 503 });
    const timestamp = Math.floor(Date.now() / 1000);
    const publicId = `tiem-xiu-xiu/payment-proofs/${quote.orderId}_${timestamp}_${randomBytes(3).toString('hex')}`;
    const params = { public_id: publicId, timestamp, upload_preset: uploadPreset };
    const toSign = Object.entries(params).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('&');
    const signature = createHash('sha1').update(toSign + apiSecret).digest('hex');
    return NextResponse.json({ cloudName, apiKey, timestamp, publicId, uploadPreset, signature });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không chuẩn bị được tải ảnh' }, { status: 400 });
  }
}
