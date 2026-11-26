// Run from the repository root, with the packages built:
//   node .plan/card-radius-1/probes/mutate.mjs <engine,...>
// RD-53: applies each mutation to the card's sheet, runs its rows, and restores
// the sheet.
import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
const SHEET = 'packages/material-x/src/card/styles/default/main.styles.css';
const REPORT = 'packages/material-x/.vitest/json/output.json';
const original = readFileSync(SHEET, 'utf8');
const LINE = '  border-radius: inherit;\n';
const replaced = (to) => {
  if (original.split(LINE).length !== 2) throw new Error('not one match');
  return original.replace(LINE, to);
};
const mutations = [
  ['no mutation', original],
  ['the line removed', replaced('')],
  ['the slot as a block', replaced(`${LINE}  display: block;\n`)],
];
try {
  for (const [name, text] of mutations) {
    writeFileSync(SHEET, text);
    for (const engine of process.argv[2].split(',')) {
      rmSync(REPORT, { force: true });
      spawnSync(
        'aube',
        [
          'exec',
          'vitest',
          'run',
          '-c',
          'vitest.config.ts',
          '--reporter=json',
          'tests/card/card.spec.browser',
        ],
        {
          cwd: 'packages/material-x',
          env: { ...process.env, NO_COLOR: '1', MX_TEST_ENGINES: engine },
          encoding: 'utf8',
          maxBuffer: 1e8,
        },
      );
      const report = JSON.parse(readFileSync(REPORT, 'utf8'));
      console.log(
        `## ${name} | ${engine} | ${report.numFailedTests} failed, ${report.numPassedTests} passed`,
      );
      for (const { assertionResults } of report.testResults)
        for (const { status, fullName } of assertionResults)
          if (status === 'failed') console.log(`   ${fullName}`);
    }
  }
} finally {
  writeFileSync(SHEET, original);
}
