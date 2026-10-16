# Sửa phân loại Google Sheets V8

- Không có thiệp: tab Người tự nhận.
- Tất cả thiệp chọn **Gửi cho người tạo đơn**: tab **Người tự nhận**.
- Có ít nhất một thiệp chọn **Giao hộ đến tay người nhận**: tab **Người giao hộ** (vì mỗi đơn chỉ được lưu thành một dòng).
- Giữ phí viết thiệp và voucher như trước.
- Đồng bộ lại logic phân loại giữa API hoàn tất đơn, Google Sheets, cập nhật admin và Sheets webhook.
- Các dòng được tạo từ phiên bản cũ ở sai tab không được tự động di chuyển để tránh sửa/xóa dữ liệu vận hành. Cần di chuyển thủ công các dòng cũ nếu cần.
