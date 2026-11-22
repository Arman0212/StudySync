# Test results

Everything below was copied from real command output. Nothing was estimated.

## Final clean verification: 2026-11-22, 23:29 IST (Asia/Kolkata)

Environment: macOS (Darwin 25.5), Node v24.14.1, npm 11.11.0, Playwright 1.65.1 (Chromium headless shell build 1255).

Steps run:

1. `rm -rf node_modules dist test-results`
2. `npm ci`: installed with "found 0 vulnerabilities".
3. `npm run verify`: exit code 0.

```
--- verify summary ---
passed (2.0s)      Type check (tsc strict)
passed (2.2s)      Lint (eslint)
passed (3.4s)      Unit, property and component tests (vitest)
passed (0.7s)      Production build (vite)
passed (14.0s)     End-to-end + accessibility + responsive tests (playwright)

All verification steps passed.
```

| Step | Command | Result |
|---|---|---|
| Type check | `tsc -b --noEmit` (strict, `noUncheckedIndexedAccess`) | 0 errors |
| Lint | `eslint . --max-warnings=0` | 0 errors, 0 warnings |
| Vitest | `vitest run` | **15 files, 129 tests passed, 0 failed** |
| Build | `vite build` | succeeded |
| Playwright | `playwright test` (Chromium, timezone Asia/Kolkata) | **29 tests passed, 0 failed** |

### Vitest breakdown (passed tests per file)

| File | Tests | Covers |
|---|---|---|
| src/scheduling/scheduler.test.ts | 19 | Scheduler scenarios, regeneration, even splitting, performance |
| src/scheduling/scheduler.property.test.ts | 4 | fast-check invariants (300 random worlds per property) and a generator sanity check |
| src/scheduling/rescheduler.test.ts | 5 | Single and bulk reschedule, conflict choices, plan diff |
| src/scheduling/priority.test.ts | 4 | Priority formula and ordering |
| src/scheduling/manual.test.ts | 2 | Manual edit validation |
| src/domain/dates.test.ts | 10 | Date utilities, Asia/Kolkata and America/Los_Angeles off-by-one checks |
| src/domain/validation.test.ts | 6 | Form validation |
| src/domain/progress.test.ts | 6 | Metrics, readiness indicator, alerts |
| src/storage/storage.test.ts | 9 | Save/load, corruption and backup, migration, export/import, rejection of bad files |
| src/state/actions.test.ts | 6 | State transitions (completion, missed, cascade, no duplicates) |
| src/prompts/builder.test.ts | 5 | Prompt contains every chosen setting; all versions render |
| src/prompts/sheets.test.ts | 4 | Prompt sheets match the template files; observed results left empty |
| src/styles/tokens.test.ts | 28 | WCAG AA contrast of token pairs and subject colours |
| src/ui/components.test.tsx | 11 | Status pills, confirm dialog, fields, progress bars, empty states |
| src/screens/screens.test.tsx | 10 | Onboarding, form validation, exam-before-start confirmation, double submit, completion dialog, clipboard (available and fallback), recovery |

### Playwright breakdown

- `e2e/flows.spec.ts` (10 tests):
  - Setup → generate.
  - Earlier exam first, plus the low-daily-max conflict.
  - Topic completion updates metrics and survives a reload.
  - Missed session, then reschedule (same identity).
  - Bulk preview, then confirm.
  - Locked session survives regeneration.
  - Exam before plan start.
  - Empty forms.
  - Full reload keeps everything.
  - No data is invented on the welcome screen.
- `e2e/data.spec.ts` (6 tests):
  - Mock prompt with all settings, plus the saved config.
  - Clipboard fallback.
  - Download and reset.
  - Export → import identical; malformed, future-version and damaged files rejected; reset confirmation.
  - Corrupted data → recovery, nothing overwritten.
  - Session edit validation and delete confirmation.
- `e2e/a11y-responsive.spec.ts` (11 tests):
  - axe (WCAG 2.1 A/AA, with no serious or critical violations allowed) on the welcome screen, every main screen with demo data (including day and week views), empty states, dialogs and the recovery screen.
  - Keyboard use.
  - No horizontal overflow at 360, 390, 768, 1024 and 1440 px on every screen and timetable view.
  - The full 360 px flow: bottom navigation, forms and timetable.
- `e2e/smoke.spec.ts` (2 tests): the built app loads, and demo data only appears on request and is labelled.

### Production preview check

I ran `npx vite preview --port 4174` and fetched it with curl:

- `GET /` returned the page with `<title>StudySync</title>`.
- The main JS bundle returned HTTP 200.

## Known gaps

- End-to-end tests run in Chromium only (Firefox and WebKit not tested).
- axe checks catch many problems but not all; there has been no manual screen-reader test (NVDA or VoiceOver).
- The mock-test prompts have not been run against any real assistant.
- Property-based tests use 300 runs per property, with a fixed plan start date and up to 4 subjects, 5 topics each and 5 commitments.
