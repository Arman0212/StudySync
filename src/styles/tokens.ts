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
  bg: '#f7f9f6', // off-white page background
  surface: '#ffffff',
  text: '#17241c',
  textMuted: '#4b5d52',
  border: '#d5e1d9',
  borderStrong: '#9fb5a6',
  focus: '#1f5f3f',
  danger: '#b42318',
  dangerHover: '#912018',
  dangerSurface: '#fdeceb',
  warningText: '#7a4b00',
  warningSurface: '#fff4dc',
  successText: '#1d6b3c',
  successSurface: '#e3f3e8',
  infoText: '#1f4f86',
  infoSurface: '#e6eef8',
} as const;

export const space = { 1: '8px', 2: '16px', 3: '24px', 4: '32px', 5: '40px', 6: '48px', half: '4px' } as const;
export const radius = { sm: '6px', md: '10px', lg: '14px', pill: '999px' } as const;
export const shadow = { card: '0 1px 2px rgba(23, 36, 28, 0.06)', raised: '0 4px 16px rgba(23, 36, 28, 0.10)' } as const;
export const font = {
  family: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
} as const;

/** Text/background pairs that must meet WCAG AA (4.5:1 for normal text). */
export const contrastPairs: [keyof typeof colors, keyof typeof colors][] = [
  ['text', 'bg'],
  ['text', 'surface'],
  ['text', 'mint'],
  ['textMuted', 'bg'],
  ['textMuted', 'surface'],
  ['textMuted', 'mint'],
  ['onPrimary', 'primary'],
  ['onPrimary', 'primaryHover'],
  ['primary', 'surface'],
  ['primary', 'mint'],
  ['primary', 'bg'],
  ['sageText', 'surface'],
  ['sageText', 'mint'],
  ['onPrimary', 'danger'],
  ['danger', 'surface'],
  ['danger', 'dangerSurface'],
  ['warningText', 'warningSurface'],
  ['successText', 'successSurface'],
  ['infoText', 'infoSurface'],
];

function toKebab(s: string): string {
  return s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

export function tokenCss(): string {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(colors)) lines.push(`--color-${toKebab(k)}: ${v};`);
  for (const [k, v] of Object.entries(space)) lines.push(`--space-${k}: ${v};`);
  for (const [k, v] of Object.entries(radius)) lines.push(`--radius-${k}: ${v};`);
  for (const [k, v] of Object.entries(shadow)) lines.push(`--shadow-${k}: ${v};`);
  lines.push(`--font-family: ${font.family};`);
  return `:root{${lines.join('')}}`;
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
