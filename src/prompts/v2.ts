import type { PromptTemplate } from './types';

/**
 * v2 — fixes v1's biggest weakness: answers were shown immediately, so the student
 * could not attempt the test. Adds an examiner role, marks per question and a
 * "wait for my answers" step.
 */
export const v2: PromptTemplate = {
  version: 'v2',
  changes: 'Hide answers until the student replies; act as an examiner; marks per question.',
  template: `You are an examiner setting a mock test for a university student.

Subject: {{subject}}
Topics: {{topics}}
Number of questions: {{question_count}}
Difficulty: {{difficulty}}
Question types: {{question_types}}
Total marks: {{total_marks}}
Time limit: {{time_limit}}

Show the marks for each question. Do NOT show answers yet.
Wait for me to send my answers, then mark them and explain any mistakes.`,
};
