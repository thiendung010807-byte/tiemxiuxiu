import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase-admin';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const schema = z.object({ orderId: z.string().min(8).max(80), paymentStatus: z.enum(['pending_confirmation','paid','rejected']), orderStatus: z.enum(['new','preparing','ready_for_pickup','delivered','cancelled']), tab: z.enum(['Người tự nhận','Người giao hộ']).optional() });
export async function POST(request: Request) {
  const secret = process.env.SHEETS_WEBHOOK_SECRET;
  if (!secret || request.headers.get('x-sheets-secret') !== secret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Trạng thái hoặc mã đơn không hợp lệ' }, { status: 400 });
  try {
    const { orderId, paymentStatus, orderStatus } = parsed.data;
    const ref = adminDb().collection('orders').doc(orderId), snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: 'Không tìm thấy đơn' }, { status: 404 });
    await ref.update({ payment_status: paymentStatus, order_status: orderStatus, updated_at: new Date().toISOString(), updated_by: 'google-sheets' });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Sheets webhook failed:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Không cập nhật được đơn' }, { status: 503 });
  }
}
