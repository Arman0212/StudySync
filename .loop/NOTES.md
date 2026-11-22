# Loop notes

- Node 24, React 19.3, Vite 8, Vitest 5, TS 6, ESLint 10, Playwright 1.65 (needs chromium-headless-shell build 1255; `npx playwright install chromium` fixed a "Executable doesn't exist" error).
- verify.mjs always runs `npx playwright install chromium` (no-op when present, retried once); if it fails the e2e step is reported SKIPPED and verify exits 1.
- eslint-plugin-react-hooks v7 flags setState inside effects and ref reads during render. Store autosaves inside `dispatch` (event time) using a stateRef instead of an effect; MockTest derives prompt text with the "compare previous value during render" pattern.
- `src/domain` + `src/scheduling` are lint-restricted: no React/storage/window/Date.now/new Date(). ids.ts therefore lives in src/state.
- MIN_SESSION_MINUTES raised 15 → 25 after seeing 10–15 min fragments in the demo timetable.
- Playwright runs with timezoneId Asia/Kolkata to catch off-by-one-day bugs.
