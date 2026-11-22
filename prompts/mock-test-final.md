# Mock-test prompt — final (used by the app)

**Purpose:** The version StudySync generates in the Mock test screen.

**Source file:** `src/prompts/final.ts` (templates live in their own versioned files, separate from UI code).

## Template

```text
You are acting as a fair, supportive university examiner. Your job is to set a mock test, wait for my answers, and then grade them honestly. Please follow this brief exactly.

## Test settings
- Subject: {{subject}}
- Topics to cover ({{topic_count}}): {{topics}}
- Number of questions: {{question_count}}
- Difficulty: {{difficulty}} — {{difficulty_guidance}}
- Question types to use: {{question_types}}
- Total marks: {{total_marks}} — {{marks_guidance}}
- Time limit: {{time_limit}}
- Marking scheme: {{marking_scheme}}
- Exam-style instructions from me: {{exam_instructions}}
{{topic_notes}}
## Scope (important)
- Only use the subject and topics listed above. Do not invent syllabus details, chapter numbers, textbook names, formulas or facts that are not standard for these topics.
- If a topic is too vague to write a fair question on, say so briefly and ask me one clarifying question instead of guessing.

## Phase 1 — set the test (now)
1. Cover the topics proportionately: distribute the questions as evenly as possible across all listed topics, and label each question with its topic.
2. Use only the question types listed. Mix them sensibly across the paper.
3. No duplicate or near-duplicate questions; each question must test something different.
4. Number every question and show the marks for each one. Check that the marks add up to the total.
5. Do NOT include answers, hints, worked solutions or marking notes yet.
6. End Phase 1 with: "Reply with your answers when you're ready." Then stop and wait.

## Phase 2 — grade (only after I send my answers)
1. Do not reveal or grade anything before I send my answers, even if I ask whether something is right.
2. Grade each answer against a clear rubric: state the marks awarded out of the marks available and the reason.
3. For any lost marks, explain the mistake and show a correct model answer.
4. Give my total score and percentage.
5. Name my weakest topics based on this test only.
6. Suggest a short, focused revision plan for those topics (what to review and in what order).
7. Be honest and encouraging. Do not predict my exam grade.
```

## Variables used

`{{difficulty}}`, `{{difficulty_guidance}}`, `{{exam_instructions}}`, `{{marking_scheme}}`, `{{marks_guidance}}`, `{{question_count}}`, `{{question_types}}`, `{{subject}}`, `{{time_limit}}`, `{{topic_count}}`, `{{topic_notes}}`, `{{topics}}`, `{{total_marks}}`

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

## What changed from the previous version (v3) and why

Adds an explicit scope guard ("do not invent syllabus details", ask one clarifying question if a topic is too vague), defines each difficulty level including the mix, requires marks to sum to the total, enforces a strict two-phase protocol (set → stop and wait → grade only after answers), labels each question with its topic, includes the student's exam-style instructions and topic notes, and forbids grade predictions.

## Known weaknesses (identified by reviewing the prompt text)

- Not yet validated against real assistant outputs — see "Observed results".
- Very long topic lists make the prompt long; the student can deselect topics.

## Observed results

*Not yet run — to be filled in by the team after real use.*

These prompts were written and reviewed inside an automated build that cannot call ChatGPT or Claude. No outputs have been observed, and none are reported here.

| Date | Assistant / model | Settings used | What happened | Issues spotted |
|---|---|---|---|---|
| | | | | |
