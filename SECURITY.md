# Security notes

## Protect secrets

- Never commit `.env.local`, service-account JSON, private keys, bank account configuration, or production credentials.
- `NEXT_PUBLIC_*` values are public browser configuration only; never put secrets in them.
- Keep the Google Sheet private and share it only with the service account and trusted staff.
- Keep `CLOUDINARY_API_SECRET` server-only. Use a signed Cloudinary upload preset with image formats and a size limit.

## Admin access

- Firebase Google sign-in is only the first step. Each admin API request must include a Firebase ID token.
- The server verifies token signature/revocation, verified email and the `ADMIN_EMAILS` allowlist. The allowlist being empty denies everyone.
- Order records are read/updated in Firestore only through server API routes; the Firebase Admin SDK bypasses Firestore client security rules, so never remove the server-side allowlist.
- Remove staff from `ADMIN_EMAILS` promptly when access is no longer needed.

## Payment safety

- Viewing a QR code does not write a Firestore or Sheets order. Photos upload to Cloudinary first; the final submit verifies the Cloudinary resource and creates the Firestore order, then syncs Sheets. This never automatically claims a transfer was received.
- Configure a strong server-only ORDER_QUOTE_SECRET; if missing, CLOUDINARY_API_SECRET is used. Quotes expire after 90 minutes.
- Verify the actual bank transaction independently before setting `payment_status=paid`.
- Never request card details, bank passwords, OTPs, or identity documents.

## Customer data

- Collect only fields needed to fulfill the order. Limit spreadsheet access and define a retention/deletion policy.
- Do not expose the Sheets API or admin data to unauthenticated clients.
- Do not render user-supplied message content as HTML.

## Before launch

- Test invalid payloads, forged prices, repeated submissions, unauthenticated admin requests, non-allowlisted users, missing Google credentials, QR configuration errors and spreadsheet permission failures.
- Add distributed rate limiting and durable idempotency before promoting a public link.
