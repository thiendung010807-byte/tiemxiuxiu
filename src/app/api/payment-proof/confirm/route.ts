import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const schema = z.object({ orderId: z.string().min(8).max(80), secureUrl: z.string().url(), publicId: z.string().min(8).max(200) });

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Thông tin ảnh minh chứng không hợp lệ' }, { status: 400 });
    const { orderId, secureUrl, publicId } = parsed.data;
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    if (!cloudName || !secureUrl.startsWith(`https://res.cloudinary.com/${cloudName}/image/upload/`) || !publicId.startsWith(`tiem-xiu-xiu/payment-proofs/${orderId}_`)) {
      return NextResponse.json({ error: 'Ảnh không thuộc kho minh chứng của tiệm' }, { status: 400 });
    }
    const ref = adminDb().collection('orders').doc(orderId);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: 'Không tìm thấy đơn hàng' }, { status: 404 });
    if (snap.data()?.payment_status === 'paid') return NextResponse.json({ error: 'Đơn đã được xác nhận thanh toán' }, { status: 409 });
    await ref.update({ payment_proof_url: secureUrl, payment_proof_public_id: publicId, payment_proof_uploaded_at: new Date().toISOString() });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Save payment proof failed:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Không lưu được ảnh minh chứng vào đơn hàng' }, { status: 503 });
  }
}
