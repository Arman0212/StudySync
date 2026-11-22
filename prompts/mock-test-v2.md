# Mock-test prompt — v2

**Purpose:** Turn the request into a real test: examiner role, marks, and a wait-for-answers step.

**Source file:** `src/prompts/v2.ts` (templates live in their own versioned files, separate from UI code).

## Template

```text
You are an examiner setting a mock test for a university student.

Subject: {{subject}}
Topics: {{topics}}
Number of questions: {{question_count}}
Difficulty: {{difficulty}}
Question types: {{question_types}}
Total marks: {{total_marks}}
Time limit: {{time_limit}}

Show the marks for each question. Do NOT show answers yet.
Wait for me to send my answers, then mark them and explain any mistakes.
```

## Variables used

`{{difficulty}}`, `{{question_count}}`, `{{question_types}}`, `{{subject}}`, `{{time_limit}}`, `{{topics}}`, `{{total_marks}}`

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

## What changed from the previous version (v1) and why

v1 revealed answers straight away, which defeats the purpose of a mock test. v2 hides answers, adds marks per question, total marks and time limit, and asks the assistant to wait and then mark.

## Known weaknesses (identified by reviewing the prompt text)

- Questions may still cluster on one or two topics and sometimes repeat.
- Feedback after marking is vague (no rubric, no weak-topic analysis, no revision plan).
- Marking scheme and student instructions are not passed through.

## Observed results

*Not yet run — to be filled in by the team after real use.*

These prompts were written and reviewed inside an automated build that cannot call ChatGPT or Claude. No outputs have been observed, and none are reported here.

| Date | Assistant / model | Settings used | What happened | Issues spotted |
|---|---|---|---|---|
| | | | | |
