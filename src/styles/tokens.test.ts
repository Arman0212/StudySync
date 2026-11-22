import { describe, it, expect } from 'vitest';
import { colors, contrastPairs, contrastRatio, graphicPairs, tokenCss } from './tokens';
import { SUBJECT_COLORS } from '../domain/types';
import { SUBJECT_OPTIONS, displaySubjectColor } from '../ui/subjectColors';

describe('design tokens', () => {
  it.each(contrastPairs)('%s on %s meets WCAG AA (4.5:1)', (fg, bg) => {
    expect(contrastRatio(colors[fg], colors[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(graphicPairs)('%s against %s meets the 3:1 non-text minimum', (fg, bg) => {
    expect(contrastRatio(colors[fg], colors[bg])).toBeGreaterThanOrEqual(3);
  });

  it.each(SUBJECT_COLORS.map((c) => [c.name, c.value]))('stored subject colour %s works with white text and as a graphic on white', (_n, value) => {
    expect(contrastRatio('#ffffff', value)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(SUBJECT_OPTIONS.map((o) => [o.name, o.color]))('display subject colour %s works with white text and as a graphic on white and grey', (_n, color) => {
    expect(contrastRatio('#ffffff', color)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.surfaceAlt, color)).toBeGreaterThanOrEqual(3);
  });

  it('maps every stored palette colour to a distinct display colour and leaves unknown colours alone', () => {
    const shown = SUBJECT_COLORS.map((c) => displaySubjectColor(c.value));
    expect(new Set(shown).size).toBe(SUBJECT_COLORS.length);
    expect(shown).not.toContain(undefined);
    expect(displaySubjectColor('#123456')).toBe('#123456');
  });

  it('is a single light theme on :root', () => {
    const css = tokenCss();
    expect(css).toContain('--color-accent: #4F46E5;');
    expect(css).toContain('--color-bg: #FFFFFF;');
    expect(css).toContain('--space-1: 8px;');
    expect(css).not.toContain('prefers-color-scheme');
    expect(css).not.toContain('data-theme');
  });
});
