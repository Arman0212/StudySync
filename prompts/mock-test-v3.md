# Mock-test prompt — v3

**Purpose:** Improve coverage and feedback quality.

**Source file:** `src/prompts/v3.ts` (templates live in their own versioned files, separate from UI code).

## Template

```text
You are a fair, encouraging university examiner. Create a mock test for me.

## Test settings
- Subject: {{subject}}
- Topics to cover ({{topic_count}}): {{topics}}
- Number of questions: {{question_count}}
- Difficulty: {{difficulty}}
- Question types: {{question_types}}
- Total marks: {{total_marks}}
- Time limit: {{time_limit}}
- Marking scheme: {{marking_scheme}}

## Rules for the questions
1. Cover the topics proportionately: spread questions evenly across the listed topics.
2. No duplicate or near-duplicate questions.
3. Number every question and show its marks.
4. Do not show answers, hints or solutions yet.

## After I answer
Grade each answer using a clear rubric, explain my mistakes, list my weakest topics and suggest a short revision plan.
```

## Variables used

`{{difficulty}}`, `{{marking_scheme}}`, `{{question_count}}`, `{{question_types}}`, `{{subject}}`, `{{time_limit}}`, `{{topic_count}}`, `{{topics}}`, `{{total_marks}}`

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

## What changed from the previous version (v2) and why

v2 gave uneven topic coverage and generic feedback. v3 requires proportional coverage, no duplicates, numbered questions with marks, a clear rubric, named weak topics and a revision plan; it also passes the marking scheme.

## Known weaknesses (identified by reviewing the prompt text)

- Nothing prevents invented syllabus content, chapter numbers or textbook references.
- "Mixed" difficulty is undefined.
- Marks are not required to add up to the stated total.
- The two phases are not strict: the assistant may reveal answers if the student asks "is this right?".
- Exam-style instructions and topic notes from the student are not included.

## Observed results

*Not yet run — to be filled in by the team after real use.*

These prompts were written and reviewed inside an automated build that cannot call ChatGPT or Claude. No outputs have been observed, and none are reported here.

| Date | Assistant / model | Settings used | What happened | Issues spotted |
|---|---|---|---|---|
| | | | | |
