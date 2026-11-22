import type { PromptTemplate } from './types';

/**
 * v3 — fixes v2's weaknesses: questions clustered on one or two topics and sometimes
 * repeated, and feedback was vague. Adds proportional topic coverage, no duplicates,
 * a rubric, weak-topic analysis and a revision plan.
 */
export const v3: PromptTemplate = {
  version: 'v3',
  changes: 'Proportional topic coverage, no duplicate questions, explicit rubric, weak topics and revision plan.',
  template: `You are a fair, encouraging university examiner. Create a mock test for me.

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
Grade each answer using a clear rubric, explain my mistakes, list my weakest topics and suggest a short revision plan.`,
};
