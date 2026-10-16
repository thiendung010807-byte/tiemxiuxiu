import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { calculateTotal, PRODUCTS } from '@/lib/pricing';
import { adminDb } from '@/lib/firebase-admin';
import { appendContactInfo } from '@/lib/sheets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const requestWindows = new Map<string, { count: number; startedAt: number }>();
const phone = z.string().trim().regex(/^[0-9+().\s-]{8,20}$/, 'Số điện thoại chưa hợp lệ');
const schema = z.object({
  items: z.array(z.object({ id: z.string(), quantity: z.number().int().min(1).max(20) })).min(1).max(2),
  giftOption: z.enum(['self', 'shop']),
  customer: z.object({ name: z.string().trim().min(2).max(100), phone, address: z.string().trim().min(3).max(300), time: z.string().trim().max(120).optional().default('') }),
  sender: z.object({ name: z.string().trim().max(100).optional().default(''), phone: phone.optional(), address: z.string().trim().max(300).optional().default('') }).optional(),
  recipient: z.object({ name: z.string().trim().min(2).max(100), phone, address: z.string().trim().min(3).max(300), time: z.string().trim().max(120).optional().default(''), message: z.string().trim().max(500).optional().default('') }).optional(),
  note: z.string().trim().max(500).optional().default(''), consent: z.literal(true),
}).superRefine((data, ctx) => {
  const seen = new Set<string>();
  for (const item of data.items) {
    if (!PRODUCTS.some(p => p.id === item.id)) ctx.addIssue({ code: 'custom', path: ['items'], message: 'Sản phẩm không hợp lệ' });
    if (seen.has(item.id)) ctx.addIssue({ code: 'custom', path: ['items'], message: 'Sản phẩm bị lặp' });
    seen.add(item.id);
  }
  if (data.giftOption === 'shop' && (!data.sender?.phone || !data.sender?.address || !data.recipient)) {
    ctx.addIssue({ code: 'custom', path: ['recipient'], message: 'Thiếu thông tin gửi quà hộ' });
  }
});
const sheetText = (v: string) => /^[=+@\-]/.test(v) ? `'${v}` : v;

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  if (requestWindows.size > 5000) for (const [key, value] of requestWindows) if (now - value.startedAt >= 600000) requestWindows.delete(key);
  const window = requestWindows.get(ip);
  if (window && now - window.startedAt < 600000 && window.count >= 8) return NextResponse.json({ error: 'Cậu gửi hơi nhanh rồi, thử lại sau ít phút nhé.' }, { status: 429 });
  if (!window || now - window.startedAt >= 600000) requestWindows.set(ip, { count: 1, startedAt: now });
  else requestWindows.set(ip, { ...window, count: window.count + 1 });
  if (Number(request.headers.get('content-length') || 0) > 20000) return NextResponse.json({ error: 'Dữ liệu gửi lên quá lớn' }, { status: 413 });
  try {
    const origin = request.headers.get('origin'); const ownHost = request.headers.get('host');
    if (origin && ownHost && new URL(origin).host !== ownHost) return NextResponse.json({ error: 'Origin không hợp lệ' }, { status: 403 });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Thông tin đơn hàng chưa hợp lệ' }, { status: 400 });
    const data = parsed.data;
    const pricing = calculateTotal(data.items, data.giftOption);
    if (pricing.subtotal <= 0) return NextResponse.json({ error: 'Giỏ hàng không hợp lệ' }, { status: 400 });
    const bankId = process.env.VIETQR_BANK_ID; const accountNo = process.env.VIETQR_ACCOUNT_NO; const accountName = process.env.VIETQR_ACCOUNT_NAME;
    if (!bankId || !accountNo || !accountName) return NextResponse.json({ error: 'Tiệm chưa cấu hình tài khoản nhận tiền.' }, { status: 503 });
    const orderId = `XX${Date.now().toString(36).toUpperCase()}${randomBytes(4).toString('hex').toUpperCase()}`;
    const products = data.items.map(item => { const p = PRODUCTS.find(x => x.id === item.id)!; return { id: p.id, name: p.name, quantity: item.quantity, unit_price: p.price, line_total: p.price * item.quantity }; });
    const createdAt = new Date().toISOString();
    const order = {
      order_id: orderId, created_at: createdAt,
      customer_name: data.customer.name, customer_phone: data.customer.phone, customer_address: data.customer.address, customer_time: data.customer.time || '',
      gift_option: data.giftOption,
      sender_name: data.giftOption === 'shop' ? data.sender?.name || '' : '', sender_phone: data.giftOption === 'shop' ? data.sender?.phone || '' : '', sender_address: data.giftOption === 'shop' ? data.sender?.address || '' : '',
      recipient_name: data.giftOption === 'shop' ? data.recipient?.name || '' : '', recipient_phone: data.giftOption === 'shop' ? data.recipient?.phone || '' : '', recipient_address: data.giftOption === 'shop' ? data.recipient?.address || '' : '', recipient_time: data.giftOption === 'shop' ? data.recipient?.time || '' : '', card_message: data.giftOption === 'shop' ? data.recipient?.message || '' : '',
      products, products_json: JSON.stringify(products), product_subtotal: pricing.subtotal, gift_service_fee: pricing.gift_service_fee, delivery_fee: pricing.delivery_fee, total_amount: pricing.total,
      payment_method: 'bank_transfer_qr', payment_status: 'pending_confirmation', order_status: 'new', customer_note: data.note || '', privacy_consent: true,
      payment_proof_url: '', payment_proof_public_id: '', payment_proof_uploaded_at: '',
    };
    // Firebase is the source of truth. The sheet is a small contact-only export.
    await adminDb().collection('orders').doc(orderId).create(order);
    let sheetSync = true;
    try {
      await appendContactInfo([
        orderId, createdAt, sheetText(order.customer_name), order.customer_phone, sheetText(order.customer_address), sheetText(order.customer_time), order.gift_option,
        sheetText(order.sender_name), order.sender_phone, sheetText(order.sender_address), sheetText(order.recipient_name), order.recipient_phone,
        sheetText(order.recipient_address), sheetText(order.recipient_time), sheetText(order.card_message), sheetText(order.customer_note),
      ]);
    } catch (e) { sheetSync = false; console.error('Contact sheet sync failed:', e instanceof Error ? e.message : 'unknown error'); }
    const qrUrl = `https://img.vietqr.io/image/${encodeURIComponent(bankId)}-${encodeURIComponent(accountNo)}-qr_only.png?amount=${pricing.total}&addInfo=${encodeURIComponent(`TIEM ${orderId}`)}&accountName=${encodeURIComponent(accountName)}`;
    return NextResponse.json({ orderId, total: pricing.total, subtotal: pricing.subtotal, giftServiceFee: pricing.gift_service_fee, qrUrl, bank: { bankId, accountNo, accountName }, paymentStatus: 'pending_confirmation', sheetSync }, { status: 201 });
  } catch (error) {
    console.error('Create order failed:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Tiệm chưa lưu được đơn vào Firebase. Cậu thử lại sau nhé.' }, { status: 503 });
  }
}
