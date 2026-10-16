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
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    console.warn("[AdminAuth] Rejected: missing_token");
    return null;
  }

  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(token, true);

    const email = (decoded.email || "").trim().toLowerCase();
    const adminEmails = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);

    const verified = decoded.email_verified === true;
    const matched = adminEmails.includes(email);

    if (!verified || !email || adminEmails.length === 0 || !matched) {
      console.warn("[AdminAuth] Rejected:", {
        emailPresent: Boolean(email),
        emailVerified: verified,
        adminListCount: adminEmails.length,
        emailMatched: matched,
      });
      return null;
    }

    return { uid: decoded.uid, email };
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : "unknown";

    console.error("[AdminAuth] Token verification failed:", code);
    return null;
  }
}
