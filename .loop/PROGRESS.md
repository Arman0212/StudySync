# StudySync — Progress

## M1 Scaffold, tooling, verify skeleton, tokens, app shell
- [x] 1.1 git init, .gitignore, package.json scripts, tsconfig (strict), vite config
- [x] 1.2 ESLint flat config, Vitest config with jsdom + jest-dom setup
- [x] 1.3 Playwright config (chromium, preview server) and scripts/verify.mjs running all steps in order
- [x] 1.4 Design tokens (CSS custom properties, AA-checked), base styles, logo component
- [x] 1.5 App shell: sidebar (desktop), top bar + bottom nav (mobile), hash router, landmarks, toasts, saved indicator
- [x] 1.6 Milestone verify

## M2 Domain types, date utilities, storage
- [x] 2.1 Domain types (profile, availability, commitments, subjects, topics, sessions, activity, mock tests)
- [x] 2.2 Date/time utilities on local date strings + minute offsets (no UTC parsing), tests incl. Asia/Kolkata
- [x] 2.3 Validation module with tests
- [x] 2.4 Storage module: schema version, save/load, raw backup, corruption detection, migrations, tests
- [x] 2.5 Milestone verify

## M3 Scheduling engine
- [x] 3.1 Priority formula module + tests
- [x] 3.2 Free-slot calculation (study days, window, commitments, existing sessions, breaks, daily max) + tests
- [x] 3.3 Scheduler: EDF-aware allocation preventing later exams starving earlier ones, splitting, conflicts + scenario tests
- [x] 3.4 Regeneration keeping completed/locked/in-progress sessions + tests
- [x] 3.5 Property-based tests (fast-check) for all invariants
- [x] 3.6 Milestone verify

## M4 Rescheduler and plan diff
- [x] 4.1 Reschedule single missed session (identity, history, count, reason, conflict) + tests
- [x] 4.2 Bulk reschedule preview + apply + tests
- [x] 4.3 Plan-diff preview (added/moved/removed) + tests
- [x] 4.4 Milestone verify

## M5 Setup screens
- [x] 5.1 App state store (reducer + autosave via storage module) + tests
- [x] 5.2 Welcome screen (create profile / load demo)
- [x] 5.3 Profile + availability forms with inline validation + component tests
- [x] 5.4 Commitments form/list (one-off / weekly) + tests
- [x] 5.5 Subjects + topics forms, exam-before-start confirm, empty states + tests
- [x] 5.6 Milestone verify

## M6 Timetable
- [x] 6.1 Generate/regenerate with preview dialog + capacity conflict list
- [x] 6.2 Day, week and list views with date nav and filters
- [x] 6.3 Session actions: edit time/duration, complete (ask topic done), missed, lock, delete, actual minutes + note
- [x] 6.4 Reschedule single / bulk with preview; daily totals vs max
- [x] 6.5 Component tests (status pills, confirm dialog, session card)
- [x] 6.6 Milestone verify

## M7 Dashboard and progress
- [x] 7.1 Progress metrics module (pure) + tests
- [x] 7.2 Dashboard: greeting, metric cards, upcoming exams, today's agenda, weekly visual, alerts
- [x] 7.3 Progress screen: per-subject, overall, remaining time, checklist, revision suggestions, activity history, readiness indicator
- [x] 7.4 Milestone verify

## M8 Mock-test builder
- [x] 8.1 Prompt templates v1, v2, v3, final in src/prompts + prompt builder + tests
- [x] 8.2 prompts/ sheets v1..final
- [x] 8.3 Mock-test screen: form, editable textarea, copy/download/reset, clipboard fallback, saved config, score entry + tests
- [x] 8.4 Milestone verify

## M9 Settings, import/export, recovery, demo
- [x] 9.1 Settings screen: profile/preferences, privacy note, reset with strong confirm
- [x] 9.2 Export / import with strict validation + confirmation + tests
- [x] 9.3 Recovery screen for corrupted/old data (backup download, reset, no overwrite)
- [x] 9.4 Demo data (labelled fictional) behind button
- [x] 9.5 Milestone verify

## M10 E2E, a11y, responsive
- [x] 10.1 E2E flows: setup, generate, complete, missed, reschedule, bulk, lock+regen, exam-before-start, empty forms
- [x] 10.2 E2E: mock prompt, clipboard fallback, export/import, corrupted data, reload persistence
- [x] 10.3 axe checks on all main screens; 360px overflow tests at 360/390/768/1024/1440
- [x] 10.4 Milestone verify

## M11 Docs, deploy, packaging
- [x] 11.1 README (features, commands, formula, architecture, limits, deploy, credits)
- [x] 11.2 docs/ARCHITECTURE.md (mermaid), DECISIONS.md, HANDOVER.md, TEST_RESULTS.md
- [x] 11.3 vercel.json, netlify.toml, GitHub Pages workflow
- [x] 11.4 scripts/package.mjs -> studysync.zip
- [x] 11.5 Milestone verify

## M12 Final verification
- [x] 12.1 Clean npm ci + npm run verify, preview check, TEST_RESULTS update, package, commit, .loop/DONE
