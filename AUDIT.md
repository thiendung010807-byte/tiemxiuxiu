# Tiệm Xíu Xiu V6 change log and audit

## Changes

- Moved the order source of truth from Google Sheets to Firebase Admin SDK / Firestore (`orders` collection).
- Google Sheets now receives only user-entered contact, recipient, delivery-time, card-message, and note fields in a new `ContactInfo` tab. The legacy `Orders` tab is left unchanged.
- Dashboard GET/PATCH reads and updates Firestore, and the proof URL is shown on each order.
- Admin API denies all users unless the Firebase ID token is valid, email is verified, and email exactly matches `ADMIN_EMAILS`. Empty allowlist denies everyone. Non-admin login now displays an explicit access-denied screen.
- Added signed Cloudinary payment-proof uploads and stored proof metadata on the Firestore order. Uploading a proof does not mark payment as paid.
- Replaced dead Unsplash image URLs with local SVG product illustrations to avoid 404s.

## Required configuration

- Enable Firestore Database in the same Firebase project as Authentication.
- `FIREBASE_SERVICE_ACCOUNT_JSON` must belong to that Firebase project and have Firestore access.
- Set exact owner email(s) in `ADMIN_EMAILS` in Vercel/local environment and redeploy/restart.
- Configure Google Sheets API and service account for the `ContactInfo` export.
- Configure Cloudinary cloud name, API key/secret, and a **signed** upload preset with image formats and 5 MB maximum.

## Existing data

The prior `Orders` tab is not modified. Orders that were previously only in Sheets are not automatically copied into Firestore, so the dashboard only shows orders created after this version is deployed unless historical records are migrated.

## Verification status

Source changes were made, but dependency installation/build/lint/test have not yet been verified in this environment. Test on a staging deployment before accepting real orders. The in-memory public endpoint rate limiter is best-effort only; add a distributed limiter before high-volume use.
