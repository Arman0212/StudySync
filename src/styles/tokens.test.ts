import { describe, it, expect } from 'vitest';
import { colors, contrastPairs, contrastRatio, darkColors, graphicPairs, tokenCss } from './tokens';
import { SUBJECT_COLORS } from '../domain/types';

describe('design tokens', () => {
  it.each(contrastPairs)('light: %s on %s meets WCAG AA (4.5:1)', (fg, bg) => {
    expect(contrastRatio(colors[fg], colors[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(contrastPairs)('dark: %s on %s meets WCAG AA (4.5:1)', (fg, bg) => {
    expect(contrastRatio(darkColors[fg], darkColors[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(graphicPairs)('%s against %s meets the 3:1 non-text minimum in both themes', (fg, bg) => {
    expect(contrastRatio(colors[fg], colors[bg])).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(darkColors[fg], darkColors[bg])).toBeGreaterThanOrEqual(3);
  });

  it('dark theme defines every light token', () => {
    expect(Object.keys(darkColors).sort()).toEqual(Object.keys(colors).sort());
  });

  it.each(SUBJECT_COLORS.map((c) => [c.name, c.value]))('subject colour %s works with white text and as a graphic on white', (_n, value) => {
    expect(contrastRatio('#ffffff', value)).toBeGreaterThanOrEqual(4.5);
  });

  it('exports CSS custom properties for both themes', () => {
    const css = tokenCss();
    expect(css).toContain('--color-primary: #1f5f3f;');
    expect(css).toContain('--space-1: 8px;');
    expect(css).toContain('prefers-color-scheme: dark');
    expect(css).toContain(`:root[data-theme="dark"]{--color-primary: ${darkColors.primary};`);
  });
});
