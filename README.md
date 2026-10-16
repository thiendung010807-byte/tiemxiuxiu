> **Phiên bản mới (2026-10-16):** Xem [README-THAY-DOI-2026.md](README-THAY-DOI-2026.md) để đọc luồng đặt hàng, nhiều thiệp, bảng điều khiển, phí và bước ghi đơn mới. Các mô tả "ghi đơn ngay khi xem QR" / "ContactInfo" bên dưới là thông tin lịch sử từ phiên bản cũ.

# Tiệm Xíu Xiu —

Next.js 14 + TypeScript storefront. Firebase Firestore is the source of truth for orders; Google Sheets is only a small contact-information export; Cloudinary stores payment-proof images. Payment remains manually verified by the shop.

## Architecture

- **Firestore (`orders` collection):** all order details, item snapshots, server-calculated amounts, payment/fulfilment statuses, and payment-proof URL/public ID.
- **Google Sheets (`ContactInfo` tab):** only customer-entered contact and delivery details plus order ID/time. A new tab is created automatically. Any old `Orders` tab is left untouched.
- **Cloudinary:** signed image uploads under `tiem-xiu-xiu/payment-proofs/`. Client-side size validation is 5 MB; configure the upload preset with allowed formats and max file size as an additional provider-side limit.
- **Admin:** Google sign-in through Firebase Authentication, then server-side Firebase ID token verification and an exact allowlist in `ADMIN_EMAILS`. Logging into Google alone does not grant admin rights.

## Local setup

1. Install Node.js 20 or newer and run `npm install`.
2. Copy `.env.example` to `.env.local` and fill the variables below.
3. Run `npm run dev` and test at `http://localhost:3000`.
4. Before release, run `npm run lint`, `npx tsc --noEmit`, and `npm run build`.

## Firebase setup

1. Create a Firebase project and register a Web app.
2. Enable **Authentication → Sign-in method → Google** and add `localhost` plus the deployed domain under Authorized domains.
3. Create a Firestore database in **Build → Firestore Database**. The app uses the `orders` collection; documents are created automatically by the server.
4. Create a service account JSON for Firebase Admin and set the entire JSON as server-only `FIREBASE_SERVICE_ACCOUNT_JSON`. Keep it secret.
5. Set the public web config in `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, and `NEXT_PUBLIC_FIREBASE_APP_ID`.
6. Set `ADMIN_EMAILS` to the exact Google email(s) allowed to manage orders, comma-separated. Use lowercase emails. If empty, no account is allowed.
7. Keep Firestore client security rules restrictive because all order access is through server routes. The Admin SDK bypasses client rules; server route allowlisting is therefore essential.

## Google Sheets setup

1. Enable Google Sheets API in the Google Cloud project.
2. Create or select a private spreadsheet and set its ID as `SPREADSHEET_ID`.
3. Create a Google service account with Sheets access, set `GOOGLE_CLIENT_EMAIL` and `GOOGLE_PRIVATE_KEY`, and share the spreadsheet with that service account as Editor.
4. The app creates a `ContactInfo` tab with these 16 columns if it does not exist:

`order_id, created_at, customer_name, customer_phone, customer_address, customer_time, gift_option, sender_name, sender_phone, sender_address, recipient_name, recipient_phone, recipient_address, recipient_time, card_message, customer_note`

5. Existing `Orders` data is not deleted or migrated. New orders go to Firestore first; a Sheets sync failure does not lose the order and is reported in the checkout screen/server logs.

## Cloudinary setup

1. Create an account at https://cloudinary.com/ and open the Console Dashboard.
2. Copy the **Cloud name**, **API Key**, and **API Secret** into `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` as server-only variables. Never use `NEXT_PUBLIC_` for the secret.
3. Go to **Settings → Upload → Upload presets → Add upload preset**. Name it `tiem_xiu_xiu_proofs` (or use a different name and set `CLOUDINARY_UPLOAD_PRESET` to match).
4. Set **Signing Mode = Signed**, allowed formats to `jpg,jpeg,png,webp`, and max file size to `5 MB` if that setting is available. Do not enable unsigned uploads for this flow.
5. The app signs upload parameters server-side. Images are uploaded directly from the browser to Cloudinary, then their URL and public ID are attached to the corresponding Firestore order. The dashboard displays a link to the proof.

## VietQR

Set `VIETQR_BANK_ID`, `VIETQR_ACCOUNT_NO`, and `VIETQR_ACCOUNT_NAME` to the correct receiving account. Verify the QR details before public launch. A screenshot is not proof of money received; staff must verify the bank account before marking an order paid.

## Vercel

1. Add all `.env.local` values in **Project → Settings → Environment Variables**. Add secrets only as server-side variables.
2. Redeploy after environment changes.
3. Add the production Vercel/custom domain to Firebase Authorized domains.
4. Test: submit an order; verify the order exists in Firestore; verify contact details appear in `ContactInfo`; upload a proof; check the proof link in `/admin`; confirm that an email not listed in `ADMIN_EMAILS` gets HTTP 403 and cannot view or update orders.

## Security and operational notes

- Do not commit `.env.local`, service account JSON, or Cloudinary API secret.
- The admin API checks verified Firebase tokens and an exact server-side email allowlist for every read/update.
- Orders are server-priced; clients cannot choose their own prices.
- The public payment-proof routes require a random order ID and accept only URLs in the configured Cloudinary account and expected folder. A proof upload does not change payment status.
- The simple in-memory rate limit is per server instance, not distributed. Consider Vercel Firewall/Upstash for a public campaign.
- Firestore is the source of truth. Old orders previously stored only in the old Sheets `Orders` tab will not automatically appear in the new dashboard; migrate them intentionally if needed.


## Cập nhật quản lý sản phẩm và đồng bộ trạng thái Google Sheets

### Quản lý sản phẩm
- Đăng nhập `/admin`, tại mục **Quản lý sản phẩm** có thể tạo/sửa tên, giá, mô tả, trạng thái hiển thị và tải nhiều ảnh.
- Ảnh được tải lên Cloudinary; thông tin sản phẩm lưu trong Firestore collection `products`.
- Cấu hình Cloudinary hiện tại (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_UPLOAD_PRESET`) được dùng cho cả ảnh sản phẩm và minh chứng chuyển khoản. Ảnh sản phẩm thật cần được chủ tiệm tải lên dashboard; các ảnh minh họa cũ vẫn được giữ làm mặc định.
- Sản phẩm cũ trong `src/lib/pricing.ts` vẫn hiển thị làm mặc định và được hợp nhất với bản ghi Firestore cùng mã sản phẩm. Không xóa dữ liệu đơn hàng cũ.

### Đồng bộ trạng thái đơn hàng hai chiều
- Dashboard cập nhật Firestore trước, sau đó cập nhật hai cột **Trạng thái thanh toán** (V) và **Trạng thái đơn hàng** (W) của đơn tương ứng trong tab `Người tự nhận` hoặc `Người giao hộ`.
- Để chỉnh trạng thái từ Google Sheets và đẩy về Firestore, mở **Extensions → Apps Script**, sao chép nội dung `scripts/google-sheets-on-edit.gs`, sửa `WEB_APP_URL` thành domain production của website và `SHARED_SECRET` thành giá trị `SHEETS_WEBHOOK_SECRET` trên Vercel.
- Tạo **installable trigger** cho hàm `onEditOrderStatus` (event source: From spreadsheet; event type: On edit), cấp quyền khi Google yêu cầu. Dùng các giá trị trạng thái nội bộ như `paid`, `pending_confirmation`, `rejected`, `new`, `preparing`, `ready_for_pickup`, `delivered`, `cancelled` trong cột V/W; không nhập nhãn tiếng Việt vào các ô trạng thái.
- Thêm `SHEETS_WEBHOOK_SECRET` trong Vercel Environment Variables và redeploy. Giữ bí mật này; không đặt trong client-side variables.
- Các tab cũ `ContactInfo` và `Orders` được giữ nguyên. Hệ thống không tự xóa hoặc di chuyển dữ liệu cũ. Hai tab mới dùng hàng tiêu đề tiếng Việt theo `ORDER_HEADERS`.

### Lưu ý triển khai
- Sau khi cập nhật mã, chạy `npm ci` và `npm run build` trước khi deploy.
- Nếu Google Sheets báo lỗi tiêu đề cột, kiểm tra hàng đầu tiên của đúng tab mới (`Người tự nhận` hoặc `Người giao hộ`) khớp với danh sách `ORDER_HEADERS` trong `src/lib/sheets.ts`. Không đổi tên/xóa dữ liệu các tab cũ chỉ để xử lý lỗi này.
