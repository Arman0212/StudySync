# StudySync

StudySync helps university students turn a messy exam season into a realistic, day-by-day study plan. You enter your subjects, exam dates and topics (with difficulty, importance and estimated time) and say when you can study. StudySync builds a timetable around your hours, breaks and commitments. As you mark sessions done or missed, the plan adapts.

It works fully offline in the browser. There is no account, no login and no API key, and your data stays in this browser. StudySync never calls an AI model, never predicts grades and never calls you "exam ready". It shows transparent progress and suggestions only.

Built for **SCSE4041 Prompt Engineering** by team **Doppelgängers (PE-B25-53)**: Ananya Mishra (lead), Aarushi Chakraborty, Arman Sahni, Krati Khanna and Gauri Mahajan.

## Features

- **Onboarding:** a welcome screen with "Create my plan" or "Load demo data". The demo data is fictional and labelled as such everywhere.
- **Setup:**
  - Profile: name, institution, timezone and plan start date.
  - Availability: study days, daily hours, daily maximum, session length (25–120 min), short and long breaks.
  - Commitments: one-off or weekly.
  - Subjects: exam date and optional time, priority and an accessible colour.
  - Topics: difficulty, importance, estimate, status and confidence 1–5.
  - Inline validation, plus a warning and confirmation when an exam is before the plan start.
- **Timetable generation:** deterministic and tested.
  - Earliest exam first. Harder and more important topics come earlier within a subject, but every topic gets time.
  - Never places a session on non-study days, outside your hours, over commitments or other sessions, or beyond the daily maximum. Breaks are respected.
  - Nothing is scheduled after an exam starts.
  - Work that doesn't fit is shown in a **capacity conflict** list, with the time it needs, the time available and suggestions.
- **Regeneration with preview:** you see what will be added, moved and removed before confirming. Completed, locked and in-progress sessions are never touched.
- **Timetable views:**
  - Day, week and list views, with date navigation and filters by subject, status and date range.
  - Each day shows its planned total against your daily maximum.
  - Session actions: complete (records actual minutes and a note, and asks whether the topic is done), start, mark missed, edit time and duration (validated), lock or unlock, and delete (with confirmation).
- **Rescheduling:** a missed session moves to the next free slot before its exam. It keeps the same session and records where it came from, why it moved and how many times. If nothing fits before the exam, you get choices instead: shorten it, keep it as missed, or delete it. "Reschedule all missed" shows a preview and needs confirmation.
- **Dashboard:**
  - Greeting and metric cards: subjects, topics completed, overall completion and hours planned this week.
  - Upcoming exams with countdowns (today and past exams are flagged).
  - Today's agenda with quick complete and missed buttons.
  - A weekly progress chart with a text table, plus alerts.
- **Progress:**
  - Per-subject and overall completion from real records, with estimated time remaining.
  - A topic checklist and low-confidence topics suggested for revision.
  - An activity history.
  - An optional **readiness indicator**, labelled as an indicator and not a prediction.
- **Mock-test prompt builder:**
  - Settings: subject, topics, number of questions (presets or custom), difficulty (including mixed), question types, marks, time limit, marking scheme and exam instructions.
  - The prompt appears in an editable text box with Copy (with a manual-copy fallback), Download .txt and Reset.
  - The configuration is saved. You can record your score afterwards.
  - Templates are versioned (v1 → v2 → v3 → final). See [`prompts/`](prompts/).
- **Settings and data:**
  - Edit your profile and preferences.
  - Export to JSON, and import with strict validation and a confirmation step.
  - Reset all data (you must type RESET).
  - A privacy note.
  - Autosave with a "Saved HH:MM" indicator.
  - Stored data carries a schema version and old versions are migrated. If saved data is damaged, a recovery screen keeps a raw backup, offers it as a download and never overwrites it silently.
- **Accessibility:** keyboard-friendly, with visible focus, a skip link, landmarks, labels on every input, and status shown as icon plus text. Checked with axe. Contrast is tested against WCAG AA.
- **Responsive layout:** a sidebar on desktop, and a top bar plus bottom navigation on phones. Tested with no horizontal scrolling at 360, 390, 768, 1024 and 1440 px wide.

## Prerequisites

- Node.js 22 or newer (Vite 8 needs at least 20.19 or 22.12; developed on Node 24.14) and npm 10 or newer.
- To run the end-to-end tests: Playwright's Chromium. `npm run verify` installs it automatically with `npx playwright install chromium`, which needs a network connection the first time.
- To run `npm run package`: `git` and the `zip` command.

## Commands

```bash
npm ci                 # install exact dependencies
npm run dev            # start the dev server (http://localhost:5173)
npm run build          # type-check and build to dist/
npm run preview        # serve the production build (http://localhost:4173)

npm run typecheck      # TypeScript strict, zero errors
npm run lint           # ESLint, zero warnings
npm test               # Vitest: unit, property-based and component tests
npm run e2e            # Playwright: end-to-end, axe accessibility and responsive tests
npm run verify         # all of the above in order (typecheck → lint → vitest → build → playwright); fails on the first failure
npm run package        # create studysync.zip of the source (no node_modules, dist or .loop)
```

## Priority formula (a heuristic, not a validated model)

Within a subject, topics are ordered by:

```
priority = 3 × importance + 2 × difficulty + confidenceGap

importance:    low = 1, medium = 2, high = 3
difficulty:    easy = 1, moderate = 2, hard = 3
confidenceGap: 0 if not rated, otherwise max(0, 3 − confidence)   (1 → +2, 2 → +1, 3–5 → 0)
```

The range is 5 to 17. Across subjects, **the earliest exam always comes first**. A subject's "high priority" flag only breaks ties between exams that start at the same time. This is a simple, transparent heuristic chosen for explainability. It has not been validated as the best way to study. The code is in `src/scheduling/priority.ts`.

## How the scheduler works

1. **Keep fixed sessions.** Completed, in-progress and locked sessions stay where they are. They count towards their topic's time, except missed ones.
2. **Work out what's left.** Remaining work per topic = the estimate minus the time already covered. A completed topic needs no more time.
3. **Earliest exam first (EDF).** Exams are processed from the earliest. Each exam's work goes into the earliest free valid slots before that exam starts. Every slot an earlier exam can use is also usable by a later exam, so filling the earliest deadline first means a later exam can never take a slot an earlier exam needed. Exams that start at the same moment are interleaved.
4. **Order within a subject.** Each topic first gets one session, in priority order. The rest of the work then follows in priority order.
5. **Session lengths.** Sessions are no longer than your preferred length and are split evenly. A session may be shortened to fit a gap, but never below 25 minutes unless that is all that's left of the topic.
6. **Conflicts.** Work that cannot be placed becomes a capacity conflict. Scheduled time plus conflicted time always equals the remaining required time; property-based tests check this.

Without an exam start time, the whole exam day is treated as unavailable for that subject.

## Architecture overview

```
src/
  domain/       pure types, date utilities, validation, progress metrics   (no React / DOM / storage / clock)
  scheduling/   pure scheduler, capacity ledger, rescheduler, plan diff,    (no React / DOM / storage / clock)
                manual-edit checks, invariant checker
  storage/      the ONLY module that touches localStorage; schema validation + migrations
  state/        React context store (pure reducer + autosave), hash router, demo data, glue to scheduling
  prompts/      versioned mock-test prompt templates (v1, v2, v3, final) + builder
  ui/           reusable components (buttons, fields, modal, toasts, status pills, progress bars)
  screens/      Welcome, Dashboard, Setup, Timetable, Progress, Mock test, Settings, Recovery
  styles/       design tokens (single source, contrast-tested) + CSS
e2e/            Playwright end-to-end, axe and responsive tests
prompts/        prompt sheets for each template version
```

ESLint enforces the architecture rules. Code in `domain/` and `scheduling/` cannot import React, storage or UI code, and cannot use `window`, `localStorage`, `Date.now()` or `new Date()` with no arguments. The current time is always passed in. Diagrams are in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), and the reasoning behind choices is in [`docs/DECISIONS.md`](docs/DECISIONS.md).

## Known limitations

- Data lives in one browser's `localStorage`; it is not synced between devices. Use Export and Import to move it.
- The scheduler front-loads work: an earlier exam's work is placed before a later exam's work, so a later subject may not start until the earlier exam's topics are scheduled. This is safe, but it is not always how students like to interleave subjects.
- There are no drag-and-drop edits, and there are no notifications or reminders.
- The mock-test prompts have **not** been tried against real assistants yet; the "Observed results" sections are empty on purpose.
- The readiness indicator is a simple average of the inputs you entered. It is not a validated measure.
- Only Chromium is covered by automated end-to-end tests.

## Deployment

The app is a static build (`dist/`). It uses hash routing and relative asset paths, so it works at any URL with no server rewrites. **It has not been deployed by the build process; you need your own account for each option below.**

### Vercel
1. Push the repository to GitHub, GitLab or Bitbucket.
2. In Vercel, choose "Add New → Project" and import the repository. `vercel.json` already sets the build command (`npm run build`) and the output folder (`dist`).
3. Deploy. Or use the CLI: `npx vercel` and then `npx vercel --prod`.

### Netlify
1. Push the repository, then in Netlify choose "Add new site → Import an existing project". `netlify.toml` sets `npm run build` and the `dist` folder.
2. Or drag the `dist/` folder onto https://app.netlify.com/drop after running `npm run build`.

### GitHub Pages
1. Push to a GitHub repository whose default branch is `main`.
2. Go to Settings → Pages → Build and deployment → Source: **GitHub Actions**.
3. The workflow `.github/workflows/deploy-pages.yml` builds and deploys on every push to `main`. You can also run it by hand from the Actions tab.

## Project documents

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): module and screen-flow diagrams.
- [docs/DECISIONS.md](docs/DECISIONS.md): decisions and dependency justifications.
- [docs/TEST_RESULTS.md](docs/TEST_RESULTS.md): real results from the last verification run.
- [docs/HANDOVER.md](docs/HANDOVER.md): what works, what remains, and how to run and deploy.
- [prompts/](prompts/): the mock-test prompt sheets (v1, v2, v3 and final).
