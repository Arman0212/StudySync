// Creates studysync.zip of the full source, excluding node_modules, build output,
// test artefacts and the .loop/ folder. Uses `git ls-files` so ignored files are never included.
import { spawnSync } from 'node:child_process';
import { existsSync, rmSync, statSync } from 'node:fs';

const OUT = 'studysync.zip';
const EXCLUDE = [/^node_modules\//, /^dist\//, /^\.loop\//, /^test-results\//, /^playwright-report\//, /^coverage\//, /^studysync\.zip$/];

const ls = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' });
if (ls.status !== 0) {
  console.error('git ls-files failed — is this a git repository?');
  process.exit(1);
}
const files = ls.stdout.split('\n').filter((f) => f && !EXCLUDE.some((re) => re.test(f)) && existsSync(f));
if (existsSync(OUT)) rmSync(OUT);
const zip = spawnSync('zip', ['-q', '-X', OUT, '-@'], { input: files.join('\n'), stdio: ['pipe', 'inherit', 'inherit'] });
if (zip.status !== 0) {
  console.error('zip failed (is the `zip` command installed?)');
  process.exit(1);
}
console.log(`Created ${OUT} with ${files.length} files (${Math.round(statSync(OUT).size / 1024)} KB).`);
