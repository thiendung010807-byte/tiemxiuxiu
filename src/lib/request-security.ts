import 'server-only';
import { createHash, timingSafeEqual } from 'crypto';
import { adminDb } from '@/lib/firebase-admin';

export function checkOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true; // Non-browser integrations have no Origin header.
  try {
    const source = new URL(origin);
    const allowed = process.env.APP_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
    if (allowed) return source.origin === new URL(allowed).origin;
    const host = request.headers.get('host');
    return !!host && source.host === host && (source.protocol === 'https:' || /^localhost(:\d+)?$/.test(host));
  } catch { return false; }
}

export async function readLimitedJson(request: Request, maxBytes: number): Promise<unknown> {
  const header = Number(request.headers.get('content-length') || 0);
  if (header > maxBytes) throw new Error('Dữ liệu vượt quá giới hạn cho phép');
  const raw = await request.text();
  if (Buffer.byteLength(raw, 'utf8') > maxBytes) throw new Error('Dữ liệu vượt quá giới hạn cho phép');
  return JSON.parse(raw);
}

// Firestore-backed distributed limit: consistent across independent Vercel instances.
export async function enforceRateLimit(request: Request, scope: string, max: number, windowSeconds: number) {
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const digest = createHash('sha256').update(`${scope}:${ip}`).digest('hex');
  const window = Math.floor(Date.now() / (windowSeconds * 1000));
  const ref = adminDb().collection('_request_limits').doc(`${digest}-${window}`);
  const allowed = await adminDb().runTransaction(async tx => {
    const doc = await tx.get(ref);
    const count = Number(doc.data()?.count || 0);
    if (count >= max) return false;
    tx.set(ref, { count: count + 1, expiresAt: new Date((window + 2) * windowSeconds * 1000), scope }, { merge: true });
    return true;
  });
  if (!allowed) throw new Error('Bạn thao tác quá nhiều lần. Vui lòng thử lại sau.');
}

export function compareSecret(actual: string | null, expected: string | undefined) {
  if (!actual || !expected || expected.length < 32) return false;
  const left = Buffer.from(actual), right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
