/** A versioned mock-test prompt template. Templates use {{variable}} placeholders. */
export interface PromptTemplate {
  version: 'v1' | 'v2' | 'v3' | 'final';
  /** What this version fixes compared with the previous one. */
  changes: string;
  template: string;
}

export const PROMPT_VARIABLES = [
  'subject', 'topics', 'topic_count', 'question_count', 'difficulty', 'difficulty_guidance', 'question_types',
  'total_marks', 'marks_guidance', 'time_limit', 'marking_scheme', 'exam_instructions', 'topic_notes',
] as const;
