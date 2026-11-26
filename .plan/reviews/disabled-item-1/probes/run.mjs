// Runs a Vitest file of packages/material-x/tests/list in one engine and prints the lines of its tests' meta.
// From packages/material-x: node <this> <engine> <file filter> [name filter]
import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const out = `${tmpdir()}/proof-${process.pid}.json`;
const run = spawnSync(
  'aube',
  [
    'exec',
    '--',
    'vitest',
    'run',
    '-c',
    'vitest.config.ts',
    process.argv[3],
    ...(process.argv[4] ? ['-t', process.argv[4]] : []),
    '--testTimeout=120000',
    '--retry=0',
    '--reporter=json',
    `--outputFile=${out}`,
  ],
  {
    env: { ...process.env, MX_TEST_ENGINES: process.argv[2] },
    encoding: 'utf8',
  },
);
let json;
try {
  json = JSON.parse(readFileSync(out, 'utf8'));
} catch {
  console.log(run.stdout.slice(-3000), run.stderr.slice(-3000));
  process.exit(1);
}
rmSync(out, { force: true });
const all = json.testResults.flatMap((f) => f.assertionResults);
const lines = all.flatMap((t) => t.meta?.lines ?? []);
console.log(
  `# ${process.argv[2]}: ${all.length} tests, ${all.filter((t) => t.status === 'failed').length} failed, ok ${lines.filter((l) => l.startsWith('ok')).length}, DIFF ${lines.filter((l) => l.startsWith('DIFF')).length}`,
);
for (const t of all) {
  if (t.status === 'failed')
    console.log(
      `FAILED ${t.fullName}: ${t.failureMessages.join(' ').slice(0, 600)}`,
    );
  for (const l of t.meta?.lines ?? []) console.log(`${l}`);
}
for (const f of json.testResults)
  if (f.message) console.log(f.message.slice(0, 1500));
