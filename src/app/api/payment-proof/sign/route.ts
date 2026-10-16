import { NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const parsed = z.object({ orderId: z.string().min(8).max(80) }).safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Mã đơn không hợp lệ' }, { status: 400 });
    const snap = await adminDb().collection('orders').doc(parsed.data.orderId).get();
    if (!snap.exists) return NextResponse.json({ error: 'Không tìm thấy đơn hàng' }, { status: 404 });
    if (snap.data()?.payment_status === 'paid') return NextResponse.json({ error: 'Đơn này đã được xác nhận thanh toán' }, { status: 409 });
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !apiKey || !apiSecret || !uploadPreset) return NextResponse.json({ error: 'Tiệm chưa cấu hình Cloudinary' }, { status: 503 });
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'tiem-xiu-xiu/payment-proofs';
    const publicId = `${folder}/${parsed.data.orderId}_${timestamp}_${randomBytes(3).toString('hex')}`;
    const params = { public_id: publicId, timestamp, upload_preset: uploadPreset };
    const toSign = Object.entries(params).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('&');
    const signature = createHash('sha1').update(toSign + apiSecret).digest('hex');
    return NextResponse.json({ cloudName, apiKey, timestamp, publicId, uploadPreset, signature });
  } catch (error) {
    console.error('Cloudinary sign failed:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Không chuẩn bị được tải ảnh' }, { status: 503 });
  }
}
