/**
 * Small original line illustrations for empty states. Decorative only (aria-hidden).
 * Strokes use neutral grey and soft fills use the subtle fill token.
 */
export type IllustrationName = 'sprout' | 'calendar' | 'books' | 'chart' | 'filter' | 'exam' | 'rest';

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const F = { fill: 'var(--color-fill)', stroke: 'none' } as const;

function Ground() {
  return <path {...S} d="M14 98h132" strokeOpacity={0.35} />;
}

const art: Record<IllustrationName, React.ReactNode> = {
  sprout: (
    <>
      <ellipse {...F} cx="80" cy="60" rx="46" ry="38" />
      <path {...S} d="M58 74h44l-6 24H64z" />
      <path {...S} d="M54 74h52" />
      <path {...S} d="M80 74V46" />
      <path {...S} d="M80 56c-14 0-22-8-22-20 12 0 22 6 22 20z" />
      <path {...S} d="M80 50c0-14 9-22 24-22 0 14-9 22-24 22z" />
      <Ground />
    </>
  ),
  calendar: (
    <>
      <ellipse {...F} cx="82" cy="58" rx="50" ry="38" />
      <rect {...S} x="42" y="28" width="76" height="62" rx="10" />
      <path {...S} d="M42 46h76M62 20v14M98 20v14" />
      <path {...S} d="M56 60h8M76 60h8M96 60h8M56 74h8M76 74h8" />
      <path {...S} d="M108 70c0 10-6 16-6 26M102 82c-6 0-10-4-10-10 6 0 10 4 10 10zM104 78c0-7 4-11 11-11 0 7-4 11-11 11z" />
      <Ground />
    </>
  ),
  books: (
    <>
      <ellipse {...F} cx="80" cy="60" rx="48" ry="36" />
      <rect {...S} x="44" y="78" width="72" height="14" rx="4" />
      <rect {...S} x="52" y="64" width="62" height="14" rx="4" />
      <rect {...S} x="48" y="50" width="56" height="14" rx="4" />
      <path {...S} d="M58 85h20M62 71h18M58 57h16" />
      <path {...S} d="M114 50V28l10 6-10 6" />
      <Ground />
    </>
  ),
  chart: (
    <>
      <ellipse {...F} cx="80" cy="58" rx="50" ry="38" />
      <path {...S} d="M40 92h82" />
      <rect {...S} x="48" y="70" width="14" height="22" rx="3" />
      <rect {...S} x="70" y="56" width="14" height="36" rx="3" />
      <rect {...S} x="92" y="42" width="14" height="50" rx="3" />
      <path {...S} d="M99 42V30M99 34c-8 0-12-5-12-11 7 0 12 4 12 11zM99 31c0-7 5-11 12-11 0 7-5 11-12 11z" />
      <Ground />
    </>
  ),
  filter: (
    <>
      <ellipse {...F} cx="80" cy="58" rx="46" ry="36" />
      <circle {...S} cx="74" cy="54" r="22" />
      <path {...S} d="M90 70l20 20" strokeWidth={4} />
      <path {...S} d="M64 54h20" />
      <Ground />
    </>
  ),
  exam: (
    <>
      <ellipse {...F} cx="80" cy="58" rx="46" ry="38" />
      <path {...S} d="M52 22h44l14 14v58H52z" />
      <path {...S} d="M96 22v14h14" />
      <path {...S} d="M62 48h26M62 60h36M62 72h30" />
      <path {...S} d="M64 84l5 5 10-10" />
      <Ground />
    </>
  ),
  rest: (
    <>
      <ellipse {...F} cx="80" cy="58" rx="48" ry="36" />
      <path {...S} d="M54 62h48v10a18 18 0 0 1-18 18h-12a18 18 0 0 1-18-18z" />
      <path {...S} d="M102 66h6a8 8 0 0 1 0 16h-4" />
      <path {...S} d="M68 52c-4-6 4-8 0-14M80 52c-4-6 4-8 0-14M92 52c-4-6 4-8 0-14" strokeOpacity={0.7} />
      <Ground />
    </>
  ),
};

export function Illustration({ name, className = '' }: { name: IllustrationName; className?: string }) {
  return (
    <svg className={`illustration ${className}`.trim()} viewBox="0 0 160 110" width="160" height="110" aria-hidden="true" focusable="false">
      {art[name]}
    </svg>
  );
}
