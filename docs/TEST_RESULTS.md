# Test results

Everything below was copied from real command output. Nothing was estimated.

## Latest run: 2026-11-23, 00:21 IST (Asia/Kolkata), after the visual polish pass

Command: `npm run verify`, exit code 0. Environment: macOS (Darwin 25.5), Node v24.14.1, npm 11.11.0, Playwright 1.65.1. New dependencies: `lucide-react` and `@fontsource-variable/inter` (bundled locally, so the font still works offline).

```
--- verify summary ---
passed (2.0s)      Type check (tsc strict)
passed (2.3s)      Lint (eslint)
passed (2.8s)      Unit, property and component tests (vitest)
passed (0.5s)      Production build (vite)
passed (17.7s)     End-to-end + accessibility + responsive tests (playwright)

All verification steps passed.
```

| Step | Result |
|---|---|
| Type check | 0 errors |
| Lint | 0 errors, 0 warnings |
| Vitest | **16 files, 191 tests passed, 0 failed** (was 15 files and 138 tests) |
| Build | succeeded |
| Playwright | **30 tests passed, 0 failed** (was 29) |

What changed in the tests:

- `src/styles/tokens.test.ts`: every text/background pair is now checked for WCAG AA (4.5:1) in **both** the light and dark themes. New pairs cover the alternate surface, neutral pills, toasts, the dashboard hero and the mock-test paper card. A new set of non-text pairs (focus ring, input borders, ring/bar fill on its track) must reach 3:1 in both themes. There is also a check that the dark theme defines every light token.
  - This check caught a pre-existing problem: the input border (`borderStrong` `#9fb5a6`) was only 2.18:1 on white. I changed it to `#7d9585` (3.23:1), and the dark value is `#5f7a68` (3.67:1).
- `src/ui/heatmap.test.ts` (new, 3 tests): week columns run Monday first, only completed sessions count, recorded actual minutes are preferred, and minutes map to the five heatmap levels.
- `e2e/a11y-responsive.spec.ts`: a new test runs axe on every screen, plus the week view, with the system set to dark mode. It also checks that the Settings theme toggle overrides the system setting, survives a reload, passes axe, and goes back to following the system.
- During this pass, axe flagged two problems, which I fixed in the app. The tests were not loosened.
  - The dialog and toast entrance animations faded `opacity`, so text was briefly low-contrast while they appeared. They now animate transform only.
  - On the dashboard, the "Done" button's visible text was not part of its accessible name ("Mark complete: …"), which breaks WCAG 2.5.3. The button now says "Complete", the same as in the timetable.
- The responsive check caught a layout bug in the new week calendar: at 390 px the page became 657 px wide, because screen-reader-only labels were positioned against the page instead of the scroll container. Fixed with `position: relative` on the calendar. Every 390 px screenshot is now exactly 390 px wide.

Screenshots: `docs/screenshots/before/` (light, 1440 and 390 px) and `docs/screenshots/after/` (light and dark, 1440 and 390 px, plus `*-activity-*` shots taken after completing two sessions). `node scripts/screenshots.mjs <dir> [--dark]` recreates them from a running `npm run preview`.

---

## Earlier run: 2026-11-22, 23:47 IST (Asia/Kolkata), after adding interleaved scheduling

Command: `npm run verify`, exit code 0. Same environment as the run below; dependencies were already installed by the clean `npm ci` earlier that evening.

```
--- verify summary ---
passed (1.6s)      Type check (tsc strict)
passed (1.9s)      Lint (eslint)
passed (2.5s)      Unit, property and component tests (vitest)
passed (0.3s)      Production build (vite)
passed (14.0s)     End-to-end + accessibility + responsive tests (playwright)

All verification steps passed.
```

| Step | Result |
|---|---|
| Type check | 0 errors |
| Lint | 0 errors, 0 warnings |
| Vitest | **15 files, 138 tests passed, 0 failed** (was 129; +9) |
| Build | succeeded |
| Playwright | **29 tests passed, 0 failed** (unchanged) |

New and changed scheduler tests:

- `src/scheduling/scheduler.property.test.ts`: 7 tests, up from 4. Each property runs 300 random worlds.
  - **(1) + (2)** Every placement rule holds for the interleaved plan. Whenever the earliest-exam-first (EDF) plan has no conflicts, the interleaved plan has none either, and no subject has more conflict minutes than under EDF.
  - **(2)** The same holds when regenerating around completed, locked and missed sessions. Scheduled plus conflicted time still equals the required time.
  - **(3)** With 2–4 subjects and enough capacity (every day a study day, a 12 h window, a 5 h maximum, exams 10–30 days out, at most 5 h of work per subject), the plan is interleaved with no conflicts, and the first 7 days contain sessions from every subject with a later exam.
  - The generator sanity check now also requires more than 50% of multi-subject random plans to be interleaved. The measured value on that fixed-seed sample was 125/142, i.e. 88%; I read it once from a temporary debug print that was then removed.
  - The original 3 invariant properties are unchanged and now exercise the interleaved scheduler, because `generatePlan` is the interleaved planner.
- `src/scheduling/scheduler.test.ts`: 25 tests, up from 19. New scenarios:
  - The first day mixes subjects where EDF did not.
  - At most two of a subject in a row while another subject still has work.
  - A third in a row is allowed only when nothing else is eligible.
  - A tight earlier exam is still fully protected.
  - Ids from the caller's factory are used only for the returned plan.
  - The session-score formula.
- While writing the tests, a first-draft property for the consecutive rule failed. Its counterexample was legitimate: the third session was the only one that fit the 24 minutes left under the daily maximum, which is allowed by "unless nothing else is eligible". I replaced it with exact deterministic scenarios instead of weakening the scheduler.

---

## Earlier run: final clean verification: 2026-11-22, 23:29 IST (Asia/Kolkata)

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
| src/scheduling/scheduler.test.ts | 19 | Scheduler scenarios, regeneration, even splitting, performance (25 in the latest run) |
| src/scheduling/scheduler.property.test.ts | 4 | fast-check invariants (300 random worlds per property) and a generator sanity check (7 in the latest run) |
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
