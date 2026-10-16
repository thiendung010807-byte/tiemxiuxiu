# Cập nhật Tiệm Xíu Xiu

- Dashboard: thêm quản lý sản phẩm (tạo/sửa, giá, mô tả, bật/tắt hiển thị, tải nhiều ảnh lên Cloudinary).
- Cửa hàng: đọc catalog từ API/Firestore, hỗ trợ gallery ảnh sản phẩm và mô tả.
- Đơn hàng: định giá theo catalog hiện hành; trường thời gian dùng `datetime-local`; trường liên hệ người nhận chấp nhận số điện thoại hoặc link Facebook.
- Trải nghiệm: overlay khóa thao tác khi tạo đơn/tải minh chứng, cuộn lên đầu khi đổi bước, gợi ý trong biểu mẫu hiển thị dưới ô nhập.
- Dashboard đơn hàng: thêm bộ lọc trạng thái thanh toán và trạng thái đơn.
- Google Sheets: cập nhật cột trạng thái khi dashboard đổi trạng thái; thêm endpoint nhận thay đổi từ Apps Script để đồng bộ về Firestore.
- Bảo toàn các tab cũ `ContactInfo` và `Orders`; không tự xóa hoặc di chuyển dữ liệu cũ.

## Kiểm thử

- Đã kiểm tra cú pháp TypeScript/TSX bằng TypeScript transpile: không phát hiện lỗi cú pháp.
- Chưa thể chạy `npm run build` trong môi trường tạo gói do quá trình cài dependencies không hoàn tất; cần chạy `npm ci` và `npm run build` sau khi giải nén.
