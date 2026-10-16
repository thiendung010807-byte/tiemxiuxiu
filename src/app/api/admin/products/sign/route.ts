import { NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { z } from 'zod';
import { verifyAdminRequest } from '@/lib/firebase-admin';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  if (!await verifyAdminRequest(request)) return NextResponse.json({ error: 'Không có quyền quản trị' }, { status: 403 });
  const parsed = z.object({ productId: z.string().min(2).max(80) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Mã sản phẩm không hợp lệ' }, { status: 400 });
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME, apiKey = process.env.CLOUDINARY_API_KEY, apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return NextResponse.json({ error: 'Tiệm chưa cấu hình Cloudinary' }, { status: 503 });
  const timestamp = Math.floor(Date.now() / 1000), publicId = `tiem-xiu-xiu/products/${parsed.data.productId}_${timestamp}_${randomBytes(3).toString('hex')}`;
  const params = { public_id: publicId, timestamp };
  const toSign = Object.entries(params).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('&');
  const signature = createHash('sha1').update(toSign + apiSecret).digest('hex');
  return NextResponse.json({ cloudName, apiKey, timestamp, publicId, signature });
}