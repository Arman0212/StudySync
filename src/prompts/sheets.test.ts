import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { finalTemplate, v1, v2, v3 } from './index';

describe('prompt sheets in /prompts match the versioned template files', () => {
  it.each([v1, v2, v3, finalTemplate].map((t) => [t.version, t] as const))('%s', (_v, t) => {
    const sheet = readFileSync(resolve(__dirname, `../../prompts/mock-test-${t.version}.md`), 'utf8');
    expect(sheet).toContain(t.template);
    expect(sheet).toContain('*Not yet run — to be filled in by the team after real use.*');
  });
});
