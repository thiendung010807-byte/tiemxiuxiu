import 'server-only';
import { adminDb } from '@/lib/firebase-admin';
import { randomUUID } from 'crypto';
import { appendOrderToSheet, type OrderTab } from '@/lib/sheets';

type DbOrder = Record<string, unknown>;
type Product = { name: string; quantity: number; unit_price: number; line_total: number };
type Card = { number: number; deliveryToCustomer: boolean; recipientName: string; recipientContact: string; recipientAddress: string; senderDisplayName: string; deliveryTime: string; message: string; actualRecipientName: string; actualRecipientContact: string; actualRecipientAddress: string };
const str = (value: unknown) => typeof value === 'string' ? value : '';
const num = (value: unknown) => Number(value || 0);

export async function syncOrderToSheet(order: DbOrder) {
  const products: Product[] = Array.isArray(order.products) ? order.products as Product[] : [];
  const cards: Card[] = Array.isArray(order.cards) ? order.cards as Card[] : [];
  const tab: OrderTab = order.gift_option === 'shop' ? 'Người giao hộ' : 'Người tự nhận';
  const productDetails = products.map(p => `${p.name} × ${p.quantity} | Đơn giá: ${p.unit_price} VNĐ | Thành tiền: ${p.line_total} VNĐ`).join('\n') + (num(order.discount_amount) ? `\nVoucher từ 30 sản phẩm: -${num(order.discount_amount)} VNĐ` : '');
  const quantities = products.map(p => `${p.name}: ${p.quantity}`).join('\n');
  const cardDetails = cards.map((card, index) => `Thiệp ${index + 1}: ${card.deliveryToCustomer ? 'Giao về người đặt' : `Người nhận: ${card.recipientName} (${card.recipientContact}), ${card.recipientAddress}`} | Người gửi: ${card.senderDisplayName || 'Ẩn danh'} | Thời gian: ${card.deliveryTime} | Lời nhắn: ${card.message || '(trống)'}`).join('\n');
  await appendOrderToSheet(tab, [
    str(order.order_id), str(order.created_at), cards.length ? 'Viết hộ thiệp' : tab === 'Người tự nhận' ? 'Tự nhận' : 'Giao hộ',
    str(order.customer_name), str(order.customer_phone), str(order.customer_address), str(order.customer_time),
    str(order.sender_name), str(order.sender_phone), str(order.sender_address),
    cards.length ? cards.map(c => c.actualRecipientName).join(' | ') : str(order.recipient_name),
    cards.length ? cards.map(c => c.actualRecipientContact).join(' | ') : str(order.recipient_phone),
    cards.length ? cards.map(c => c.actualRecipientAddress).join(' | ') : str(order.recipient_address),
    cards.length ? cards.map(c => c.deliveryTime).join(' | ') : str(order.recipient_time),
    productDetails, quantities, num(order.product_subtotal), num(order.gift_service_fee), 0, num(order.total_amount),
    str(order.payment_method), str(order.payment_status), str(order.order_status),
    cards.length ? cardDetails : str(order.card_message), str(order.customer_note), str(order.payment_proof_url), str(order.payment_proof_uploaded_at),
  ]);
}

// Lease serializes writers across serverless instances. Stale leases expire automatically.
export async function syncOrderToSheetSafely(order: DbOrder) {
  const id = str(order.order_id);
  if (!/^XX[A-Z0-9]{8,50}$/.test(id)) throw new Error('Mã đơn không hợp lệ');
  const ref = adminDb().collection('_sheet_sync_locks').doc(id);
  const owner = randomUUID();
  const acquired = await adminDb().runTransaction(async tx => {
    const doc = await tx.get(ref);
    const until = Number(doc.data()?.lockedUntil || 0);
    if (until > Date.now()) return false;
    tx.set(ref, { owner, lockedUntil: Date.now() + 120000 }, { merge: true });
    return true;
  });
  if (!acquired) throw new Error('Đơn đang được đồng bộ ở yêu cầu khác; thử lại sau.');
  try { await syncOrderToSheet(order); }
  finally {
    await adminDb().runTransaction(async tx => {
      const doc = await tx.get(ref);
      if (doc.data()?.owner === owner) tx.delete(ref);
    }).catch(err => console.error('Could not release sync lease', err));
  }
}
