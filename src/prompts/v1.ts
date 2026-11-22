import type { PromptTemplate } from './types';

/** v1 — first draft: a plain request for questions. */
export const v1: PromptTemplate = {
  version: 'v1',
  changes: 'First draft.',
  template: `Write a {{difficulty}} mock test on {{subject}} with {{question_count}} questions.
Topics: {{topics}}.
Question types: {{question_types}}.
Include the answers.`,
};
