# Tiệm Xíu Xiu — luồng đặt hàng và viết hộ thiệp (bản cập nhật)

## Thay đổi chính

- Không còn lựa chọn "Tớ tự gửi / Tiệm gửi hộ". Người mua điền họ tên, số điện thoại, địa chỉ, thời gian muốn nhận.
- Nút **Viết hộ thiệp** thêm thiệp đầu tiên và ẩn thời gian nhận chung. Mỗi thiệp có: người nhận, điện thoại/Facebook, địa chỉ, tên người gửi hiển thị (để trống = ẩn danh), giờ giao và lời nhắn. Thiệp có thể được thêm, xóa hoặc chuyển qua lại mà không mất thông tin trong phiên làm việc.
- Nếu bỏ trống cả tên, thông tin liên hệ và địa chỉ người nhận của một thiệp, thiệp đó sẽ được chuyển đến người tạo đơn. Nếu chỉ điền một phần ba ô, website báo cần hoàn thiện hoặc để trống cả ba.
- Số thiệp tối đa bằng tổng số lượng sản phẩm trong giỏ. Mỗi thiệp +3.000đ; **phí giao hàng luôn bằng 0**.
- Khi bấm **Xem mã QR**, `/api/orders/quote` kiểm tra hàng và giá trực tiếp từ Firestore, sinh mã đơn, tạo mã QR và ký phiên thanh toán (90 phút). Chưa ghi đơn vào Firestore/Sheets.
- Ảnh minh chứng được tải lên Cloudinary qua chữ ký tương ứng mã đơn. Khi khách bấm **Hoàn tất đơn hàng**, `/api/orders` xác thực chữ ký phiên và kiểm tra tài nguyên ảnh tồn tại thực tế trên Cloudinary, rồi **mới** ghi Firestore, sau đó append vào Google Sheets.
- Firestore `orders` lưu mảng `cards`, `cards_json`, `card_count` và dữ liệu cũ để tương thích các đơn trước đó. Google Sheets vẫn sử dụng hai tab `Người tự nhận` và `Người giao hộ`, giữ nguyên 27 cột để không phá dữ liệu cũ; nhiều thiệp được diễn giải theo thứ tự trong các cột thông tin người nhận và lời nhắn.
- Dashboard có tab Tổng quan, Chờ xác nhận, Đơn hàng, Sản phẩm. Đơn hàng có nút tải thêm để tránh giới hạn 300 bản ghi cũ.

## Cấu hình & triển khai

1. Sao chép biến môi trường từ `.env.example`; giữ nguyên Firebase, Cloudinary, Google Sheets, VietQR, `ADMIN_EMAILS` như hệ thống trước. Thêm `ORDER_QUOTE_SECRET` ngẫu nhiên (>= 32 ký tự) vào Vercel. Nếu chưa có biến này, hệ thống tự dùng `CLOUDINARY_API_SECRET` để ký QR tạm thời.
2. Bảo đảm Cloudinary cho phép signed upload theo preset `CLOUDINARY_UPLOAD_PRESET`; cần API key/secret có quyền đọc resource để máy chủ kiểm tra ảnh đã tải lên trước khi nhận đơn.
3. Google Sheet cũ không cần xóa hoặc sửa hàng tiêu đề. Kiểm tra service account có quyền Editor. Các tab `Người tự nhận`, `Người giao hộ` được giữ để tương thích với Apps Script đang đồng bộ trạng thái.
4. Test thử: không thiệp, một thiệp giao người đặt, nhiều thiệp giao nhiều người, xóa/chuyển thiệp, nhập sai dữ liệu, bỏ dở ở QR (không tạo đơn), tải ảnh nhưng không bấm hoàn tất (không tạo đơn), hoàn tất và xác minh chỉ một đơn xuất hiện trên Firebase/Sheet, bấm hoàn tất lặp lại, cập nhật trạng thái dashboard.

## Lưu ý vận hành

- **Chỉ Cloudinary có thể chứa ảnh tải dở**, còn Firestore/Sheets chỉ ghi khi bấm hoàn tất. Nên có chính sách xóa ảnh Cloudinary không gắn với đơn sau thời gian giữ phù hợp.
- QR có hiệu lực 90 phút nhằm bảo vệ giá và phiên thanh toán. Nếu mã QR hết hạn, khách cần quay lại checkout để tạo QR mới; nếu đã chuyển tiền hãy liên hệ tiệm để đối soát, tránh chuyển trùng.
- Firestore được ghi trước rồi mới đồng bộ Sheets. Nếu Sheets lỗi, đơn vẫn có trong dashboard; trạng thái `sheet_sync_status=failed` và cảnh báo xuất hiện trên màn hình thành công. Phải kiểm tra và đồng bộ thủ công dữ liệu thiếu; không tự động append lại khi chưa xác minh để tránh trùng hàng.
- Dashboard thống kê trên những đơn đã tải. Bấm **Tải thêm đơn hàng** trong tab Đơn hàng để duyệt tiếp; chưa có chỉ số aggregate toàn cục.
- Không chỉnh sửa các secret trực tiếp trong repository. Luôn đối soát tiền ngân hàng thật trước khi xác nhận đã thanh toán.
