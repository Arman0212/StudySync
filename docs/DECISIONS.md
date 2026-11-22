# Decisions

Decisions made autonomously during the build, with reasons.

## Stack and dependencies
| Dependency | Why |
|---|---|
| react, react-dom | Required stack (React + TypeScript). |
| vite, @vitejs/plugin-react | Required build tool. |
| typescript | Strict type checking. |
| vitest, jsdom | Unit/component tests, shares Vite config. |
| @testing-library/react, user-event, jest-dom | Component tests from the user's point of view. |
| fast-check | Property-based tests of scheduler invariants. |
| @playwright/test, @axe-core/playwright | E2E, responsive and accessibility checks in real Chromium. |
| eslint, @eslint/js, typescript-eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals | Linting; custom rules enforce architecture boundaries. |
| @types/node | Types for config files and timezone tests. |

No router, state, date or UI libraries: a hash router, a small context store and string-based date utilities are enough and keep the bundle small and offline-friendly.

## Architecture
- **Hash routing** (`#/timetable`) so the static build works on Vercel, Netlify and GitHub Pages sub-paths without rewrites; Vite `base: './'`.
- **Dates are `YYYY-MM-DD` strings, times are minutes after midnight.** All calendar maths goes through `Date.UTC` day numbers, so no value is ever parsed as UTC midnight and shifted. "Now" is computed once in the store with `Intl.DateTimeFormat` in the profile's timezone and passed into pure logic.
- **Pure modules** (`src/domain`, `src/scheduling`) are lint-enforced to have no React, DOM, storage or clock access.
- **Single storage module** (`src/storage/storage.ts`) is the only code touching `localStorage`. A memory fallback is used if storage is blocked.
- **Autosave inside dispatch** (event time) rather than in an effect, so StrictMode and the React Compiler lint rules are satisfied and saves happen exactly once per change.

## Scheduling
- **Earliest-Deadline-First** across exams: an earlier exam's work is placed into the earliest free slots before any later exam's work is considered. This provably prevents a later exam from taking slots an earlier exam needed (exchange argument) and is simple to explain. Trade-off: work is front-loaded, so a later subject may not start until the earlier exam's work is placed. Front-loading also leaves buffer time near exams for rescheduling missed sessions.
- Subjects whose exams start at the same moment are **interleaved round-robin** so neither starves.
- Within a subject: one session per topic in priority order first (every topic gets time), then the remaining work in priority order.
- **Priority formula** `3×importance + 2×difficulty + confidenceGap` — a heuristic, documented in code and README. The subject "high priority" flag only breaks ties between exams at the same time, because the brief says earlier exams get priority.
- Exam **without a start time** → the whole exam day is unavailable for that subject (safest assumption).
- Sessions are split evenly (60 min with 50 preferred → 2×30) and may be shortened to fit a gap, but never below 25 min (the minimum allowed session length) unless the remainder is smaller.
- **Breaks:** at least `shortBreak` between sessions; no more than N sessions chained with gaps shorter than `longBreak`. Breaks are not required next to commitments.
- **Regeneration** keeps completed, in-progress and locked sessions untouched and counts them (except missed ones) as coverage. Unlocked planned/rescheduled/missed sessions are replaced; their ids are reused per topic so the preview can show "moved" instead of "removed + added". Missed sessions remain visible in the activity log.
- Capacity conflict "available time" = raw free study minutes before the exam (window minus commitments, capped at the daily maximum), ignoring other subjects — the most understandable number for a student.

## Product
- Completion % = completed minutes ÷ estimated minutes, where a completed topic counts its full estimate and otherwise completed sessions count their planned duration (capped). Actual minutes are shown separately.
- Readiness indicator = equal-weight average of the inputs that exist (completion, confidence, latest mock score); hidden if none exist; always labelled "indicator, not a prediction".
- Manual session edits are blocked if they overlap a session or commitment, break the daily max, leave the study window/day or pass the exam.
- Reset requires typing RESET. Import asks before replacing. Corrupted data opens a recovery screen and autosave is disabled until the student chooses.
- Schema v1 is defined as an early draft format (no activity log, mock data, demo flag or session history). There were no real v1 users; the migration exists to exercise and test the migration path.
