// Run from the repository root, with the packages built:
//   node .plan/icon-name-1/probes/mutate-slot.mjs <engine> <path of a scratch report>
// RF-137: applies each mutation to its source, runs the icon's and the split
// button's rows, and restores the source. `main` is the merge base's source.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
const ICON = 'packages/material-x/src/icon/icon.tpl.html';
const SOURCE = 'packages/material-x/src/icon/icon.ts';
const SHEET = 'packages/material-x/src/icon/styles/icon.ctr.css';
const SPLIT = 'packages/material-x/src/button/split-button.tpl.html';
const FILES = [ICON, SOURCE, SHEET, SPLIT];
const [engine, REPORT] = process.argv.slice(2);
const MAIN = 'ee0afea12';
const originals = new Map(
  FILES.map((file) => [file, readFileSync(file, 'utf8')]),
);
const main = (file) =>
  execFileSync('git', ['show', `${MAIN}:${file}`], { encoding: 'utf8' });
const CALL =
  "this.shadowRoot!.querySelector('slot')!.setAttribute('aria-hidden', 'true');";
const BOX = 'slot {\n  display: inline;\n}\n';
const swap = (file, from, to) => {
  const source = originals.get(file);
  if (source.split(from).length !== 2) throw new Error(`not once: ${from}`);
  return { [file]: source.replace(from, () => to) };
};
const inTemplate = { [ICON]: '<slot aria-hidden="true"></slot>\n' };
const mutations = [
  ['no mutation', {}],
  ['main', Object.fromEntries(FILES.map((file) => [file, main(file)]))],
  ['in the template only', { ...inTemplate, ...swap(SOURCE, CALL, '') }],
  ['in the template, and set to the same value', inTemplate],
  ['nothing hidden', swap(SOURCE, CALL, '')],
  ['in a microtask', swap(SOURCE, CALL, `queueMicrotask(() => { ${CALL} });`)],
  ['no display', swap(SHEET, BOX, '')],
  [
    'on the host',
    swap(SOURCE, CALL, "this.setAttribute('aria-hidden', 'true');"),
  ],
  [
    'on the host too, in a microtask',
    swap(
      SOURCE,
      CALL,
      `${CALL} queueMicrotask(() => this.setAttribute('aria-hidden', 'true'));`,
    ),
  ],
];
const restore = () => {
  for (const [file, text] of originals) writeFileSync(file, text);
};
try {
  for (const [name, files] of mutations) {
    restore();
    for (const [file, text] of Object.entries(files)) writeFileSync(file, text);
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
        `--outputFile=${REPORT}`,
        'tests/icon',
        'tests/button/split-button.browser',
      ],
      {
        cwd: 'packages/material-x',
        env: { ...process.env, NO_COLOR: '1', MX_TEST_ENGINES: engine },
        encoding: 'utf8',
        maxBuffer: 1e8,
      },
    );
    const report = JSON.parse(readFileSync(REPORT, 'utf8'));
    if (!report.numPassedTests) throw new Error(`no rows: ${name}`);
    console.log(
      `## ${name} | ${engine} | ${report.numFailedTests} failed, ${report.numPassedTests} passed`,
    );
    for (const { assertionResults } of report.testResults)
      for (const { status, fullName } of assertionResults)
        if (status === 'failed') console.log(`   ${fullName}`);
  }
} finally {
  restore();
}
