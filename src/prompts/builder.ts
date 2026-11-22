/**
 * Builds the mock-test prompt from a configuration. The app never sends this anywhere;
 * the student copies it into an external assistant themselves.
 */
import type { MockDifficulty, MockTestConfig, QuestionType, Subject, Topic } from '../domain/types';
import type { PromptTemplate } from './types';
import { finalTemplate } from './final';

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  mcq: 'multiple choice',
  short: 'short answer',
  long: 'long answer',
  numerical: 'numerical',
  case: 'case-based',
};

export const QUESTION_PRESETS = [5, 10, 15, 20] as const;

const DIFFICULTY_GUIDANCE: Record<MockDifficulty, string> = {
  easy: 'test recall and basic understanding.',
  moderate: 'test understanding and standard application.',
  hard: 'test deep understanding, multi-step application and analysis.',
  mixed: 'roughly one third easy, one third moderate and one third hard questions; label each question’s difficulty.',
};

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_m, k: string) => vars[k] ?? '');
}

export function defaultMockConfig(subject: Subject, topics: Topic[]): MockTestConfig {
  const mine = topics.filter((t) => t.subjectId === subject.id);
  const open = mine.filter((t) => t.status !== 'completed');
  return {
    subjectId: subject.id,
    topicIds: (open.length > 0 ? open : mine).map((t) => t.id),
    questionCount: 10,
    difficulty: 'mixed',
    questionTypes: ['mcq', 'short'],
    totalMarks: null,
    timeLimitMinutes: null,
    markingScheme: '',
    examInstructions: '',
  };
}

export function buildPrompt(config: MockTestConfig, subject: Subject, topics: Topic[], template: PromptTemplate = finalTemplate): string {
  const chosen = topics.filter((t) => config.topicIds.includes(t.id));
  const noted = chosen.filter((t) => t.notes.trim());
  const vars: Record<string, string> = {
    subject: subject.name,
    topics: chosen.length > 0 ? chosen.map((t) => t.title).join('; ') : '(all topics of this subject)',
    topic_count: String(chosen.length),
    question_count: String(config.questionCount),
    difficulty: config.difficulty,
    difficulty_guidance: DIFFICULTY_GUIDANCE[config.difficulty],
    question_types: config.questionTypes.map((q) => QUESTION_TYPE_LABEL[q]).join(', '),
    total_marks: config.totalMarks ? String(config.totalMarks) : 'your choice',
    marks_guidance: config.totalMarks ? 'the marks for all questions must add up to exactly this total.' : 'choose sensible marks per question and state the total.',
    time_limit: config.timeLimitMinutes ? `${config.timeLimitMinutes} minutes` : 'no fixed limit',
    marking_scheme: config.markingScheme.trim() || 'standard university marking; award partial credit for correct method',
    exam_instructions: config.examInstructions.trim() || 'none',
    topic_notes: noted.length > 0 ? `- My notes on topics: ${noted.map((t) => `${t.title}: ${t.notes.trim()}`).join(' | ')}\n` : '',
  };
  return renderTemplate(template.template, vars);
}
