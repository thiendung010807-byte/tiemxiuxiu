import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb, verifyAdminRequest } from '@/lib/firebase-admin';
import { PRODUCTS } from '@/lib/pricing';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const productSchema = z.object({
  id: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(2).max(120),
  desc: z.string().trim().max(500).default(''),
  details: z.string().trim().max(2000).default(''),
  price: z.number().int().min(0).max(100000000),
  images: z.array(z.string().min(1).max(1000).refine(v => v.startsWith('/images/') || /^https:\/\//i.test(v), 'Ảnh phải là đường dẫn nội bộ hoặc HTTPS')).min(1).max(12),
  color: z.string().trim().max(40).default('bg-pinky'),
  active: z.boolean().default(true),
});
export async function GET(request: Request) {
  if (!await verifyAdminRequest(request)) return NextResponse.json({ error: 'Không có quyền quản trị' }, { status: 403 });
  try {
    const snap = await adminDb().collection('products').get();
    const overrides = new Map(snap.docs.map(d => [d.id, { ...d.data(), id: d.id }]));
    const products = [...PRODUCTS.map(p => ({ ...p, ...(overrides.get(p.id) || {}) })), ...snap.docs.filter(d => !PRODUCTS.some(p => p.id === d.id)).map(d => ({ ...d.data(), id: d.id }))];
    return NextResponse.json({ products });
  } catch { return NextResponse.json({ error: 'Không tải được sản phẩm' }, { status: 503 }); }
}
export async function POST(request: Request) {
  if (!await verifyAdminRequest(request)) return NextResponse.json({ error: 'Không có quyền quản trị' }, { status: 403 });
  const parsed = productSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Thông tin sản phẩm chưa hợp lệ' }, { status: 400 });
  try {
    const { id, ...data } = parsed.data;
    await adminDb().collection('products').doc(id).set({ ...data, updated_at: new Date().toISOString() }, { merge: true });
    return NextResponse.json({ ok: true, product: { id, ...data } });
  } catch (error) {
    console.error('Save product failed:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Không lưu được sản phẩm' }, { status: 503 });
  }
}
