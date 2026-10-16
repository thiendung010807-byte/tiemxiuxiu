# Cập nhật voucher và Fanpage

- Tự động giảm **30.000 VNĐ** khi tổng số lượng sản phẩm trong **một đơn hàng** từ 30 sản phẩm trở lên, không cần nhập mã.
- Giảm một lần trên tổng tiền bao gồm tiền sản phẩm và phí viết hộ thiệp. Phí viết hộ: 3.000 VNĐ/thiệp; phí giao hàng: 0 VNĐ.
- Giá hiển thị ở trang khách và số tiền VietQR được xác định phía server. Firestore lưu `discount_amount` và `total_amount` sau giảm.
- Google Sheets giữ nguyên định dạng cột hiện tại để không phá dữ liệu/công thức cũ, chi tiết voucher nằm trong cột mô tả sản phẩm, còn cột tổng tiền là giá đã giảm.
- Fanpage chân trang: **Đội Sinh viên Tình nguyện Đồng hương Bắc Ninh - NEU** (giữ nguyên đường dẫn Facebook).

Kiểm tra thủ công trước khi đưa lên production: 29 sản phẩm (không giảm), 30 sản phẩm (giảm 30.000đ), 31 sản phẩm kèm thiệp, QR thanh toán, lưu Firestore và ghi Google Sheets. Việc chạy build đầy đủ yêu cầu npm install trên máy có đầy đủ dependencies.
