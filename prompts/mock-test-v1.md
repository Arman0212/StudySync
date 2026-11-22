# Mock-test prompt — v1 (first draft)

**Purpose:** A minimal baseline: ask the assistant for a mock test on the chosen subject and topics.

**Source file:** `src/prompts/v1.ts` (templates live in their own versioned files, separate from UI code).

## Template

```text
Write a {{difficulty}} mock test on {{subject}} with {{question_count}} questions.
Topics: {{topics}}.
Question types: {{question_types}}.
Include the answers.
```

## Variables used

`{{difficulty}}`, `{{question_count}}`, `{{question_types}}`, `{{subject}}`, `{{topics}}`

See the table below for where each value comes from.

| Variable | Source |
|---|---|
| `{{subject}}` | Subject name |
| `{{topics}}` | Selected topic titles, `; `-separated (defaults to the subject's unfinished topics) |
| `{{topic_count}}` | Number of selected topics |
| `{{question_count}}` | Preset (5/10/15/20) or custom 1–100 |
| `{{difficulty}}` | easy / moderate / hard / mixed |
| `{{difficulty_guidance}}` | Fixed description of the chosen difficulty |
| `{{question_types}}` | multiple choice, short answer, long answer, numerical, case-based (one or more) |
| `{{total_marks}}` / `{{marks_guidance}}` | Optional total marks, or "your choice" |
| `{{time_limit}}` | Optional minutes, or "no fixed limit" |
| `{{marking_scheme}}` | Optional; default "standard university marking; award partial credit for correct method" |
| `{{exam_instructions}}` | Optional; default "none" |
| `{{topic_notes}}` | Notes the student wrote on selected topics (line omitted if none) |

## What changed from the previous version (— (first version)) and why

Baseline to compare later versions against.

## Known weaknesses (identified by reviewing the prompt text)

- Shows answers immediately, so the student cannot attempt the test.
- No examiner role, no marks per question, no grading step.
- No guidance on topic coverage; questions may cluster or repeat.
- Nothing stops the assistant inventing syllabus details.

## Observed results

*Not yet run — to be filled in by the team after real use.*

These prompts were written and reviewed inside an automated build that cannot call ChatGPT or Claude. No outputs have been observed, and none are reported here.

| Date | Assistant / model | Settings used | What happened | Issues spotted |
|---|---|---|---|---|
| | | | | |
