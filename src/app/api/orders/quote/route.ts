import { NextResponse } from 'next/server';
import { checkOrigin, enforceRateLimit, readLimitedJson } from '@/lib/request-security';
import { bankSettings, buildQuote, orderSchema, qrFor, signQuote } from '@/lib/order-flow';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    if (!checkOrigin(request)) return NextResponse.json({ error: 'Origin không hợp lệ' }, { status: 403 });
    await enforceRateLimit(request, 'quote', 12, 600);
    const parsed = orderSchema.safeParse(await readLimitedJson(request, 1_500_000));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Thông tin chưa hợp lệ' }, { status: 400 });
    const quote = await buildQuote(parsed.data);
    return NextResponse.json({ orderId: quote.orderId, total: quote.total, qrUrl: qrFor(quote), bank: bankSettings(), quoteToken: signQuote(quote), expiresAt: quote.expiresAt }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Quote failed:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Không tạo được mã QR. Vui lòng thử lại hoặc liên hệ tiệm.' }, { status: 503 });
  }
}
