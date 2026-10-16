import 'server-only';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase-admin';
import { PRODUCTS, calculateVoucher } from '@/lib/pricing';

const phone = z.string().trim().regex(/^[0-9+().\s-]{8,20}$/, 'Số điện thoại chưa hợp lệ');
const contact = z.string().trim().max(300).refine(v => !v || /^[0-9+().\s-]{8,20}$/.test(v) || /^https?:\/\/(www\.|m\.)?(facebook\.com|fb\.com|fb\.me)\//i.test(v), 'Nhập số điện thoại hoặc đường dẫn Facebook hợp lệ');
export const cardSchema = z.object({
  recipientName: z.string().trim().max(100), recipientContact: contact,
  recipientAddress: z.string().trim().max(300), senderDisplayName: z.string().trim().max(100),
  deliveryTime: z.string().trim().min(1, 'Vui lòng chọn thời gian giao thiệp').max(120),
  message: z.string().trim().max(500),
}).superRefine((card, ctx) => {
  const fields = [card.recipientName, card.recipientContact, card.recipientAddress];
  if (fields.some(Boolean) && !fields.every(Boolean)) ctx.addIssue({ code: 'custom', message: 'Vui lòng điền đủ tên, liên hệ và địa chỉ người nhận, hoặc để trống cả 3 ô nếu gửi về người tạo đơn.' });
});
export const orderSchema = z.object({
  items: z.array(z.object({ id: z.string().min(1).max(100), quantity: z.number().int().min(1).max(20) })).min(1).max(50),
  customer: z.object({ name: z.string().trim().min(2).max(100), phone, address: z.string().trim().min(3).max(300), time: z.string().trim().max(120) }),
  cards: z.array(cardSchema).max(40),
  note: z.string().trim().max(500).default(''), consent: z.literal(true),
}).superRefine((data, ctx) => {
  const ids = new Set<string>();
  for (const item of data.items) {
    if (ids.has(item.id)) ctx.addIssue({ code: 'custom', path: ['items'], message: 'Sản phẩm bị trùng' });
    ids.add(item.id);
  }
  if (data.cards.length > data.items.reduce((s, i) => s + i.quantity, 0)) ctx.addIssue({ code: 'custom', path: ['cards'], message: 'Số thiệp không được nhiều hơn tổng số sản phẩm' });
  if (data.cards.length === 0 && !data.customer.time) ctx.addIssue({ code: 'custom', path: ['customer', 'time'], message: 'Vui lòng chọn thời gian muốn nhận' });
});

export type OrderInput = z.infer<typeof orderSchema>;
export type Card = OrderInput['cards'][number];
export type OrderProduct = { id: string; name: string; quantity: number; unit_price: number; line_total: number };
export type Quote = { orderId: string; createdAt: string; expiresAt: number; data: OrderInput; products: OrderProduct[]; subtotal: number; giftFee: number; discount: number; total: number };

export async function buildQuote(data: OrderInput): Promise<Quote> {
  const snapshot = await adminDb().collection('products').get();
  // Firestore documents are dynamic; retain unknown field types until validated.
  type CatalogProduct = { id: string; name: unknown; price: unknown; active?: unknown };
  const overrides = new Map<string, CatalogProduct>(snapshot.docs.map(d => {
    const data: Record<string, unknown> = d.data();
    return [d.id, { id: d.id, name: data.name, price: data.price, active: data.active }];
  }));
  const catalog: CatalogProduct[] = [
    ...PRODUCTS.map(p => {
      const override = overrides.get(p.id);
      return {
        id: p.id,
        name: override?.name ?? p.name,
        price: override?.price ?? p.price,
        active: override?.active ?? true,
      };
    }),
    ...Array.from(overrides.values()).filter(p => !PRODUCTS.some(base => base.id === p.id)),
  ];
  const products = data.items.map(item => {
    const found = catalog.find(p => p.id === item.id);
    if (!found || found.active === false || typeof found.price !== 'number' || !Number.isSafeInteger(found.price) || found.price <= 0 || typeof found.name !== 'string' || !found.name.trim()) {
      throw new Error('Sản phẩm đã hết bán hoặc giá không hợp lệ. Cậu tải lại trang nhé.');
    }
    return { id: item.id, name: found.name, quantity: item.quantity, unit_price: found.price, line_total: found.price * item.quantity };
  });
  const subtotal = products.reduce((sum, item) => sum + item.line_total, 0);
  const giftFee = data.cards.length * 3000;
  const discount = calculateVoucher(data.items.reduce((sum, item) => sum + item.quantity, 0));
  return { orderId: `XX${Date.now().toString(36).toUpperCase()}${randomBytes(5).toString('hex').toUpperCase()}`, createdAt: new Date().toISOString(), expiresAt: Date.now() + 90 * 60 * 1000, data, products, subtotal, giftFee, discount, total: Math.max(0, subtotal + giftFee - discount) };
}

function quoteSecret() {
  const secret = process.env.ORDER_QUOTE_SECRET || process.env.CLOUDINARY_API_SECRET;
  if (!secret || secret.length < 16) throw new Error('ORDER_QUOTE_SECRET chưa được cấu hình an toàn');
  return secret;
}
export function signQuote(quote: Quote) {
  const encoded = Buffer.from(JSON.stringify(quote)).toString('base64url');
  return `${encoded}.${createHmac('sha256', quoteSecret()).update(encoded).digest('base64url')}`;
}
export function verifyQuote(token: string): Quote {
  if (!token || token.length > 120000) throw new Error('Phiên thanh toán không hợp lệ');
  const [encoded, signature, extra] = token.split('.');
  if (!encoded || !signature || extra) throw new Error('Phiên thanh toán không hợp lệ');
  const expected = createHmac('sha256', quoteSecret()).update(encoded).digest();
  const given = Buffer.from(signature, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw new Error('Phiên thanh toán đã bị thay đổi');
  const quote = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as Quote;
  if (!quote || quote.expiresAt < Date.now() || quote.expiresAt > Date.now() + 91 * 60 * 1000 || !/^XX[A-Z0-9]+$/.test(quote.orderId)) throw new Error('Phiên thanh toán hết hạn. Vui lòng tạo mã QR mới.');
  return quote;
}
export function bankSettings() {
  const bankId = process.env.VIETQR_BANK_ID, accountNo = process.env.VIETQR_ACCOUNT_NO, accountName = process.env.VIETQR_ACCOUNT_NAME;
  if (!bankId || !accountNo || !accountName) throw new Error('Tiệm chưa cấu hình tài khoản nhận tiền');
  return { bankId, accountNo, accountName };
}
export function qrFor(quote: Quote) {
  const bank = bankSettings();
  return `https://img.vietqr.io/image/${encodeURIComponent(bank.bankId)}-${encodeURIComponent(bank.accountNo)}-qr_only.png?amount=${quote.total}&addInfo=${encodeURIComponent(`TIEM ${quote.orderId}`)}&accountName=${encodeURIComponent(bank.accountName)}`;
}
