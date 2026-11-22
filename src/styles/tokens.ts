/**
 * Design tokens — single source of truth. Applied as CSS custom properties at start-up
 * (see applyTokens) and checked for WCAG AA contrast in tokens.test.ts.
 */
export const colors = {
  primary: '#1f5f3f', // deep forest green — primary actions
  primaryHover: '#174a30',
  primaryActive: '#123b26',
  onPrimary: '#ffffff',
  mint: '#e7f3eb', // soft mint surfaces
  mintStrong: '#d3eadb',
  sage: '#8fae98', // decorative accent (borders, bars) — not used for text
  sageText: '#45644f', // sage tone that is safe for text
  bg: '#f4f7f3', // off-white page background
  surface: '#ffffff',
  surfaceAlt: '#f8faf7', // subtle inset areas (toolbars, calendar gutters)
  text: '#17241c',
  textMuted: '#4b5d52',
  border: '#dde7e0',
  borderStrong: '#7d9585',
  focus: '#1f5f3f',
  track: '#e3ebe5', // empty part of bars and rings
  neutralSurface: '#eef2ef',
  neutralText: '#3d4d43',
  danger: '#b42318',
  dangerHover: '#912018',
  onDanger: '#ffffff',
  dangerSurface: '#fdeceb',
  warningText: '#7a4b00',
  warningSurface: '#fff4dc',
  successText: '#1d6b3c',
  successSurface: '#e3f3e8',
  infoText: '#1f4f86',
  infoSurface: '#e6eef8',
  inverse: '#17241c', // toasts
  onInverse: '#ffffff',
  heroFrom: '#174a30',
  heroTo: '#1f5f3f',
  onHero: '#ffffff',
  onHeroMuted: '#cfe6d8',
  paper: '#fffdf7', // mock-test prompt card
  heat1: '#c7e4d0',
  heat2: '#8cc5a0',
  heat3: '#4b9a6c',
  heat4: '#1f5f3f',
} as const;

export type ColorToken = keyof typeof colors;

/** Dark theme: the same tokens, re-tuned for a deep botanical background. */
export const darkColors: Record<ColorToken, string> = {
  primary: '#6fcf97',
  primaryHover: '#88dbaa',
  primaryActive: '#5bbd84',
  onPrimary: '#0b1d12',
  mint: '#1b2d22',
  mintStrong: '#24402f',
  sage: '#4f7a5d',
  sageText: '#9fc8ab',
  bg: '#0d1410',
  surface: '#141d17',
  surfaceAlt: '#18231c',
  text: '#e5eee8',
  textMuted: '#a5b8ab',
  border: '#24332a',
  borderStrong: '#5f7a68',
  focus: '#8fe0b0',
  track: '#25352b',
  neutralSurface: '#222e27',
  neutralText: '#c4d2c8',
  danger: '#f4908a',
  dangerHover: '#f7a8a3',
  onDanger: '#2a0b08',
  dangerSurface: '#351816',
  warningText: '#f2c46b',
  warningSurface: '#30260f',
  successText: '#8fe0b0',
  successSurface: '#15301f',
  infoText: '#a6c8f2',
  infoSurface: '#172538',
  inverse: '#e5eee8',
  onInverse: '#0d1410',
  heroFrom: '#143525',
  heroTo: '#1c4a33',
  onHero: '#effaf3',
  onHeroMuted: '#b9d8c4',
  paper: '#1a241e',
  heat1: '#1f4a31',
  heat2: '#2d7048',
  heat3: '#4ea672',
  heat4: '#8fe0b0',
};

export const space = { 1: '8px', 2: '16px', 3: '24px', 4: '32px', 5: '40px', 6: '48px', half: '4px' } as const;
export const radius = { sm: '8px', md: '12px', lg: '18px', pill: '999px' } as const;
export const shadow = {
  card: '0 1px 2px rgba(23, 36, 28, 0.04), 0 2px 6px rgba(23, 36, 28, 0.04), 0 8px 24px -12px rgba(23, 36, 28, 0.10)',
  hover: '0 1px 2px rgba(23, 36, 28, 0.05), 0 6px 14px rgba(23, 36, 28, 0.07), 0 16px 32px -16px rgba(23, 36, 28, 0.16)',
  raised: '0 2px 4px rgba(23, 36, 28, 0.06), 0 12px 32px rgba(23, 36, 28, 0.16)',
} as const;
export const darkShadow: Record<keyof typeof shadow, string> = {
  card: '0 1px 2px rgba(0, 0, 0, 0.35), 0 8px 24px -12px rgba(0, 0, 0, 0.45)',
  hover: '0 2px 4px rgba(0, 0, 0, 0.4), 0 16px 32px -16px rgba(0, 0, 0, 0.6)',
  raised: '0 4px 8px rgba(0, 0, 0, 0.4), 0 16px 40px rgba(0, 0, 0, 0.55)',
};
export const font = {
  family: "'Inter Variable', Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
} as const;

/** Text/background pairs that must meet WCAG AA (4.5:1 for normal text) in both themes. */
export const contrastPairs: [ColorToken, ColorToken][] = [
  ['text', 'bg'],
  ['text', 'surface'],
  ['text', 'surfaceAlt'],
  ['text', 'mint'],
  ['textMuted', 'bg'],
  ['textMuted', 'surface'],
  ['textMuted', 'surfaceAlt'],
  ['textMuted', 'mint'],
  ['onPrimary', 'primary'],
  ['onPrimary', 'primaryHover'],
  ['onPrimary', 'primaryActive'],
  ['primary', 'surface'],
  ['primary', 'surfaceAlt'],
  ['primary', 'mint'],
  ['primary', 'bg'],
  ['sageText', 'surface'],
  ['sageText', 'mint'],
  ['neutralText', 'neutralSurface'],
  ['onDanger', 'danger'],
  ['onDanger', 'dangerHover'],
  ['danger', 'surface'],
  ['danger', 'dangerSurface'],
  ['warningText', 'warningSurface'],
  ['successText', 'successSurface'],
  ['infoText', 'infoSurface'],
  ['onInverse', 'inverse'],
  ['onHero', 'heroFrom'],
  ['onHero', 'heroTo'],
  ['onHeroMuted', 'heroFrom'],
  ['onHeroMuted', 'heroTo'],
  ['text', 'paper'],
  ['textMuted', 'paper'],
];

/** Non-text graphics (rings, bars, focus outlines) need 3:1 against their surroundings. */
export const graphicPairs: [ColorToken, ColorToken][] = [
  ['primary', 'track'],
  ['focus', 'surface'],
  ['focus', 'bg'],
  ['borderStrong', 'surface'],
];

function toKebab(s: string): string {
  return s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

function vars(c: Record<string, string>, sh: Record<string, string>): string {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(c)) lines.push(`--color-${toKebab(k)}: ${v};`);
  for (const [k, v] of Object.entries(sh)) lines.push(`--shadow-${k}: ${v};`);
  return lines.join('');
}

/**
 * Light tokens on :root; dark tokens when the system prefers dark (unless the user picked
 * light in Settings) or when the user explicitly picked dark (data-theme="dark").
 */
export function tokenCss(): string {
  const base: string[] = [];
  for (const [k, v] of Object.entries(space)) base.push(`--space-${k}: ${v};`);
  for (const [k, v] of Object.entries(radius)) base.push(`--radius-${k}: ${v};`);
  base.push(`--font-family: ${font.family};`);
  const light = vars(colors, shadow);
  const dark = vars(darkColors, darkShadow);
  return [
    `:root{${base.join('')}${light}--subject-lift: 0%;color-scheme: light;}`,
    `@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${dark}--subject-lift: 28%;color-scheme: dark;}}`,
    `:root[data-theme="dark"]{${dark}--subject-lift: 28%;color-scheme: dark;}`,
  ].join('\n');
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
