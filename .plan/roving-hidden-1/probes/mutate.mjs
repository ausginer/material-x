// Run from the repository root, with a clean src:
//   node .plan/roving-hidden-1/probes/mutate.mjs <engine> <path of a scratch report>
// RF-143: applies each mutation, builds core, runs the rows of core and of
// material-x's groups, and restores the files and the build.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';

const HOOK = 'packages/core/src/controllers/useRovingTabindex.ts';
const GROUP = 'packages/material-x/src/button-group/connected-button-group.ts';
const SHEET =
  'packages/material-x/src/button-group/styles/connected/main.styles.css';
const originals = new Map(
  [HOOK, GROUP, SHEET].map((file) => [file, readFileSync(file, 'utf8')]),
);
const main = (file) =>
  execFileSync('git', ['show', `2485fb2df:${file}`], { encoding: 'utf8' });
const swap = (file, from, to) => {
  const source = originals.get(file);
  if (source.split(from).length !== 2)
    throw new Error(`not one match: ${from}`);
  return { [file]: source.replace(from, () => to) };
};
const DISPLAY = "!item.disabled && getComputedStyle(item).display !== 'none'";
const HIDDEN = "attributeFilter: ['hidden', 'disabled']";
const SHOWN = "getComputedStyle(element).display !== 'none'";
const mutations = [
  ['no mutation', {}],
  [
    'the hook, the group and the sheet of main',
    Object.fromEntries([HOOK, GROUP, SHEET].map((f) => [f, main(f)])),
  ],
  ['the hook of main', { [HOOK]: main(HOOK) }],
  ['the group of main', { [GROUP]: main(GROUP) }],
  [
    'item.hidden in place of the computed display',
    swap(HOOK, DISPLAY, '!item.disabled && !item.hidden'),
  ],
  ['no display in the hook', swap(HOOK, DISPLAY, '!item.disabled')],
  [
    'no disabled in the hook',
    swap(HOOK, DISPLAY, "getComputedStyle(item).display !== 'none'"),
  ],
  ['hidden not heard', swap(HOOK, HIDDEN, "attributeFilter: ['disabled']")],
  ['disabled not heard', swap(HOOK, HIDDEN, "attributeFilter: ['hidden']")],
  ['former items still heard', swap(HOOK, '    observer.disconnect();\n', '')],
  [
    'the items of a read of more than three not heard',
    swap(
      HOOK,
      '    for (const item of value) {\n      observer',
      '    if (value.length > 3) return;\n    for (const item of value) {\n      observer',
    ),
  ],
  [
    'no choice at the connect',
    swap(HOOK, '  useConnected(host, select);\n', ''),
  ],
  ["the group's hidden", swap(GROUP, SHOWN, '!element.hidden')],
  ['the ends without display', swap(GROUP, SHOWN, 'element !== null')],
  [
    'the ends not marked at the connect',
    swap(GROUP, '    useConnected(this, markEnds);\n', ''),
  ],
  [
    'hidden not heard by the group',
    swap(GROUP, "attributeFilter: ['hidden']", "attributeFilter: ['x']"),
  ],
  [
    'no rule for the only member',
    swap(SHEET, '[data-first][data-last]', '[data-none]'),
  ],
];
const restore = () => {
  for (const [file, text] of originals) writeFileSync(file, text);
};
const run = (dir, args) =>
  spawnSync('aube', ['exec', '--', ...args], {
    cwd: dir,
    env: { ...process.env, NO_COLOR: '1', MX_TEST_ENGINES: process.argv[2] },
    encoding: 'utf8',
    maxBuffer: 1e8,
  });
const out = process.argv[3];
try {
  for (const [name, files] of mutations) {
    restore();
    for (const [file, text] of Object.entries(files)) writeFileSync(file, text);
    if (run('packages/core', ['just', 'build']).status) throw new Error(name);
    for (const [dir, tests] of [
      ['packages/core', 'tests/controllers/useRovingTabindex.browser.test.ts'],
      ['packages/material-x', 'tests/button-group'],
    ]) {
      rmSync(out, { force: true });
      run(dir, [
        'vitest',
        'run',
        '-c',
        'vitest.config.ts',
        tests,
        '--reporter=json',
        `--outputFile=${out}`,
      ]);
      const report = JSON.parse(readFileSync(out, 'utf8'));
      if (!report.numTotalTests) throw new Error(`no rows: ${name}`);
      console.log(
        `## ${name} | ${process.argv[2]} | ${dir} | ${report.numFailedTests} failed, ${report.numPassedTests} passed`,
      );
      for (const { assertionResults } of report.testResults)
        for (const { status, fullName } of assertionResults)
          if (status === 'failed') console.log(`   ${fullName}`);
    }
  }
} finally {
  restore();
  rmSync(out, { force: true });
  run('packages/core', ['just', 'build']);
}
