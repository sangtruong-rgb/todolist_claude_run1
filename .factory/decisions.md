# Decisions

Answers people gave, so nobody asks them again and no ticket contradicts them. One line each, newest last. Change a decision by adding a line that replaces it.

| # | Decision | Applies to | Source | Replaces |
|---|---|---|---|---|
| 1 | Stack: Vite + React + TypeScript, CSS thuần với token, Vitest + Testing Library, Playwright e2e, oxlint + Prettier, GitHub Actions (ADR 0001). | all | init 2026-11-26 | |
| 2 | Dữ liệu chỉ lưu trong `localStorage` của trình duyệt; không đăng nhập, không server, không gửi dữ liệu việc đi đâu. | all | #1, init 2026-11-26 | |
| 3 | App luôn chạy ở `127.0.0.1:5173` (`strictPort`); cổng bận thì dừng với lỗi, không đổi cổng. | all | #1 C7, init 2026-11-26 | |
| 4 | Giao diện chỉ tiếng Việt; phong cách "Sổ tay ấm áp", sáng/tối theo hệ thống, không có nút chuyển. | all | #1 Notes, init 2026-11-26 | |
| 5 | Chữ màu nhấn dùng `--accent-text` (#A9461F sáng / #E58A63 tối); `--accent` #C2552D chỉ cho đường lề, dấu tick và nút đặc. | UI | #1 Notes, init 2026-11-26 | |
| 6 | Chuyển động chỉ khi thao tác, ~200 ms; tắt hẳn khi `prefers-reduced-motion`. | UI | #1 C9, #2 C10 | |
| 7 | Xoá một việc: xoá ngay, không hỏi, có "Hoàn tác" 5 giây. Xoá danh sách có việc: hỏi xác nhận, không hoàn tác. | all | #2, #5 | |
| 8 | Issues #1–#5 được build nguyên văn criteria, không chạy clarify trước. | runs | init 2026-11-26 | |
| 9 | Run factory passed + checks + CI xanh thì tự merge PR (squash) rồi làm issue kế tiếp; thay đổi giao diện không cần người duyệt trước khi merge. | runs | init 2026-11-26 | |
