// Run from the repository root: node .plan/reviews/axe-checks-1/probes/passes.mjs <engine> <out>
// RD-57's feature proof. Copies tests/axe.browser.test.ts to a scratch test
// file that runs in every engine and prints, for each row, the rules that axe
// applied (passes, violations, incomplete) with their targets. Runs it in the
// one engine, writes the lines and the failing rows to <out>, and removes the
// copy.
import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';

const DIR = 'packages/material-x';
const SOURCE = `${DIR}/tests/axe.browser.test.ts`;
const COPY = `${DIR}/tests/zz-review-axe-passes.browser.test.ts`;
const REPORT = `${DIR}/.vitest/review-axe-passes.json`;
const [engine, out] = process.argv.slice(2);
const replace = (s, from, to) => {
  if (s.split(from).length !== 2) throw new Error(`not once: ${from}`);
  return s.replace(from, () => to);
};
let s = readFileSync(SOURCE, 'utf8');
s = replace(
  s,
  "describe.runIf(server.browser === 'chromium')('axe-core', () => {",
  "describe('axe-core', () => {",
);
s = replace(
  s,
  '  return {\n    violations: violations.flatMap(describeNodes).toSorted(),',
  `  const list = (results: readonly Result[]) =>
    results.flatMap(({ id, nodes }) => nodes.map(({ target }) => \`\${id} @ \${target.flat().join(' > ')}\`)).toSorted();
  (globalThis as Record<string, unknown>)['__axe'] = {
    passes: list(passes),
    violations: list(violations),
    incomplete: list(incomplete),
  };

  return {
    violations: violations.flatMap(describeNodes).toSorted(),`,
);
s = replace(
  s,
  'async ({ html, change, hasNoRule = false, violations: listed = [] }) => {',
  'async ({ state, html, change, hasNoRule = false, violations: listed = [] }) => {',
);
s = replace(
  s,
  '        const { violations, applied } = await check(fixture);\n',
  `        const { violations, applied } = await check(fixture);
        console.log(\`AXE \${server.browser} | \${tag} | \${state} | \${JSON.stringify((globalThis as Record<string, unknown>)['__axe'])}\`);
`,
);
writeFileSync(COPY, s);
try {
  rmSync(REPORT, { force: true });
  const run = spawnSync(
    'aube',
    [
      'exec',
      'vitest',
      'run',
      '-c',
      'vitest.config.ts',
      '--silent=false',
      '--reporter=default',
      '--reporter=json',
      `--outputFile=${REPORT.slice(DIR.length + 1)}`,
      'tests/zz-review-axe-passes',
    ],
    {
      cwd: DIR,
      env: { ...process.env, NO_COLOR: '1', MX_TEST_ENGINES: engine },
      encoding: 'utf8',
      maxBuffer: 1e8,
    },
  );
  const lines = `${run.stdout}${run.stderr}`
    .split('\n')
    .filter((l) => l.includes('AXE '))
    .map((l) => l.slice(l.indexOf('AXE ') + 4));
  const report = JSON.parse(readFileSync(REPORT, 'utf8'));
  const failed = report.testResults.flatMap((f) =>
    f.assertionResults
      .filter((a) => a.status === 'failed')
      .map(
        (a) =>
          `FAILED ${a.fullName}\n  ${a.failureMessages.join(' ').split('\n')[0]}`,
      ),
  );
  writeFileSync(
    out,
    `# ${engine}: ${report.numPassedTests} passed, ${report.numFailedTests} failed\n${failed.join('\n')}\n${lines.join('\n')}\n`,
  );
} finally {
  rmSync(COPY, { force: true });
  rmSync(REPORT, { force: true });
}
