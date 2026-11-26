# Danh sách việc (todolist)

> Confirmed by the repository owner on 2026-11-26 during factory-init, from issues #1–#5. Changes after this go through an issue, not an edit here.

## Problem

Một người muốn ghi nhanh các việc cần làm, đánh dấu việc đã xong và mở lại hôm sau vẫn thấy đúng danh sách cũ, mà không phải tạo tài khoản hay cài gì thêm.

## Success

Năm issue #1–#5 được build và merge: thêm/đánh dấu/lưu việc; sửa/xoá có Hoàn tác; lọc và đếm; hạn chót và ưu tiên; nhiều danh sách.

## Users

| User | What they do here | How often, on what device | Must never see |
|---|---|---|---|
| Một người dùng duy nhất trên trình duyệt của họ | Ghi, tick, sửa, xoá, lọc việc; quản lý danh sách | Hằng ngày, máy tính (1440 px) hoặc cửa sổ hẹp (390 px) | — (không có dữ liệu của người khác) |

## MVP

Một web app chạy trên máy, không đăng nhập, dữ liệu chỉ nằm trong `localStorage` của trình duyệt.

### Journeys

1. **Ghi việc** : gõ tên → Enter/"Thêm" → việc hiện ở cuối nhóm chưa xong. Tên trống → "Hãy nhập tên việc.".
2. **Xong việc** : tick ô vuông → việc gạch ngang, mờ, xuống nhóm đã xong.
3. **Mở lại** : tải lại trang/mở lại trình duyệt → thấy đúng các việc. Trình duyệt chặn lưu → dòng cảnh báo, app vẫn dùng được trong lúc trang còn mở.
4. **Sửa / xoá / hoàn tác** (#2), **lọc / đếm / xoá việc đã xong** (#3), **hạn chót và ưu tiên** (#4), **nhiều danh sách** (#5).

### Rules

Ghi trong `.factory/decisions.md`.

### Numbers

Một người, vài trăm việc; tên việc tối đa 200 ký tự, tên danh sách tối đa 40 ký tự.

## Later

- Đưa app lên mạng (hosting, tên miền): "Trước mắt chỉ chạy trên máy".
- Đồng bộ giữa tab/thiết bị, đăng nhập, nhiều người dùng, nhắc việc, PWA, kéo thả.

## Constraints

Chỉ tiếng Việt. Không server, không gửi dữ liệu việc đi đâu. Chạy bằng một lệnh, luôn cùng một cổng.

## References

Prototype của từng issue trên các nhánh `prototype/issue-<n>` (xem phần Prototype của mỗi issue).

## Open

- #5 chưa có prototype (`docs/prototypes/issue-NN` trong C11 chưa tồn tại); quyết định khi tới #5.
