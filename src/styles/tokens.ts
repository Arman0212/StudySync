/**
 * Design tokens — single source of truth (one white light theme, indigo accent). Applied as CSS custom properties at start-up
 * (see applyTokens) and checked for WCAG AA contrast in tokens.test.ts.
 */
export const colors = {
  // Single accent: indigo.
  accent: '#4F46E5',
  accentHover: '#4338CA',
  accentActive: '#3730A3',
  onAccent: '#FFFFFF',
  accentSoft: '#EEF2FF', // active nav pill, selected choices
  accentSoftStrong: '#E0E7FF',
  accentText: '#4338CA', // accent text on the soft tint
  // Neutrals.
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F9FAFB', // sidebar, table headers, toolbars, input hover
  fill: '#F3F4F6', // subtle fills (hover, icon tiles, tracks)
  border: '#E5E7EB',
  divider: '#F1F2F4',
  borderControl: '#8C929C', // form-control outlines (3:1 against white, WCAG 1.4.11)
  text: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF', // decorative only (icons, placeholders) — never body text
  neutralText: '#374151', // text on #F3F4F6 fills
  focus: '#4F46E5',
  track: '#E5E7EB', // empty part of bars and rings
  // Status: the spec hue for icons, fills and borders; a deeper shade of it for text.
  success: '#16A34A',
  successText: '#15803D',
  successSurface: '#F0FDF4',
  warning: '#D97706',
  warningText: '#B45309',
  warningSurface: '#FFFBEB',
  danger: '#DC2626',
  dangerHover: '#B91C1C',
  dangerText: '#B91C1C',
  onDanger: '#FFFFFF',
  dangerSurface: '#FEF2F2',
  info: '#2563EB',
  infoText: '#2563EB',
  infoSurface: '#EFF6FF',
  inverse: '#111827', // toasts, logo mark
  onInverse: '#FFFFFF',
  heat1: '#E0E7FF',
  heat2: '#A5B4FC',
  heat3: '#6366F1',
  heat4: '#3730A3',
} as const;

export type ColorToken = keyof typeof colors;

export const space = { 1: '8px', 2: '16px', 3: '24px', 4: '32px', 5: '40px', 6: '48px', half: '4px' } as const;
export const radius = { sm: '6px', md: '8px', lg: '12px', pill: '999px' } as const;
export const shadow = {
  card: '0 1px 2px rgba(0, 0, 0, 0.04)',
  hover: '0 1px 2px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.06)',
  raised: '0 4px 6px -2px rgba(0, 0, 0, 0.05), 0 16px 32px -8px rgba(0, 0, 0, 0.14)',
} as const;
export const font = {
  family: "'Inter Variable', Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
} as const;

/** Text/background pairs that must meet WCAG AA (4.5:1 for normal text). */
export const contrastPairs: [ColorToken, ColorToken][] = [
  ['text', 'bg'],
  ['text', 'surfaceAlt'],
  ['text', 'fill'],
  ['textSecondary', 'surface'],
  ['textSecondary', 'surfaceAlt'],
  ['neutralText', 'fill'],
  ['onAccent', 'accent'],
  ['onAccent', 'accentHover'],
  ['onAccent', 'accentActive'],
  ['accent', 'surface'],
  ['accent', 'surfaceAlt'],
  ['accent', 'fill'],
  ['accentText', 'accentSoft'],
  ['accent', 'accentSoft'],
  ['onDanger', 'danger'],
  ['onDanger', 'dangerHover'],
  ['danger', 'surface'],
  ['dangerText', 'dangerSurface'],
  ['warningText', 'warningSurface'],
  ['successText', 'successSurface'],
  ['infoText', 'infoSurface'],
  ['onInverse', 'inverse'],
];

/** Non-text graphics (rings, bars, focus outlines, control borders) need 3:1. */
export const graphicPairs: [ColorToken, ColorToken][] = [
  ['accent', 'track'],
  ['focus', 'surface'],
  ['focus', 'surfaceAlt'],
  ['borderControl', 'surface'],
  ['success', 'surface'],
  ['warning', 'surface'],
  ['danger', 'surface'],
];

function toKebab(s: string): string {
  return s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

/** The app has a single light theme; tokens are emitted once on :root. */
export function tokenCss(): string {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(colors)) lines.push(`--color-${toKebab(k)}: ${v};`);
  for (const [k, v] of Object.entries(shadow)) lines.push(`--shadow-${k}: ${v};`);
  for (const [k, v] of Object.entries(space)) lines.push(`--space-${k}: ${v};`);
  for (const [k, v] of Object.entries(radius)) lines.push(`--radius-${k}: ${v};`);
  lines.push(`--font-family: ${font.family};`);
  return `:root{${lines.join('')}color-scheme: light;}`;
}

export function applyTokens(doc: Document): void {
  const style = doc.createElement('style');
  style.id = 'studysync-tokens';
  style.textContent = tokenCss();
  doc.head.prepend(style);
}

/** WCAG relative luminance contrast ratio. */
export function contrastRatio(a: string, b: string): number {
  const lum = (hex: string) => {
    const n = hex.replace('#', '');
    const rgb = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * rgb[0]! + 0.7152 * rgb[1]! + 0.0722 * rgb[2]!;
  };
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
}
