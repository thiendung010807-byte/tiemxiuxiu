import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { PRODUCTS } from '@/lib/pricing';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type CatalogProduct = { id: string; name: string; desc: string; details: string; price: number; color: string; images: string[]; active?: boolean };
export async function GET() {
  try {
    const snap = await adminDb().collection('products').get();
    const overrides = new Map(snap.docs.map(d => [d.id, { ...d.data(), id: d.id }]));
    const merged: CatalogProduct[] = [...PRODUCTS.map(p => ({ ...p, ...(overrides.get(p.id) || {}) }) as CatalogProduct), ...snap.docs.filter(d => !PRODUCTS.some(p => p.id === d.id)).map(d => ({ ...d.data(), id: d.id }) as CatalogProduct)];
    const products = merged.filter(p => p.active !== false);
    return NextResponse.json({ products }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Load products failed:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ products: PRODUCTS, fallback: true }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
