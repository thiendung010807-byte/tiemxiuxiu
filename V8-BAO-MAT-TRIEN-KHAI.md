# Tiệm Xíu Xiu V8 - bảo mật và ổn định

## Thay đổi mã nguồn
- Firestore Rules mới (`firestore.rules`) từ chối đọc/ghi trực tiếp từ client. **Phải tự Publish trong Firebase Console**.
- Chặn Origin ngoại lai trên 3 API thanh toán; đặt `APP_ORIGIN=https://ten-mien-cua-ban` trong Vercel.
- Giới hạn request thực theo bytes, kể cả request không có Content-Length.
- Giới hạn tần suất qua giao dịch Firestore (chia sẻ giữa các Vercel instances). Dữ liệu rate limit lưu trong `_request_limits`; nên bật Firestore TTL policy trên field `expiresAt` để xóa tự động.
- Nén token quote và xác thực HMAC SHA256. Token V7 chưa nén sẽ **không còn hợp lệ** (khách tạo QR mới).
- `ORDER_QUOTE_SECRET` nay là biến bắt buộc có >=32 ký tự ngẫu nhiên, không dùng lại secret Cloudinary.
- Khoá phân tán `_sheet_sync_locks` khi append Sheets để giảm ghi trùng do cạnh tranh. Google Sheets API không cung cấp unique constraint, cần theo dõi và phục hồi lock khi thất bại.
- Danh mục sản phẩm lỗi Firestore trả 503 thay vì trả lại sản phẩm mặc định không chắc còn bán.
- Webhook Sheets xác thực secret constant-time, giới hạn request, kiểm tra tab; Apps Script đọc secret từ Script Properties.
- Security headers bổ sung HSTS và tắt DNS prefetch.

## Việc bắt buộc làm ngoài mã nguồn
1. Publish Firestore Rules trong Firebase Console. Rule deny-all KHÔNG chặn Firebase Admin SDK trên server.
2. Đặt `APP_ORIGIN` (ví dụ `https://shop.example`), `ORDER_QUOTE_SECRET` dài >=32 ký tự, `SHEETS_WEBHOOK_SECRET` >=32 ký tự trong Vercel. Tránh chia sẻ các khóa này.
3. Nếu dùng Apps Script, đặt `SHEETS_WEBHOOK_SECRET` trong Project Settings > Script properties, cài installable onEdit trigger; hoặc không cài Apps Script nếu chỉ quản trị từ Dashboard.
4. Bật TTL policies trên `expiresAt` ở collection `_request_limits` (Firestore TTL dùng Date/Timestamp). `_sheet_sync_locks` được xóa khi hoạt động xong nhưng có thể tồn tại nếu server dừng bất ngờ; lock tự hết hạn sau 2 phút.
5. Cloudinary: vô hiệu preset unsigned, giới hạn loại file/dung lượng trong preset, cân nhắc chuyển ảnh minh chứng sang delivery authenticated/private. Hiện tại ảnh được lưu bằng secure_url công khai.
6. Giới hạn quyền của Google Sheets service account, Firebase service account; bật 2FA trên các tài khoản quản trị; xoay khóa đã từng bị lộ.
7. Next.js 14.2.3 CÓ lỗ hổng đã biết. Theo thông báo Vercel tháng 5/2026, Next 14.x không còn bản vá đủ; **phải nâng cấp sang Next >=15.5.18 hoặc phiên bản 16.x đã vá**. Chưa tự nâng major trong V8 vì không cài được dependencies để kiểm thử tương thích.
8. Không thể xác thực ngân hàng thanh toán chỉ từ ảnh tải lên; admin vẫn phải đối chiếu sao kê trước khi đánh dấu paid.

## Giới hạn
- Đây là hardening có kiểm tra mã tĩnh, chưa thử end-to-end với Firebase/Sheets/Cloudinary thật.
- Một số đơn hàng cực lớn vẫn có thể vượt giới hạn token 120KB ngay cả khi nén. Giải pháp triệt để là checkout session trên server, cần thay đổi giao thức thanh toán và kiểm thử kỹ.
- Firestore rate limit tính tiền truy cập DB; cân nhắc Upstash Redis / Cloudflare Turnstile / WAF Vercel để chống tấn công lớn hơn.
