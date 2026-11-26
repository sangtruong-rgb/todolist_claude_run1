# ADR 0001: Vite + React + TypeScript

- Status: accepted (repository owner, 2026-11-26)
- Source: issues #1–#5; `.factory/product.md`

## Context

Một web app chạy trên máy, một người dùng, dữ liệu trong `localStorage`, không server. Các issue sau cần quản lý focus chặt (#2 Hoàn tác, #3 lọc, #5 ngăn kéo và hộp thoại), chuyển động có tôn trọng reduced-motion, và một lệnh khởi động luôn ở cùng một cổng.

## Options

### Vite + React + TypeScript (chosen)

- Pieces: Vite, React 19, TypeScript, CSS thuần với custom properties, Vitest + Testing Library + jsdom, Playwright, oxlint, Prettier, GitHub Actions.
- Fits because: component + state rõ ràng cho focus/toast/drawer/dialog; Vite `strictPort` cho cổng cố định.
- Costs to run: 0 (chạy trên máy).
- Maintained by: bất kỳ dev web nào; React phổ biến nhất.
- Main risk: bundle ~70 kB gzip, thừa so với nhu cầu, không đáng kể khi chạy local.

### Vite + vanilla TypeScript

- Nhẹ nhất; nhưng phải tự viết render lại và quản lý focus cho #2–#5.

### Vite + Svelte + TypeScript

- Gọn; ít phổ biến hơn khi người khác bảo trì.

## Decision

Vite + React + TypeScript, do chủ repository chọn trong factory-init.

## Consequences

Thêm màn hình hay thành phần là thêm component React trong `src/`. Nếu sau này cần đưa lên mạng, `npm run build` cho ra trang tĩnh trong `dist/`, host ở đâu cũng được.
