import { NextResponse } from 'next/server';
import { checkOrigin, enforceRateLimit, readLimitedJson } from '@/lib/request-security';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase-admin';
import { verifyQuote } from '@/lib/order-flow';
import { verifyUploadedProof } from '@/lib/cloudinary-proof';
import { syncOrderToSheetSafely } from '@/lib/order-sheet';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const schema = z.object({ quoteToken: z.string().min(20).max(120000), proofUrl: z.string().url().max(1000), proofPublicId: z.string().min(8).max(300) });

export async function POST(request: Request) {
  try {
    if (!checkOrigin(request)) return NextResponse.json({ error: 'Origin không hợp lệ' }, { status: 403 });
    await enforceRateLimit(request, 'complete', 20, 600);
    const parsed = schema.safeParse(await readLimitedJson(request, 150_000));
    if (!parsed.success) return NextResponse.json({ error: 'Thông tin hoàn tất đơn chưa hợp lệ' }, { status: 400 });
    const { quoteToken, proofPublicId, proofUrl } = parsed.data;
    const quote = verifyQuote(quoteToken);
    const ref = adminDb().collection('orders').doc(quote.orderId);
    // Retry safely: never create duplicate rows for an already completed order.
    const existing = await ref.get();
    if (existing.exists) return NextResponse.json({ orderId: quote.orderId, total: quote.total, alreadyCreated: true, sheetSync: existing.data()?.sheet_sync_status !== 'failed' });
    const verifiedProof = await verifyUploadedProof(quote.orderId, proofPublicId, proofUrl);
    const { data } = quote;
    const cards = data.cards.map((card, index) => ({
      ...card, number: index + 1, deliveryToCustomer: card.deliveryMode === 'customer',
      actualRecipientName: card.deliveryMode === 'customer' ? data.customer.name : card.recipientName,
      actualRecipientContact: card.deliveryMode === 'customer' ? data.customer.phone : card.recipientContact,
      actualRecipientAddress: card.deliveryMode === 'customer' ? data.customer.address : card.recipientAddress,
    }));
    const firstCard = cards[0];
    const order = {
      order_id: quote.orderId, created_at: new Date().toISOString(), quote_created_at: quote.createdAt,
      customer_name: data.customer.name, customer_phone: data.customer.phone, customer_address: data.customer.address, customer_time: data.cards.length ? '' : data.customer.time,
      gift_option: data.cards.length ? 'shop' : 'self',
      sender_name: data.customer.name, sender_phone: data.customer.phone, sender_address: data.customer.address,
      recipient_name: firstCard?.actualRecipientName || '', recipient_phone: firstCard?.actualRecipientContact || '', recipient_address: firstCard?.actualRecipientAddress || '', recipient_time: firstCard?.deliveryTime || '', card_message: firstCard?.message || '',
      cards, cards_json: JSON.stringify(cards), card_count: cards.length,
      products: quote.products, products_json: JSON.stringify(quote.products), product_subtotal: quote.subtotal, gift_service_fee: quote.giftFee, delivery_fee: 0, discount_amount: quote.discount, total_amount: quote.total,
      payment_method: 'bank_transfer_qr', payment_status: 'pending_confirmation', order_status: 'new', customer_note: data.note, privacy_consent: true,
      payment_proof_url: proofUrl, payment_proof_public_id: proofPublicId, payment_proof_uploaded_at: verifiedProof.uploadedAt,
      sheet_sync_status: 'pending',
    };
    await ref.create(order);
    let sheetSync = true;
    try {
      await syncOrderToSheetSafely(order);
      await ref.update({ sheet_sync_status: 'synced' });
    } catch (e) {
      sheetSync = false;
      await ref.update({ sheet_sync_status: 'failed' }).catch(() => undefined);
      console.error('Sheet sync failed:', e instanceof Error ? e.message : 'unknown');
    }
    return NextResponse.json({ orderId: quote.orderId, total: quote.total, sheetSync }, { status: 201 });
  } catch (error) {
    console.error('Order completion failed:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không hoàn tất được đơn. Cậu thử lại nhé.' }, { status: 400 });
  }
}
