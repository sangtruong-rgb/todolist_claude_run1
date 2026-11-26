# CLAUDE.md

Danh sách việc: a Vietnamese todo web app for one person, running locally in the browser with data in `localStorage` only (no login, no server). Product: `.factory/product.md`. Design: `.factory/design/DESIGN.md` and `src/styles/tokens.css`. Decisions: `.factory/decisions.md`. Stack ADR: `docs/adr/0001-stack.md`. Work arrives as GitHub issues #1–#5, each with criteria C1..Cn and a prototype under `docs/prototypes/issue-<n>/`.

## Run

- Install: `npm ci` (then `npx playwright install chromium` once for e2e)
- Run locally: `npm start` → http://127.0.0.1:5173 (always this port, `strictPort`; a busy port stops with an error). `.env.example` holds test values only.
- Preview: none.

## Checks

Each exits non-zero on failure; CI (`.github/workflows/ci.yml`) runs the same commands.

- Format: `npm run format` (fix with `npm run format:write`)
- Lint: `npm run lint`
- Types: `npm run typecheck`
- Tests: `npm test` (one file: `npx vitest run <file>`)
- Build: `npm run build`
- E2E: `npm run e2e` (Playwright, serves the built app on port 4173)

## Layout

- `src/main.tsx`: mounts the app and imports the tokens.
- `src/App.tsx`: the root component.
- `src/styles/tokens.css`: the design tokens and base styles; the only place colours, fonts and durations are written.
- `src/**/*.test.ts(x)`: Vitest + Testing Library unit/component tests, next to the code.
- `e2e/*.spec.ts`: Playwright tests through the real browser.
- `docs/prototypes/issue-<n>/`: approved prototypes (throwaway; build what they show, never copy their source).

## Patterns

- React function components with hooks; no class components. State logic (ordering, persistence, undo, filters) in plain TS modules with unit tests; components render it.
- Styles: plain CSS files next to components, using only `var(--token)` values from `tokens.css`. No CSS framework.
- Tests query by role and accessible name (`getByRole('button', { name: 'Thêm' })`), never by class names.
- Vietnamese IME: on Enter, ignore the key while `event.nativeEvent.isComposing` (or keyCode 229) so Telex/VNI composition is not submitted.
- React conventions (no vetted stack skill): keep components small, derive values instead of duplicating state, keys from stable ids, effects only for syncing with `localStorage`.

## Project defaults

Settled for every ticket; a ticket says otherwise only on purpose.

- Lists: no pagination; order as the issue says (unfinished before finished, then by creation).
- Dates and numbers: dates shown `dd/mm` (`dd/mm/yyyy` if another year); "today" is the device's local date; no currency.
- Errors: shown inline under the field (`aria-invalid` + message), in the issue's exact words; storage failures as the banner of #1 C8. No console logging.
- Forms: validation shows on submit and clears when the user types a non-space character; input kept after a rejected submit.
- Deletion: hard delete with a 5 s "Hoàn tác" toast (tasks); confirmation dialog for lists with tasks.
- Names: code identifiers, files and storage keys in English camelCase; UI copy in Vietnamese.
- Access: no accounts; every screen is open.
