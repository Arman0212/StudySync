# Handover

## What works

Everything in the brief has been implemented and covered by automated tests. See [TEST_RESULTS.md](TEST_RESULTS.md) for the last real run.

- Onboarding, profile, availability, commitments, and subjects and topics, with inline validation and a confirmation for an exam before the plan start.
- A deterministic scheduler:
  - Each day mixes subjects by a priority score, checked against an earliest-exam-first baseline so earlier exams are protected. Topics are ordered by priority within each subject.
  - Respects breaks, daily maximums, commitments and exam start times.
  - Lists capacity conflicts with suggestions.
- Regeneration with an added/moved/removed preview that keeps completed, locked and in-progress sessions.
- Day, week and list timetable views with filters. Session actions: complete (with actual minutes, a note and a "topic done?" question), start, missed, edit, lock and delete.
- Single and bulk rescheduling of missed sessions. Session identity and history are kept, and there is a conflict dialog when nothing fits before the exam.
- Dashboard: metric cards, exam countdowns, today's agenda, weekly chart and alerts.
- Progress: completion per subject and overall, a checklist, revision suggestions, activity history and the readiness indicator.
- Mock-test prompt builder with versioned templates. Copy uses the clipboard with a manual fallback, plus download, reset, a saved configuration and score entry.
- Settings: export and import with strict validation, reset (type RESET), a privacy note, autosave with a "Saved" indicator, schema versioning and migration, and a recovery screen for damaged data.
- Demo data is only loaded through the button and is labelled as fictional.
- Accessibility (axe, keyboard use, contrast tests) and responsive layouts from 360 to 1440 px.

## What remains / suggested next steps

- **Real-world prompt testing:** run each prompt version in ChatGPT and Claude and fill in "Observed results" in `prompts/mock-test-*.md`. Nothing has been run yet.
- **Deployment:** choose Vercel, Netlify or GitHub Pages and deploy with the team's own account (steps below). No public URL exists yet.
- Possible product improvements: a user setting to tune how strongly subjects are mixed (for example the urgency window or the consecutive-session limit), drag-and-drop editing, reminders, and cross-browser end-to-end runs (Firefox and WebKit).
- See [BLOCKERS.md](BLOCKERS.md), if present, for anything that could not be done.

## Run locally

```bash
npm ci
npm run dev        # http://localhost:5173/StudySync/
# or the production build:
npm run build && npm run preview   # http://localhost:4173/StudySync/
```

Full checks: `npm run verify`. This needs Playwright's Chromium, which is downloaded automatically the first time.

## Deploy

The build is static (`dist/`), uses hash routing and has relative asset paths.

- **Vercel:** import the repository. `vercel.json` is already configured. Or run `npx vercel --prod`.
- **Netlify:** import the repository (`netlify.toml` is configured), or drag `dist/` onto Netlify Drop.
- **GitHub Pages:** push to `main`, then set Settings → Pages → Source to "GitHub Actions". `.github/workflows/deploy-pages.yml` does the rest.

## Where things are

- Scheduler: `src/scheduling/scheduler.ts`, `capacity.ts` and `priority.ts`.
- Rescheduler and diff: `src/scheduling/rescheduler.ts` and `diff.ts`.
- Storage, schema and migrations: `src/storage/`.
- Prompt templates: `src/prompts/`. Prompt sheets: `prompts/`.
- Design tokens: `src/styles/tokens.ts`.
