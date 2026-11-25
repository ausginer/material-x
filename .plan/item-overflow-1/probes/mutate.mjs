// Run from the repository root, with the packages built:
//   node .plan/item-overflow-1/probes/mutate.mjs <engine,...>
// RF-139: applies each mutation to the list item's sheet, runs the rows of long
// texts, and restores the sheet. `main` is the merge base's sheet. The names of
// the failed rows are given without the item and the direction, with a count.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
const SHEET = 'packages/material-x/src/list/styles/item/main.styles.css';
const REPORT = 'packages/material-x/.vitest/json/output.json';
const MAIN = '2485fb2df';
const original = readFileSync(SHEET, 'utf8');
const replaced = (from, to) => {
  if (original.split(from).length !== 2) throw new Error(`not once: ${from}`);
  return original.replace(from, () => to);
};
const mutations = [
  ['no mutation', original],
  [
    'main',
    execFileSync('git', ['show', `${MAIN}:${SHEET}`], { encoding: 'utf8' }),
  ],
  ['without the 15%', replaced('flex: 1 1 15%;', 'flex: 1 1 0;')],
  [
    '15% as a minimum',
    replaced(
      'flex: 1 1 15%;\n  min-inline-size: 0;',
      'flex: 1 1 0;\n  min-inline-size: 15%;',
    ),
  ],
  [
    'a cap on the leading slot',
    replaced(
      'flex: 0 0 min-content;\n  min-inline-size: 0;',
      'flex: 0 0 min-content;\n  min-inline-size: 0;\n  max-inline-size: max(50%, 114px);',
    ),
  ],
  ['the label shrinks too', replaced('flex: 0 1000 auto;', 'flex: 0 1 auto;')],
  ['no half', replaced('  max-inline-size: 50%;\n', '')],
  ['no word break', replaced('    overflow-wrap: anywhere;\n', '')],
  ['no wrap', replaced('    white-space: normal;', '    white-space: nowrap;')],
  [
    'the label keeps its longest word',
    replaced('flex: 1 1 15%;\n  min-inline-size: 0;', 'flex: 1 1 15%;'),
  ],
  [
    'the trailing slot starts from its narrowest content',
    replaced('flex: 0 1000 auto;', 'flex: 0 1000 min-content;'),
  ],
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
          'tests/list/list-item-overflow',
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
      const counts = new Map();
      for (const { assertionResults } of report.testResults)
        for (const { status, fullName } of assertionResults)
          if (status === 'failed') {
            const row = fullName.replace(/^\S+ texts in (?:ltr|rtl) /u, '');
            counts.set(row, (counts.get(row) ?? 0) + 1);
          }
      for (const [row, count] of counts) console.log(`   ${count} x ${row}`);
    }
  }
} finally {
  writeFileSync(SHEET, original);
}
