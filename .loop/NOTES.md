# Loop notes

- Node 24, React 19.3, Vite 8, Vitest 5, TS 6, ESLint 10, Playwright 1.65 (needs chromium-headless-shell build 1255; `npx playwright install chromium` fixed a "Executable doesn't exist" error).
- verify.mjs always runs `npx playwright install chromium` (no-op when present, retried once); if it fails the e2e step is reported SKIPPED and verify exits 1.
- eslint-plugin-react-hooks v7 flags setState inside effects and ref reads during render. Store autosaves inside `dispatch` (event time) using a stateRef instead of an effect; MockTest derives prompt text with the "compare previous value during render" pattern.
- `src/domain` + `src/scheduling` are lint-restricted: no React/storage/window/Date.now/new Date(). ids.ts therefore lives in src/state.
- MIN_SESSION_MINUTES raised 15 → 25 after seeing 10–15 min fragments in the demo timetable.
- Playwright runs with timezoneId Asia/Kolkata to catch off-by-one-day bugs.
- useSubmitGuard initially locked 300ms even after a validation failure, so the 2nd click after fixing a form was ignored (caught by component tests). Handlers now return false on validation failure to release immediately.
- Regeneration preview only offered "Close" when no session changed, so conflict-only changes (exam before start) could never be applied — caught by e2e; preview now also compares conflicts.
- Capacity numbers: with 50-min sessions, 25-min minimum and a 60-min cap, only one session fits per day; "available" in conflicts is raw capacity, so scheduled can be less than available. Documented.
- e2e seeds localStorage directly (helpers.seed) for speed; UI-driven flows cover setup.
- Interleaved scheduler (2026-11-22): a first-draft 'no 3 in a row' property failed on a legitimate case (only the 3rd same-subject session fit the remaining daily budget); replaced with deterministic scenarios. Probe tests via process.stdout.write + --silent=false to see output.
