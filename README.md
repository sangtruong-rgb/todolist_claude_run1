# Danh sách việc

Ứng dụng ghi việc cần làm chạy trên trình duyệt của bạn. Không cần đăng nhập; dữ liệu chỉ nằm trong trình duyệt và không được gửi đi đâu.

## Chạy trên máy

Cài đặt (làm một lần, cần Node.js 22 trở lên):

```bash
npm ci
```

Khởi động:

```bash
npm start
```

App luôn mở ở http://127.0.0.1:5173. Vì dữ liệu được trình duyệt lưu theo địa chỉ này, các việc của bạn vẫn còn giữa các lần chạy. Nếu cổng 5173 đang bị chương trình khác dùng, lệnh dừng với lỗi báo cổng đó bận và không tự chuyển sang cổng khác: hãy tắt chương trình đang dùng cổng 5173 rồi chạy lại.

## Phát triển

| Việc                                                | Lệnh                |
| --------------------------------------------------- | ------------------- |
| Kiểm tra định dạng                                  | `npm run format`    |
| Lint                                                | `npm run lint`      |
| Kiểm tra kiểu                                       | `npm run typecheck` |
| Unit test                                           | `npm test`          |
| Build                                               | `npm run build`     |
| E2E (cần `npx playwright install chromium` một lần) | `npm run e2e`       |
