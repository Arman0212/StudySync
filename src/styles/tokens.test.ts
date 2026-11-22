import { describe, it, expect } from 'vitest';
import { colors, contrastPairs, contrastRatio, tokenCss } from './tokens';
import { SUBJECT_COLORS } from '../domain/types';

describe('design tokens', () => {
  it.each(contrastPairs)('%s on %s meets WCAG AA (4.5:1)', (fg, bg) => {
    expect(contrastRatio(colors[fg], colors[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(SUBJECT_COLORS.map((c) => [c.name, c.value]))('subject colour %s works with white text and as a graphic on white', (_n, value) => {
    expect(contrastRatio('#ffffff', value)).toBeGreaterThanOrEqual(4.5);
  });

  it('exports CSS custom properties', () => {
    expect(tokenCss()).toContain('--color-primary: #1f5f3f;');
    expect(tokenCss()).toContain('--space-1: 8px;');
  });
});
