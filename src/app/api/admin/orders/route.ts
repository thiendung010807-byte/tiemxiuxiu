import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb, verifyAdminRequest } from '@/lib/firebase-admin';
import { updateOrderStatusInSheet, type OrderTab } from '@/lib/sheets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const admin = await verifyAdminRequest(request);
  if (!admin) return NextResponse.json({ error: 'Tài khoản này chưa được cấp quyền quản trị. Hãy đăng xuất và dùng email có trong ADMIN_EMAILS.' }, { status: 403 });
  try {
    const snapshot = await adminDb().collection('orders').orderBy('created_at', 'desc').limit(300).get();
    const orders = snapshot.docs.map(doc => ({ ...doc.data(), _docId: doc.id }));
    return NextResponse.json({ orders }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('Admin list orders failed:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Không tải được đơn từ Firebase. Kiểm tra FIREBASE_SERVICE_ACCOUNT_JSON và quyền Firestore.' }, { status: 503 });
  }
}

const patchSchema = z.object({ orderId: z.string().min(8).max(80), paymentStatus: z.enum(['pending_confirmation', 'paid', 'rejected']), orderStatus: z.enum(['new', 'preparing', 'ready_for_pickup', 'delivered', 'cancelled']).optional() });
export async function PATCH(request: Request) {
  const admin = await verifyAdminRequest(request);
  if (!admin) return NextResponse.json({ error: 'Tài khoản này chưa được cấp quyền quản trị.' }, { status: 403 });
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Dữ liệu cập nhật không hợp lệ' }, { status: 400 });
  try {
    const { orderId, paymentStatus, orderStatus } = parsed.data;
    const ref = adminDb().collection('orders').doc(orderId);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: 'Không tìm thấy đơn hàng' }, { status: 404 });
    const current = snap.data() || {};
    const nextOrderStatus = orderStatus || String(current.order_status || 'new');
    await ref.update({ payment_status: paymentStatus, order_status: nextOrderStatus, updated_at: new Date().toISOString(), updated_by: admin.email });
    let sheetSync = true;
    try {
      const tab: OrderTab = current.gift_option === 'self' ? 'Người tự nhận' : 'Người giao hộ';
      await updateOrderStatusInSheet(tab, orderId, paymentStatus, nextOrderStatus);
    } catch (sheetError) {
      sheetSync = false;
      console.error('Order status sheet sync failed:', sheetError instanceof Error ? sheetError.message : 'unknown error');
    }
    return NextResponse.json({ ok: true, sheetSync });
  } catch (error) {
    console.error('Admin update order failed:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Không cập nhật được đơn trong Firebase' }, { status: 503 });
  }
}
