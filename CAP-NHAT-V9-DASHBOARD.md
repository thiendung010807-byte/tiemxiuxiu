# Tiệm Xíu Xiu - V9 Dashboard

- Tab "Đơn hàng" thành "Giao hàng": chỉ lấy đơn payment_status=paid và order_status khác delivered/cancelled; sắp theo thời gian nhận/giao sớm nhất từ customer_time, recipient_time và từng card.deliveryTime. Nếu chưa có mốc hợp lệ, đưa cuối danh sách.
- Thêm "Xóa đơn" tại mỗi đơn và hộp thoại xác nhận. API DELETE /api/admin/orders kiểm tra quyền Firebase Admin và mã đơn, xóa các dòng tương ứng trong hai tab Google Sheets rồi xóa document Firestore. Khi Sheets lỗi, không cố tình xóa Firestore; có thể thử lại từ dashboard.
- Lưu ý: Đây là xóa vĩnh viễn, không có hoàn tác. Nên xuất bản sao lưu Firestore/Sheets trước khi thao tác.
- Với đơn gồm nhiều thiệp có những giờ giao khác nhau, hiện đang ưu tiên theo giờ gần nhất của đơn, chứ chưa tách ra thành nhiều công việc giao hàng riêng.
- Tab Tổng quan và Chờ xác nhận tiếp tục phân trang theo ngày tạo; tab Giao hàng tải các đơn đã thanh toán để sắp thứ tự trên toàn bộ tập kết quả. Nếu số đơn rất lớn cần bổ sung trường lịch giao chuẩn hóa và truy vấn có index/phân trang từ Firestore.
- Cần kiểm tra build Vercel và cấu hình quyền Google Sheets thực tế; chưa thể chạy thử với dịch vụ thật.
