# StudySync — Autonomous Build Loop

You are running inside an unattended loop. This same prompt is sent to you again and again until the project is finished. There is no human available: never ask questions, never wait for confirmation, never stop to offer options. When something is ambiguous, choose the most reasonable option, write the decision and its reason to `docs/DECISIONS.md`, and keep going.

Do not edit `PROMPT.md`, `loop.sh` or `loop.ps1`.

---

## 1. What you are building

StudySync is a web app that helps university students turn a messy exam season into a realistic, day-by-day study plan.

A student tells the app what they are studying (subjects, the exam date for each, and the topics in each subject with how hard, how important and how long each one is), and when they can study (which days, what hours, how many hours a day at most, how long they like a session to be, what breaks they want, and fixed commitments such as lectures, labs, commute or tuition, either one-off or repeating weekly).

From that, the app builds a timetable of study sessions. The student follows it day to day, marks sessions done or missed, and the plan adapts: missed work moves to a future free slot before the exam. The student sees honest progress per subject and overall. When they want to practise, the app writes a high-quality mock-test prompt they can paste into ChatGPT or Claude, and they can paste their score back in.

The tone is calm, supportive and practical, like a good study companion rather than a corporate project tool. It must never promise grades or call a student "exam ready". It shows transparent progress and suggestions only.

### Product boundaries (non-negotiable)

- The app works fully offline in the browser with no account, no login and no API key.
- All date, time and slot calculations are done by deterministic code that you write and test. No LLM is ever used to compute a schedule.
- The app never calls an AI model and never displays questions as if it generated them. The mock-test feature only builds a prompt for the student to copy elsewhere, and the UI says so plainly.
- Demo data exists only behind an explicit "Load demo data" button and is clearly labelled as fictional. A real user's data is never silently filled in.
- Nothing is fabricated: no fake test results, no fake deployment URLs, no fake AI outputs, no fake team contributions.

---

## 2. Features the finished app must have

### Onboarding and setup
- A short welcome on first visit. From there the student can create a profile or load demo data.
- Profile: optional display name, optional institution or course, timezone (defaults to the browser's), and the date the plan starts.
- Availability: which weekdays they study, a daily start and end time, a daily maximum of focused study time, preferred session length (sensible default around 50 minutes, allowed range roughly 25 to 120), a short break between sessions, and a longer break after every few sessions.
- Commitments: labelled blocked time ranges, either a single date or repeating on chosen weekdays.
- Subjects: name, exam date, optional exam start time, normal or high priority, and a colour picked from a small accessible palette.
- Topics within a subject: title, optional notes, difficulty (easy, moderate, hard), importance (low, medium, high), estimated study time, status (not started, in progress, completed), and an optional self-rated confidence from 1 to 5.
- Helpful inline validation: required titles, positive durations, end times after start times, and an explicit warning plus confirmation when an exam date is before the plan start.

### Timetable generation
- Generates sessions from the plan start up to each subject's exam.
- Long topics are split into sessions no longer than the preferred length. Every session stays linked to its topic.
- Earlier exams get priority. Within a subject, harder and more important topics come earlier, but every topic still gets time.
- The priority calculation is transparent and simple. Document the exact formula in the code and the README, and say clearly that it is a heuristic, not a validated model.
- Never schedules on non-study days, outside the study window, over a commitment, over another session, or beyond the daily maximum. Breaks are respected.
- Never schedules preparation for an exam after that exam has started.
- When the work does not fit, the leftover work is never hidden. It appears in a clearly visible "capacity conflict" list showing the topic, how much time it needs, how much time is actually available before its exam, and practical suggestions (study more hours, lower estimates, drop optional topics, start earlier).
- A greedy approach must not let a later exam's work take slots that an earlier exam needed when a valid arrangement exists. Handle this and test it.
- Regenerating the plan keeps completed sessions, locked sessions and in-progress sessions exactly as they are. Before replacing anything, it shows a preview of what will be added, moved and removed, and only applies the change after confirmation.

### Timetable view
- Day view and week view, plus a compact list view for accessibility and small screens.
- Navigation by date, and filters by subject, status and date range.
- Each session shows its time, subject colour, topic, duration and status, with actions to edit the time or duration, mark it complete, mark it missed, lock or unlock it, and delete it (with confirmation).
- Each day shows its planned total against the daily maximum.

### Progress and adaptation
- Session states: planned, in progress, completed, missed, rescheduled. Topic states: not started, in progress, completed.
- Completing one session does not automatically complete a multi-session topic. The app asks whether the topic is now done.
- The student can record actual minutes spent and a short note for a session. Estimated and actual time are tracked separately.
- A missed session is never counted as done.
- Rescheduling moves a missed session to the next valid free slot before its exam. It keeps the same session identity, records where it came from, how many times it has moved and why, and never duplicates it. If there is no valid slot before the exam, the app shows a conflict with choices rather than pushing work past the exam.
- The student can reschedule one session, or all missed sessions at once. The bulk version shows a preview and needs confirmation.
- Progress tracker: per-subject and overall completion based on real records, estimated time remaining per subject, a topic checklist, low-confidence topics suggested for revision, and an activity history of completions, edits and reschedules.
- An optional readiness indicator may combine completion, confidence and pasted mock-test scores, but only from inputs that actually exist. It is labelled as an indicator, never a prediction.

### Dashboard
- A greeting using the student's name, with a neutral fallback.
- Metric cards for subjects, topics completed out of total, overall completion percentage, and planned study hours this week.
- Upcoming exams ordered by date with day countdowns. Exams that are today or already past are clearly flagged.
- Today's agenda ordered by time, with quick complete and missed actions.
- A simple weekly progress visual derived only from saved data.
- Capacity and deadline alerts.

### Mock-test prompt builder
- Inputs: subject (required), the topics to cover (sensible default, user can change), number of questions (common presets plus custom), difficulty (easy, moderate, hard, mixed), question types (multiple choice, short answer, long answer, numerical, case-based; several allowed), and optional total marks, time limit, marking scheme and exam-style instructions.
- Write your own prompt template. It should make the external model act as a fair examiner, cover the chosen topics proportionately, avoid duplicate questions, give marks per question, hide answers at first, wait for the student's answers, then grade with a clear rubric, explain mistakes, name weak topics and suggest a focused revision plan, and never invent syllabus details it was not given.
- Keep prompt templates in their own versioned files, separate from UI code. Develop at least v1, v2, v3 and a final version, each improving on a specific weakness you identified, and record what changed and why. You cannot run these against ChatGPT or Claude from inside this loop, so mark each prompt sheet's "observed results" as *not yet run — to be filled in by the team after real use*. Never invent observed outputs.
- The generated prompt appears in an editable text area with Copy, Download as .txt and Reset. Copying shows a confirmation. If the Clipboard API is unavailable, the text is selected and manual-copy instructions are shown.
- The configuration (not necessarily the full prompt) is saved so it can be reused.
- After a test, the student can optionally enter a score for that subject and its topics.

### Settings and data
- Edit profile and preferences.
- Export everything as a JSON file. Import validates the file strictly, rejects bad files with a clear message, and asks before replacing current data.
- Reset all data, with a strong confirmation.
- A short privacy note: data stays in this browser.
- Data is saved automatically after every meaningful change, with a subtle "Saved" indicator and the time. Refreshing or switching screens never loses data.
- Stored data carries a schema version. Old or corrupted saved data is handled safely: keep a raw backup, offer to download it, explain the problem, allow a reset, and never silently overwrite it.

---

## 3. Design direction

- Fresh, light and spacious, with a botanical green identity: a deep forest green for primary actions, soft mint surfaces, sage accents, an off-white page background and white cards. Choose your own exact colours, define them as design tokens, and check that text meets WCAG AA contrast. Avoid neon green, heavy gradients, heavy shadows and childish illustrations.
- Clean sans-serif type (Inter or the system stack), a clear heading hierarchy, an 8 px spacing rhythm, softly rounded cards and inputs, thin borders and very subtle shadows.
- Primary, secondary and ghost button styles. Destructive actions look clearly different.
- Status is never shown by colour alone: always text, or an icon plus text.
- A simple logo: the "StudySync" wordmark plus a small rounded green square icon with a white S or leaf/check mark, crisp at 32 px.
- Navigation: a left sidebar on desktop, and a compact top bar with bottom or collapsible navigation on phones. The active screen is obvious, and every screen is reachable without a page reload.
- Every list has a helpful empty state that names the next action. Forms show inline validation. Successes and errors show toasts. Destructive actions need confirmation.
- Fully keyboard usable with visible focus rings, semantic landmarks and headings, a visible label on every input, and charts and progress bars with text alternatives and numeric values.
- Works without horizontal page scrolling at 360, 390, 768, 1024 and 1440 px widths.

---

## 4. Engineering requirements

- Stack: React with TypeScript (strict) built with Vite. Keep dependencies minimal and justify each one in `docs/DECISIONS.md`. You design the folder structure, data model, state management and module boundaries yourself.
- Hard architectural rules:
  - The scheduling and rescheduling logic lives in pure, framework-free modules with no React, DOM or storage imports. They are fed the current time as an input and never read the clock themselves, so tests are deterministic.
  - UI components contain no scheduling algorithms.
  - Persistence goes through one storage module. Components never touch browser storage directly.
  - Prompt templates live in their own versioned files.
- Dates and times: be careful with timezones. Date-only values must never shift by a day because of UTC parsing. Use the student's local time consistently and write tests that would catch an off-by-one-day bug for a user in a timezone such as Asia/Kolkata.
- Prevent double submissions and duplicate sessions.
- Never put API keys or secrets in the code or repository.
- Write comments wherever the scheduling logic is not obvious.

---

## 5. Testing — everything must actually run

Set up these and keep them green:

1. **Type check** with zero errors under strict mode.
2. **Lint** with zero errors.
3. **Unit tests** (Vitest) for the scheduler, rescheduler, priority calculation, prompt builder, validation, storage and migrations, and date utilities.
4. **Property-based tests** (e.g. fast-check) that generate many random profiles, commitments, subjects and topics, then assert these invariants for every generated plan: no two sessions overlap; no session overlaps a commitment; no session falls outside a study day or window; no day exceeds its maximum; no session ends after its exam starts; every session belongs to an existing topic; completed and locked sessions are unchanged after regeneration; total scheduled plus total conflicted time equals total remaining required time.
5. **Component tests** (Testing Library) for forms, validation messages, status pills and confirmation dialogs.
6. **End-to-end tests** (Playwright, Chromium is enough) for the real user flows listed below, including a run at a 360 px wide viewport.
7. **Accessibility checks** (axe via Playwright) on every main screen, with no serious or critical violations.
8. **Production build** succeeds and the built app loads.

Create a single command, `npm run verify`, that runs all of the above in order and fails if any step fails.

### Scenarios that must be covered by automated tests
- One subject with two topics and a future exam: sessions appear before the exam and link to the right topics.
- Several subjects with different exam dates: the earlier exam is prioritised.
- A hard, important topic and an easy, minor topic with the same exam: the hard one is scheduled earlier where possible.
- A very low daily maximum: the cap is never exceeded and the leftover work appears as a conflict.
- A weekly commitment overlapping the study window: no session overlaps it.
- No study days before an exam: a clear conflict and no session after the exam.
- An earlier exam that would be starved by a greedy placement of a later exam's work: it still gets its time.
- Two exams on the same day.
- A single topic longer than all available capacity.
- A commitment that covers an entire study window.
- Marking a topic complete updates every metric immediately and survives a reload.
- Marking a session missed: it is not counted as complete.
- Rescheduling a missed session: a new valid slot before the exam, with no overlap or duplicate and the same identity.
- Bulk rescheduling: a preview appears and nothing changes until confirmation.
- A locked session survives regeneration unchanged.
- An exam before the plan start: a warning and confirmation, with no silently invalid plan.
- Empty subject or topic forms: helpful messages and no broken state.
- A mock-test prompt with selected topics and mixed difficulty contains every chosen setting and instruction.
- Clipboard unavailable: the manual-copy fallback appears.
- Export then import restores identical data. Malformed and wrong-schema JSON are rejected safely.
- Corrupted saved data: the recovery screen appears and nothing is overwritten.
- A full reload after edits: profile, subjects, sessions and progress are all intact.
- The 360 px viewport: navigation, forms and timetable are usable with no horizontal page overflow.

Record what you actually ran in `docs/TEST_RESULTS.md`: the command, the date, pass and fail counts copied from real output, and any known gaps. Never write a result you did not observe.

---

## 6. Deliverables

- The complete runnable project in the current folder, under git, with a sensible `.gitignore`.
- `README.md`: what StudySync is, a feature list, prerequisites, exact install, run, test and build commands, the priority formula, the architecture overview, known limitations, and deployment steps for Vercel, Netlify and GitHub Pages.
- `docs/ARCHITECTURE.md` with Mermaid diagrams of the module architecture and the screen flow, matching the code that was actually built.
- `docs/DECISIONS.md`, `docs/TEST_RESULTS.md`, and `docs/HANDOVER.md` (what works, what remains, how to run locally and how to deploy).
- `prompts/` containing the mock-test prompt sheets v1, v2, v3 and final: the template, its purpose, the variables, what changed from the previous version and why, and an observed-results section left honestly empty.
- Deployment config ready to use (for example `vercel.json`, `netlify.toml`, or a GitHub Pages workflow). Do not deploy and do not claim a public URL. Deploying needs the team's own accounts.
- An `npm run package` script that creates `studysync.zip` of the full source, excluding `node_modules`, build output and `.loop/`. Run it at the end.
- The README credits the project as built for SCSE4041 Prompt Engineering by team Doppelgängers (PE-B25-53): Ananya Mishra (lead), Aarushi Chakraborty, Arman Sahni, Krati Khanna and Gauri Mahajan. Do not invent who did what.

---

## 7. How each loop iteration works

1. **Orient.** Read `.loop/PROGRESS.md`, `.loop/NOTES.md` and `docs/DECISIONS.md` if they exist, then run `git log --oneline -15` and `git status`. If `.loop/PROGRESS.md` does not exist, this is the first iteration: initialise git, scaffold the project, and create `PROGRESS.md` as a checklist of small, concrete tasks covering everything in sections 2 to 6, grouped into milestones in this order:
   1. Scaffold, tooling, `npm run verify` skeleton, design tokens and app shell.
   2. Domain types, date utilities and the storage layer with versioning.
   3. The scheduling engine with unit and property-based tests. Finish this before building screens that depend on it.
   4. The rescheduler and plan-diff preview, with tests.
   5. Setup screens and validation.
   6. Timetable screens.
   7. Dashboard and progress tracker.
   8. Mock-test builder and prompt versions.
   9. Settings, import and export, recovery, and demo data.
   10. End-to-end, accessibility and responsive tests and fixes.
   11. Documentation, deployment config and packaging.
   12. Final verification.
2. **Pick work.** Choose the first unchecked task, or a small group of closely related ones. Prefer finishing over starting.
3. **Build it** properly, with tests written alongside the code.
4. **Verify.** Run the relevant checks: at least type check, lint and the affected tests. Run the full `npm run verify` at the end of every milestone. If something fails, fix it now, and do not move on with red checks.
5. **Record.** Tick the task in `PROGRESS.md` only when its checks pass. Add short learnings to `.loop/NOTES.md` (gotchas, commands, why something failed). Make a git commit with a clear message.
6. **Continue** with the next task while you have room in this session. Leave the repository committed and green before your session ends. The next iteration starts fresh from these files.

### When stuck
If the same task has failed in three separate attempts (track the attempts in `NOTES.md`), write it to `docs/BLOCKERS.md` with what you tried. Choose a simpler approach that still meets the requirement, or, if the requirement truly cannot be met, implement the closest honest alternative and document it. Then move on. Never weaken or delete a test just to make it pass, unless the test itself is wrong, and explain the change in `DECISIONS.md`.

If a tool needs network access that is unavailable (for example, installing Playwright browsers), retry once. Then record the problem in `BLOCKERS.md`, keep every other check working, and make `npm run verify` report the skipped step clearly rather than pretending it passed.

### Finishing
When every task in `PROGRESS.md` is ticked:
1. Delete `node_modules`, then run a clean `npm ci` and `npm run verify`.
2. Start the production preview and confirm it serves the app.
3. Update `docs/TEST_RESULTS.md` from that real run.
4. Run `npm run package`.
5. Commit.

Only if all of that succeeds, create the file `.loop/DONE` containing a one-paragraph summary. If anything failed, do not create it. Fix the problem in the next iteration instead.

If `.loop/DONE` already exists when you start, run `npm run verify` once. If it is still green, stop immediately. If it is not, delete `.loop/DONE` and fix the problem.
