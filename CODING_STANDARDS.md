# Coding standards

> Owned by the repository owner (settled 2026-11-26 in factory-init). No factory run may change this file.

How the factory uses this file: every implementer is shown every rule. The rules **kept by a check** are decided by the exit code of the command named in `.factory/project.json` (`commands.<name>`). The rules **kept by review** are judged by every reviewer, with the file and line of each place one is broken. A `blocking` rule that fails sends the code back to its implementer; a `minor` one is reported and never blocks.

## Rules

| ID  | Rule                                                                                                                                                                                                                                                 | Severity | Kept by          |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------- |
| S1  | Code is formatted by Prettier with the committed `.prettierrc.json` (`npm run format`).                                                                                                                                                              | blocking | check: format    |
| S2  | oxlint reports no error and no warning on the whole project (`npm run lint`).                                                                                                                                                                        | blocking | check: lint      |
| S3  | The type check passes in strict mode (`npm run typecheck`).                                                                                                                                                                                          | blocking | check: typecheck |
| S4  | The whole Vitest suite passes (`npm test`).                                                                                                                                                                                                          | blocking | check: test      |
| S5  | No way around the checks: no `any`, `@ts-ignore`, `@ts-expect-error`, `oxlint-disable`/`eslint-disable`, `.skip` or `.only` test, unless the same line says why and names an issue.                                                                  | blocking | review           |
| S6  | An error is handled or passed on with what was being done; it is never swallowed (an empty `catch`, a `catch` that goes on as if it worked). A failed `localStorage` write is reported to the UI (the storage warning), not ignored.                 | blocking | review           |
| S7  | Every behaviour the change adds or fixes has a test that fails without it, through the public interface (rendered component via Testing Library roles and labels, or the exported pure function); a test does not assert on a mock it set up itself. | blocking | review           |
| S8  | No code is left unused: no commented-out code, unused export, unreachable branch, debug output (`console.log`, `debugger`) or TODO without an issue.                                                                                                 | minor    | review           |
| S9  | A name says what the thing is or does, in the words of the domain (task/việc, list/danh sách, filter, due date, priority), not how it is built (`data`, `info`, `handle`, `manager`, `util`).                                                        | minor    | review           |
| S10 | A function or component does one thing and fits on a screen: around 50 lines, nesting no deeper than 3.                                                                                                                                              | minor    | review           |
| S11 | New code goes where the codebase already puts that kind of code, and reuses its components and helpers rather than adding a near-copy.                                                                                                               | minor    | review           |
| S12 | No new runtime dependency where React, the browser platform or an existing dependency already does it.                                                                                                                                               | minor    | review           |
| S14 | A module or function other parts of the code use says in one comment what it is for and why, not how.                                                                                                                                                | minor    | review           |

## Project rules

| ID  | Rule                                                                                                                                                                                      | Severity | Kept by |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------- |
| S15 | Every colour, font, radius and duration in CSS comes from a variable in `src/styles/tokens.css`; no literal colour or duration in a component's styles.                                   | blocking | review  |
| S16 | Task and list state logic (ordering, filtering, persistence, undo) lives in plain TypeScript modules under `src/` with unit tests, separate from the React components that render it.     | minor    | review  |
| S17 | All user-facing copy is the exact Vietnamese text the issue's criteria give, including punctuation (… “ ” .).                                                                             | blocking | review  |
| S18 | Interactive elements are native (`button`, `input`, `select`, `dialog` or with the matching ARIA role) with an accessible name; focus is moved explicitly where a criterion says it goes. | blocking | review  |
