// Runs every quality gate in order and stops at the first failure.
// Usage: npm run verify
import { spawnSync } from 'node:child_process';

const steps = [
  { name: 'Type check (tsc strict)', cmd: 'npx', args: ['tsc', '-b', '--noEmit'] },
  { name: 'Lint (eslint)', cmd: 'npx', args: ['eslint', '.', '--max-warnings=0'] },
  { name: 'Unit, property and component tests (vitest)', cmd: 'npx', args: ['vitest', 'run'] },
  { name: 'Production build (vite)', cmd: 'npx', args: ['vite', 'build'] },
  { name: 'End-to-end + accessibility + responsive tests (playwright)', cmd: 'npx', args: ['playwright', 'test'], needsBrowser: true },
];

/** Ensures the Chromium build matching the installed Playwright version is present. */
function ensureChromium() {
  // `playwright install` is a no-op when the right browser is already downloaded.
  for (let attempt = 1; attempt <= 2; attempt++) {
    const r = spawnSync('npx', ['playwright', 'install', 'chromium'], { stdio: 'inherit', shell: process.platform === 'win32' });
    if (r.status === 0) return true;
    console.error(`playwright install chromium failed (attempt ${attempt}/2)`);
  }
  return false;
}

const results = [];
for (const step of steps) {
  if (step.needsBrowser) {
    console.log(`\n=== Checking Playwright Chromium ===`);
    if (!ensureChromium()) {
      console.error(`\n✖ ${step.name}: SKIPPED — Chromium could not be installed (network?). This is NOT a pass.`);
      results.push({ name: step.name, status: 'SKIPPED' });
      printSummary();
      process.exit(1);
    }
  }
  console.log(`\n=== ${step.name} ===`);
  const started = Date.now();
  const r = spawnSync(step.cmd, step.args, { stdio: 'inherit', shell: process.platform === 'win32' });
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  if (r.status !== 0) {
    results.push({ name: step.name, status: `FAILED (${secs}s)` });
    printSummary();
    process.exit(1);
  }
  results.push({ name: step.name, status: `passed (${secs}s)` });
}
printSummary();
console.log('\nAll verification steps passed.');

function printSummary() {
  console.log('\n--- verify summary ---');
  for (const r of results) console.log(`${r.status.padEnd(18)} ${r.name}`);
}
