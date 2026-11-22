# StudySync architecture

These diagrams describe the code as it was built.

## Module architecture

```mermaid
flowchart TD
  subgraph UI["UI layer (React)"]
    App["App.tsx<br/>router + providers"]
    Screens["screens/<br/>Welcome · Dashboard · Setup · Timetable ·<br/>Progress · MockTest · Settings · Recovery"]
    UIKit["ui/<br/>Button · Field · Modal/ConfirmDialog ·<br/>Toast · StatusPill · ProgressBar · Icon · Logo"]
  end

  subgraph State["state/"]
    Store["store.tsx<br/>AppProvider · dispatch · autosave · now()"]
    Actions["actions.ts<br/>pure reducer"]
    Planning["planning.ts<br/>glue to scheduler"]
    Router["router.ts<br/>hash routing"]
    Demo["demo.ts<br/>fictional demo data"]
  end

  subgraph Pure["Pure, framework-free (lint-enforced)"]
    Domain["domain/<br/>types · dates · validation · progress"]
    Sched["scheduling/<br/>scheduler · capacity (DayLedger) · priority ·<br/>rescheduler · diff · manual · invariants"]
  end

  Prompts["prompts/<br/>v1 · v2 · v3 · final · builder"]
  Storage["storage/<br/>storage.ts (only localStorage access) · schema.ts (validation + migrations)"]
  LS[("browser localStorage")]

  App --> Screens
  Screens --> UIKit
  Screens --> Store
  Screens --> Planning
  Screens --> Prompts
  Screens --> Domain
  Store --> Actions
  Store --> Storage
  Actions --> Sched
  Planning --> Sched
  Demo --> Sched
  Sched --> Domain
  Prompts --> Domain
  Storage --> LS
  Storage --> Domain
```

Rules enforced by ESLint (`eslint.config.js`):

- `src/domain/**` and `src/scheduling/**` may not import React, `storage/`, `state/`, `ui/` or `screens/`.
- They may not use `window`, `document`, `localStorage`, `sessionStorage`, `Date.now()` or `new Date()` with no arguments. "Now" is passed in as a `LocalNow { date, minutes }`.
- Only `src/storage/storage.ts` reads or writes browser storage.

## Data flow for a change

```mermaid
sequenceDiagram
  participant U as Student
  participant S as Screen
  participant St as store.dispatch
  participant R as actions.reduce (pure)
  participant P as storage.saveData
  U->>S: e.g. "Mark complete"
  S->>St: dispatch({type: 'completeSession', ...})
  St->>R: reduce(data, action, {at, id})
  R-->>St: new AppData (+ activity entry)
  St->>P: save envelope {app, schemaVersion, savedAt, data}
  St-->>S: re-render + "Saved HH:MM"
```

Generating a plan works the same way. `planning.computePlan` calls the pure `generatePlan` with the current `LocalNow`. The Timetable screen shows a diff preview made by `diffPlans`, and only `applyPlan` changes the data.

## Screen flow

```mermaid
flowchart LR
  Start((Open app)) --> Load{Saved data?}
  Load -- damaged / unsupported --> Recovery[Recovery<br/>download raw backup · import · reset]
  Load -- none / no profile --> Welcome
  Load -- valid --> Dashboard
  Welcome -- Create my plan --> Profile[Setup · 1 Profile]
  Welcome -- Load demo data (confirm) --> Dashboard
  Profile --> Availability[Setup · 2 Availability] --> Commitments[Setup · 3 Commitments] --> Subjects[Setup · 4 Subjects & topics]
  Subjects --> Timetable
  Timetable -- Generate / Regenerate --> Preview[Plan preview dialog] -- Apply --> Timetable
  Timetable -- Reschedule all missed --> Bulk[Bulk preview dialog] -- Apply --> Timetable
  Timetable -- Complete --> Complete[Complete dialog: actual minutes, note, topic done?]
  Dashboard <--> Timetable
  Dashboard <--> Progress
  Dashboard <--> MockTest[Mock test prompt builder]
  Dashboard <--> Settings[Settings & data<br/>profile · preferences · export/import · reset]
  Recovery -- reset / import --> Welcome
  Settings -- reset (type RESET) --> Welcome
```

Navigation uses a sidebar at 900 px and wider, and a top bar plus bottom navigation below that. Every screen is a hash route (`#/dashboard`, `#/setup/subjects`, `#/timetable`, `#/progress`, `#/mock-test`, `#/settings`), so moving between screens never reloads the page.
