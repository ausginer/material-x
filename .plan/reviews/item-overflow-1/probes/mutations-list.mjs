// Run from the repository root: node .plan/reviews/item-overflow-1/probes/mutations.mjs <engine> [names, comma separated]
// As mutations.mjs, on every file of tests/list.
// list-item-overflow. Restores the sheet. Prints one line per mutation: failed,
// passed, and the rows that fail with their count.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
const SHEET = 'packages/material-x/src/list/styles/item/main.styles.css';
const REPORT = 'packages/material-x/.vitest/json/output.json';
const original = readFileSync(SHEET, 'utf8');
const r = (from, to) => {
  if (original.split(from).length !== 2) throw new Error(`not once: ${from}`);
  return original.replace(from, () => to);
};
const CONTENT = 'flex: 1 1 15%;\n  min-inline-size: 0;';
const TRAIL =
  'flex: 0 1000 auto;\n  min-inline-size: min-content;\n  max-inline-size: 50%;';
const all = {
  none: original,
  main: execFileSync('git', ['show', `2485fb2df:${SHEET}`], {
    encoding: 'utf8',
  }),
  // the implementer's
  'without the 15%': r('flex: 1 1 15%;', 'flex: 1 1 0;'),
  '15% as a minimum': r(CONTENT, 'flex: 1 1 0;\n  min-inline-size: 15%;'),
  'a cap on lead': r(
    'flex: 0 0 min-content;\n  min-inline-size: 0;',
    'flex: 0 0 min-content;\n  min-inline-size: 0;\n  max-inline-size: max(50%, 114px);',
  ),
  'label shrinks too': r('flex: 0 1000 auto;', 'flex: 0 1 auto;'),
  'no half': r('  max-inline-size: 50%;\n', ''),
  'no word break': r('    overflow-wrap: anywhere;\n', ''),
  'no wrap': r('white-space: normal;', 'white-space: nowrap;'),
  'label keeps its longest word': r(CONTENT, 'flex: 1 1 15%;'),
  'trail starts from min-content': r(
    'flex: 0 1000 auto;',
    'flex: 0 1000 min-content;',
  ),
  // the review's
  'break-word': r('overflow-wrap: anywhere;', 'overflow-wrap: break-word;'),
  'trail has no minimum': r(
    '  min-inline-size: min-content;\n',
    '  min-inline-size: 0;\n',
  ),
  'trail min auto': r('  min-inline-size: min-content;\n', ''),
  'trail does not shrink': r('flex: 0 1000 auto;', 'flex: 0 0 auto;'),
  'trail shrinks 10': r('flex: 0 1000 auto;', 'flex: 0 10 auto;'),
  'trail shrinks 100': r('flex: 0 1000 auto;', 'flex: 0 100 auto;'),
  'trail grows': r('flex: 0 1000 auto;', 'flex: 1 1000 auto;'),
  'content basis auto': r('flex: 1 1 15%;', 'flex: 1 1 auto;'),
  'content does not grow': r('flex: 1 1 15%;', 'flex: 0 1 15%;'),
  '14%': r('flex: 1 1 15%;', 'flex: 1 1 14%;'),
  '16%': r('flex: 1 1 15%;', 'flex: 1 1 16%;'),
  '20%': r('flex: 1 1 15%;', 'flex: 1 1 20%;'),
  'half is 45%': r('max-inline-size: 50%;', 'max-inline-size: 45%;'),
  'half is 40%': r('max-inline-size: 50%;', 'max-inline-size: 40%;'),
  'lead shrinks': r(
    'flex: 0 0 min-content;\n  min-inline-size: 0;',
    'flex: 0 1 min-content;\n  min-inline-size: 0;',
  ),
  'lead auto': r(
    'flex: 0 0 min-content;\n  min-inline-size: 0;',
    'flex: 0 0 auto;\n  min-inline-size: 0;',
  ),
  'min-content is in the cap': r(
    TRAIL,
    'flex: 0 1000 auto;\n  min-inline-size: min(min-content, 50%);\n  max-inline-size: 50%;',
  ),
  'trail clips': r(
    'flex: 0 1000 auto;',
    'flex: 0 1000 auto;\n  overflow: hidden;',
  ),
};
delete all['min-content is in the cap'];
const [, , engine, only] = process.argv;
try {
  for (const name of only ? only.split(',') : Object.keys(all)) {
    writeFileSync(SHEET, all[name]);
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
        'tests/list/',
      ],
      {
        cwd: 'packages/material-x',
        env: { ...process.env, NO_COLOR: '1', MX_TEST_ENGINES: engine },
        encoding: 'utf8',
        maxBuffer: 1e8,
      },
    );
    const report = JSON.parse(readFileSync(REPORT, 'utf8'));
    const counts = new Map();
    for (const { assertionResults } of report.testResults)
      for (const { status, fullName } of assertionResults)
        if (status === 'failed') {
          const row = fullName
            .replace(/^\S+ texts in (?:ltr|rtl) /u, '')
            .replace(/: <.*$/u, '');
          counts.set(row, (counts.get(row) ?? 0) + 1);
        }
    console.log(
      `## ${name} | ${engine} | ${report.numFailedTests} failed, ${report.numPassedTests} passed`,
    );
    for (const [row, n] of counts) console.log(`   ${n} x ${row}`);
  }
} finally {
  writeFileSync(SHEET, original);
}
