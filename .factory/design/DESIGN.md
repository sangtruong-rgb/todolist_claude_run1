# DESIGN.md

> Approved by the repository owner on 2026-11-26 (prototypes of issues #1–#4). Brand: new, direction "Sổ tay ấm áp". Mockups: `prototype/issue-<n>` branches, copied to `docs/prototypes/issue-<n>/` by each run.

## Principles

- **Trang vở có dòng kẻ**: mỗi việc nằm trên một dòng kẻ của riêng nó; một đường lề màu đất nung chạy dọc bên trái trang. Mọi thứ khác yên lặng.
- **Yên tĩnh**: không card, không bóng đổ trừ toast và hộp thoại; một nút đặc (màu nhấn) cho mỗi thao tác chính.
- **Căn trái**: toàn bộ căn trái.
- **Chuyển động chỉ khi thao tác**: tick khi xong việc, toast trượt lên; không gì khác.

## Tokens

Every color, size and duration in the code comes from these, by name. A literal value in a component is a bug. They live in `src/styles/tokens.css` (and `.factory/design/tokens.json`).

| Token | Light | Dark | Use |
|---|---|---|---|
| `--paper` | #FBF7EF | #221F1A | Nền trang, nền ô nhập |
| `--paper-2` | #EFE6D6 | #2E2A23 | Nền hover, banner, mục đang chọn |
| `--ink` | #2E2A24 | #F1E9DA | Chữ chính; nền toast |
| `--muted` | #7A6F60 | #B3A793 | Chữ phụ, placeholder, meta |
| `--muted-2` | #665C4F | #B3A793 | Chữ phụ trên `--paper-2` |
| `--accent` | #C2552D | #C2552D | Đường lề, ô tick đã chọn, nút đặc, viền lỗi, focus ring |
| `--accent-text` | #A9461F | #E58A63 | Chữ màu nhấn (lỗi, quá hạn, ưu tiên Cao, link) |
| `--on-accent` | #FFFFFF | #FFFFFF | Chữ/dấu tick trên `--accent` |
| `--rule` | #E3D7C3 | #3A352D | Dòng kẻ, viền ô |
| `--margin` | rgba(194,85,45,.45) | rgba(229,138,99,.45) | Đường lề dọc |
| `--done` | #776C5D | #9A8F7E | Tên việc đã xong |
| `--shadow` | 0 8px 24px rgba(46,42,36,.18) | 0 8px 24px rgba(0,0,0,.5) | Chỉ toast và hộp thoại |
| `--scrim` | rgba(20,18,15,.45) | same | Nền mờ sau hộp thoại/ngăn kéo |
| `--radius` | 4px | | Mọi góc bo |
| `--motion` / `--ease` | 200ms / ease-out | | Mọi chuyển động |

## Type

- Tiêu đề: Georgia (serif hệ thống), 400, 34/40 (28/34 ở ≤720 px), letter-spacing −0.01em.
- Nội dung: sans hệ thống (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, …`), 16/24.
- Meta và lỗi: 13/20. Banner, toast: 14/20.
- Trang trống: dòng chính Georgia nghiêng 20/28; dòng phụ 14 `--muted`.

## Components

- **Nút chính** (`.btn`): cao 44, padding 0 18, nền `--accent`, chữ `--on-accent`, 600. **Nút phụ** (`quiet`): nền trong, viền `--rule`, chữ `--ink`, 400. **small**: cao 36.
- **Nút ghost** (Sửa, Xoá trên dòng việc): nền trong, chữ `--muted` 14, hover `--paper-2`/`--ink`; disabled opacity .55.
- **Ô nhập** (`.field`): cao 44, nền `--paper`, viền `--rule`, viền dưới `--muted`; lỗi: viền `--accent` + `aria-invalid` + dòng lỗi 13 `--accent-text` ngay dưới.
- **Ô tick**: 22×22, viền 1.5 `--ink`; đã chọn nền `--accent`, dấu tick vẽ bằng nét SVG (stroke-dashoffset 200 ms).
- **Dòng việc**: min-height 52, viền dưới `--rule`, gap 14; đã xong: gạch ngang + màu `--done`.
- **Banner** (chặn lưu): nền `--paper-2`, viền trái 3 `--accent`, 14/20.
- **Bộ lọc**: các nút chữ, gạch chân 2 px `--ink` cho nút đang chọn (`aria-pressed`).
- **Toast**: cố định đáy giữa, nền `--ink`, chữ `--paper`, nút "Hoàn tác" chữ đậm gạch chân; trượt lên + hiện dần 200 ms.
- **Hộp thoại**: nền `--paper`, tối đa 420, padding 24, tiêu đề Georgia 24/30, nút phải.
- **Ngăn kéo** (≤720 px): từ trái, rộng min(320px, 86vw), `--shadow`.

Prototype của mỗi issue là nguồn chuẩn cho bố cục và trạng thái; build theo nó, không chép mã của nó.

## Layout

- Trang (`.sheet`): tối đa 840 px, căn giữa; padding 40 24 96 72; đường lề ở left 52 px.
- ≤720 px: padding 20 16 96 40, đường lề ở 24 px; ô nhập và nút "Thêm" chiếm cả dòng.
- Cột danh sách (#5): 248 px bên trái ở >720 px.
- Breakpoint duy nhất: 720 px. Kiểm tra ở 390 và 1440; không bao giờ cuộn ngang (tên dài dùng `overflow-wrap: anywhere`).

## Motion

200 ms ease-out cho tick, mờ tên việc và toast. Không gì khác chuyển động. `prefers-reduced-motion: reduce` tắt mọi animation/transition.

## Accessibility

Tương phản chữ ≥ 4.5:1 (vì vậy `--accent-text` cho chữ). Focus ring 2 px `--accent`, offset 2. Mọi thao tác dùng được bằng bàn phím; ô và nút có nhãn tiếng Việt; vùng bấm ≥ 36 px.

## Voice

Tiếng Việt, ngắn, thân thiện, không ngôi thứ nhất của app. Lỗi nói phải làm gì: "Hãy nhập tên việc.", "Ngày hạn chót không hợp lệ.", "Trình duyệt đang chặn lưu dữ liệu. Việc bạn thêm sẽ mất khi đóng trang.".
