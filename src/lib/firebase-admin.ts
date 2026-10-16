import 'server-only';
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function getAdminApp(): App {
  const existing = getApps().find(app => app.name === '[DEFAULT]');
  if (existing) return existing;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON');
  let credentials: { project_id?: string; client_email?: string; private_key?: string };
  try { credentials = JSON.parse(raw); } catch { throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON must be valid JSON'); }
  if (!credentials.project_id || !credentials.client_email || !credentials.private_key) {
    throw new Error('Firebase service account JSON is missing required fields');
  }
  return initializeApp({ credential: cert({
    projectId: credentials.project_id,
    clientEmail: credentials.client_email,
    privateKey: credentials.private_key.replace(/\\n/g, '\n'),
  }) });
}

export function adminDb() { return getFirestore(getAdminApp()); }

export async function verifyAdminRequest(request: Request) {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return null;
  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(token, true);
    const email = (decoded.email || '').trim().toLowerCase();
    const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);
    if (!decoded.email_verified || !email || adminEmails.length === 0 || !adminEmails.includes(email)) return null;
    return { uid: decoded.uid, email };
  } catch { return null; }
}
