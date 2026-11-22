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
- **Two passes: an EDF feasibility baseline, then an interleaved day-by-day fill** (changed 2026-11-22 from pure EDF). Pure Earliest-Deadline-First was provably safe, but it starved later subjects early in the plan; this was the known limitation. Now:
  1. EDF runs first. The minutes it schedules per subject are the feasibility benchmark.
  2. Days are then filled in date order. Each slot goes to the eligible subject with the highest session score.
  3. A subject is eligible only if the **capacity reservation** for every earlier exam still holds: margin × the remaining EDF-feasible work for exams up to and including that one must be no more than the usable minutes left before it. It must also not make three sessions of the same subject in a row, unless nothing else is eligible.
  4. Leftovers are placed by EDF.
  5. The result is accepted only if no subject has more conflict minutes than EDF. Otherwise it retries with margins 1.1 → 1.5 → 2.5, then falls back to plain EDF.
- **Why verify against EDF instead of trusting the reservation?** The reservation uses a fluid estimate of usable minutes: gaps of at least 25 minutes, capped by the daily budget, without the long-break rule. That estimate can be optimistic with fragmented days. Checking against the exact EDF result gives a hard guarantee (property-tested: "a feasible EDF plan stays feasible" and "no subject is worse off") while keeping the code simple.
- **Why margins and a fallback?** Starting at 1.1 leaves a little slack for fragmentation. Tighter scenarios retry more conservatively. The final fallback means the worst case is exactly the old, proven-safe behaviour. On a fixed-seed sample of random scenarios, 88% of multi-subject plans (125/142) were accepted as interleaved.
- **Session score** = topic priority + urgency (max(0, 14 − days to exam)) + 2 for high-priority subjects + 3 × missed sessions of the topic (cap 3). Urgency is measured from the day being filled, so a subject naturally gets more slots as its exam approaches. The score only orders eligible subjects; it can never override the reservation.
- **Consecutive rule:** at most 2 sessions of the same subject in a row on a day, judged by time order including preserved sessions. It yields only when no other subject can use that slot (for example, the others are finished, past their exam, blocked by the reservation, or their minimum chunk doesn't fit the remaining daily budget).
- Subjects whose exams start at the same moment are still interleaved round-robin in the EDF pass.
- Planning attempts use temporary ids, and only the accepted plan draws ids from the real id factory, so rejected attempts never consume ids.
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
