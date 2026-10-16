import { NextResponse } from 'next/server';
import { bankSettings, buildQuote, orderSchema, qrFor, signQuote } from '@/lib/order-flow';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const requestWindows = new Map<string, { count: number; since: number }>();
export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const now = Date.now();
    if (requestWindows.size > 2000) requestWindows.forEach((value, key) => { if (now - value.since > 600000) requestWindows.delete(key); });
    const prior = requestWindows.get(ip);
    if (prior && now - prior.since < 600000 && prior.count >= 10) return NextResponse.json({ error: 'Cậu yêu cầu QR quá nhiều lần. Hãy thử lại sau nhé.' }, { status: 429 });
    requestWindows.set(ip, !prior || now - prior.since >= 600000 ? { count: 1, since: now } : { ...prior, count: prior.count + 1 });
    const origin = request.headers.get('origin'), host = request.headers.get('host');
    if (origin && host && new URL(origin).host !== host) return NextResponse.json({ error: 'Origin không hợp lệ' }, { status: 403 });
    if (Number(request.headers.get('content-length') || 0) > 90000) return NextResponse.json({ error: 'Thông tin đơn hàng quá dài' }, { status: 413 });
    const parsed = orderSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Thông tin chưa hợp lệ' }, { status: 400 });
    const quote = await buildQuote(parsed.data);
    return NextResponse.json({ orderId: quote.orderId, total: quote.total, qrUrl: qrFor(quote), bank: bankSettings(), quoteToken: signQuote(quote), expiresAt: quote.expiresAt }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Quote failed:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không tạo được mã QR' }, { status: 503 });
  }
}
