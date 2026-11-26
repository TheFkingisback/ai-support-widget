# Trình khởi động AI Support Widget

Giải nén ZIP và chạy `node server.mjs` bằng Node.js 22 trở lên. Mở URL loopback được in trong terminal. Mở trò chuyện hỗ trợ và hỏi tại sao quá trình nhập không thành công. Câu trả lời xác định hàng 42 và hiển thị các tham chiếu nhập và lỗi tổng hợp. Đặt lại mẫu để bắt đầu một cuộc trò chuyện mới.

`server.mjs` phục vụ mẫu trên máy tính của bạn. `starter/sample.js` chạy trong trình duyệt và trả lời bằng các thiết bị cục bộ. `widget.v0.3.0.js` là bản phát hành tiện ích được ghim. So sánh SHA-256 của nó với `widget.manifest.json`.

Mẫu đã tải xuống mở bằng ngôn ngữ của bộ công cụ này. Thêm `?lang=sr-Latn`, `?lang=sr-Cyrl` hoặc `?lang=ar` để kiểm tra một ngôn ngữ có sẵn khác. Truyền ngôn ngữ đã chọn của người dùng khi gắn SDK vào ứng dụng của bạn.

Để tích hợp ứng dụng của riêng bạn, hãy xóa tập lệnh fixture và gắn `createBootstrapHandler` từ `bootstrap.mjs` trên máy chủ ứng dụng của bạn tại một tuyến đường như `/api/support/bootstrap`. Cung cấp `authenticate(request)` từ phần mềm trung gian phiên hiện có của bạn và `collectContext(user, tenantKey, signal)` từ lớp dữ liệu của bạn. Đặt các biến môi trường riêng tư trong `backend.env.example`. Khởi tạo tiện ích bằng mã thông báo và ngữ cảnh được trả về bởi tuyến đường đó. Đặt `handoffUrl` tùy chọn thành trang hỗ trợ con người HTTPS của bạn. Làm theo [Hướng dẫn nhanh của Trung tâm nhà phát triển](https://support-ai.pontes.uk/developers/quick-start?lang=vi) cho vòng đời phiên.

Phần phụ trợ của bạn có thể cung cấp `getMcpServers(user, signal)` cho trình xử lý khởi động. Trả về một mảng `{id, url, accessToken}` cho tư cách thành viên được xác thực này. Tạo một mã thông báo có thời hạn ngắn, phạm vi đối tượng cho mỗi máy chủ. Bỏ qua lệnh gọi lại để trò chuyện chỉ với ngữ cảnh. Trình duyệt chỉ nhận được phiên tiện ích và ngữ cảnh.
