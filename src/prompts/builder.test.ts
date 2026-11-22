import { describe, it, expect } from 'vitest';
import { buildPrompt, defaultMockConfig, renderTemplate } from './builder';
import { finalTemplate, v1, v2, v3 } from './index';
import { PROMPT_VARIABLES } from './types';
import { subject, topic } from '../test/factories';
import type { MockTestConfig } from '../domain/types';

const s = subject('phy', '2026-02-01', { name: 'Physics' });
const topics = [topic('a', 'phy', 60, { title: 'Kinematics' }), topic('b', 'phy', 60, { title: 'Optics', notes: 'Lens formula only' }), topic('c', 'phy', 60, { title: 'Waves', status: 'completed' })];

describe('prompt builder', () => {
  it('defaults to the open topics of the subject', () => {
    const c = defaultMockConfig(s, topics);
    expect(c.topicIds).toEqual(['a', 'b']);
    expect(c.difficulty).toBe('mixed');
  });

  it('includes every chosen setting and instruction (selected topics + mixed difficulty)', () => {
    const config: MockTestConfig = {
      subjectId: 'phy', topicIds: ['a', 'b'], questionCount: 12, difficulty: 'mixed', questionTypes: ['mcq', 'numerical', 'case'],
      totalMarks: 60, timeLimitMinutes: 90, markingScheme: 'Negative marking for MCQ', examInstructions: 'Answer all questions',
    };
    const p = buildPrompt(config, s, topics);
    for (const expected of [
      'Subject: Physics', 'Kinematics; Optics', 'Topics to cover (2)', 'Number of questions: 12', 'Difficulty: mixed', 'one third easy',
      'multiple choice, numerical, case-based', 'Total marks: 60', 'add up to exactly this total', 'Time limit: 90 minutes',
      'Negative marking for MCQ', 'Answer all questions', 'Optics: Lens formula only',
      'fair', 'proportionately', 'No duplicate', 'marks for each one', 'Do NOT include answers', 'wait', 'rubric',
      'explain the mistake', 'weakest topics', 'revision plan', 'Do not invent syllabus details',
    ]) {
      expect(p).toContain(expected);
    }
    expect(p).not.toContain('Waves');
    expect(p).not.toMatch(/\{\{\w+\}\}/);
  });

  it('uses safe defaults for optional settings', () => {
    const p = buildPrompt({ ...defaultMockConfig(s, topics), questionTypes: ['short'] }, s, topics);
    expect(p).toContain('Total marks: your choice');
    expect(p).toContain('Time limit: no fixed limit');
    expect(p).toContain('Exam-style instructions from me: none');
  });

  it('every template version renders without leftover placeholders', () => {
    for (const t of [v1, v2, v3, finalTemplate]) {
      const out = buildPrompt(defaultMockConfig(s, topics), s, topics, t);
      expect(out).not.toMatch(/\{\{\w+\}\}/);
      for (const m of t.template.matchAll(/\{\{(\w+)\}\}/g)) expect(PROMPT_VARIABLES).toContain(m[1]);
    }
  });

  it('renderTemplate leaves unknown variables empty', () => {
    expect(renderTemplate('a {{x}} b {{y}}', { x: '1' })).toBe('a 1 b ');
  });
});
