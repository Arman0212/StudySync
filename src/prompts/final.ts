import type { PromptTemplate } from './types';

/**
 * final — fixes v3's remaining weaknesses observed on review of the prompt text:
 * (a) the model could invent syllabus content or textbook references beyond the topics
 *     given; (b) "difficulty: mixed" was ambiguous; (c) marks did not always add up to
 *     the total; (d) the model sometimes started grading before the student answered or
 *     revealed answers when asked "is this right?"; (e) exam-style instructions from the
 *     student were not included. Adds explicit scope limits, a difficulty definition,
 *     a marks check, a strict two-phase protocol and the student's own instructions.
 */
export const finalTemplate: PromptTemplate = {
  version: 'final',
  changes: 'Scope guard against invented syllabus details, defined difficulty mix, marks must sum to total, strict two-phase protocol, student exam instructions.',
  template: `You are acting as a fair, supportive university examiner. Your job is to set a mock test, wait for my answers, and then grade them honestly. Please follow this brief exactly.

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
7. Be honest and encouraging. Do not predict my exam grade.`,
};
