// Run from the repository root:
//   node .plan/reviews/axe-checks-1/probes/mutations.mjs <engine> <path of a scratch report>
// RD-57's feature proof: the review's own mutations of material-x's sources,
// on tests/axe.browser.test.ts. Each is reverted before the next one. Prints
// one line per mutation and its failing rows with their first message line.
import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';

const SRC = 'packages/material-x/src';
const [engine, REPORT] = process.argv.slice(2);
const files = new Map();
const read = (file) => {
  if (!files.has(file)) files.set(file, readFileSync(`${SRC}/${file}`, 'utf8'));
  return files.get(file);
};
const swap = (file, from, to) => {
  const text = read(file);
  if (text.split(from).length !== 2) throw new Error(`not once: ${from}`);
  return [file, text.replace(from, () => to)];
};
const MUTATIONS = [
  ['no mutation', []],
  // Filled below: both removals are on one file.
  ['the switch has no aria-checked', []],
  [
    "the switch's role is misspelled",
    [
      swap('button/switch-button.tpl.html', 'role="switch"', 'role="swich"'),
      swap(
        'button/switch-icon-button.tpl.html',
        'role="switch"',
        'role="swich"',
      ),
    ],
  ],
  // Each input is labelled twice: by the shadow <label for> and by
  // aria-labelledby. One path alone is an equivalent mutation (read: 0 rows).
  [
    "the slider's input is labelled by aria-labelledby only",
    [swap('slider/slider.tpl.html', ' for="input"', '')],
  ],
  [
    "the slider's input isn't labelled",
    [
      swap('slider/slider.tpl.html', ' for="input"', ''),
      swap(
        'slider/slider.ts',
        'input.ariaLabelledByElements = labelledBy?.length ? labelledBy : null;',
        'input.ariaLabelledByElements = null;',
      ),
    ],
  ],
  [
    "the text field's input is labelled by its <label for> only",
    [
      swap(
        'text-field/TextFieldCore.ts',
        "  'aria-labelledby': ['label'],\n",
        '',
      ),
    ],
  ],
  [
    "the text field's input isn't labelled by its label",
    [
      swap('text-field/text-field-core.tpl.html', ' for="field"', ''),
      swap(
        'text-field/TextFieldCore.ts',
        "  'aria-labelledby': ['label'],\n",
        '',
      ),
    ],
  ],
  [
    "the sortable list doesn't name a handle",
    [
      swap(
        'list/sortable-item.ts',
        "claim(handle, handleOwned, 'aria-label', 'Reorder');",
        '',
      ),
    ],
  ],
  [
    "the group's role through ElementInternals is misspelled",
    [
      swap(
        'button-group/button-group.ts',
        "{ role: 'group' }",
        "{ role: 'gruop' }",
      ),
      swap(
        'button-group/connected-button-group.ts',
        "{ role: 'group' }",
        "{ role: 'gruop' }",
      ),
    ],
  ],
];
{
  const file = 'button/SwitchCore.ts';
  const text = read(file)
    .replace("  setOwnARIA(target, 'aria-checked', 'false');\n", '')
    .replace("      setOwnARIA(target, 'aria-checked', String(value));\n", '');
  if (text === read(file)) throw new Error('switch: no change');
  MUTATIONS[1][1] = [[file, text]];
}
const restore = () => {
  for (const [file, text] of files) writeFileSync(`${SRC}/${file}`, text);
};
try {
  for (const [name, changes] of MUTATIONS) {
    restore();
    for (const [file, text] of changes) writeFileSync(`${SRC}/${file}`, text);
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
        'tests/axe.browser',
      ],
      {
        cwd: 'packages/material-x',
        env: { ...process.env, NO_COLOR: '1', MX_TEST_ENGINES: engine },
        encoding: 'utf8',
        maxBuffer: 1e8,
      },
    );
    const report = JSON.parse(readFileSync(REPORT, 'utf8'));
    if (!report.numPassedTests && !report.numFailedTests)
      throw new Error(`no rows: ${name}`);
    console.log(
      `## ${name} | ${engine} | ${report.numFailedTests} failed, ${report.numPassedTests} passed`,
    );
    for (const { assertionResults } of report.testResults)
      for (const { status, fullName, failureMessages } of assertionResults)
        if (status === 'failed')
          console.log(
            `   ${fullName.replace(/^axe-core /u, '')}\n     ${failureMessages[0]?.split('\n')[0]}`,
          );
  }
} finally {
  restore();
}
