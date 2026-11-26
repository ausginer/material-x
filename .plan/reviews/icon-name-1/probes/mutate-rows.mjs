// Run from the repository root:
//   node .plan/reviews/icon-name-1/probes/mutate-rows.mjs <engine> <path of a scratch report>
// RF-137's feature proof: the review's own mutations of the icon's sources and
// the split button's template, on the icon's and the split button's rows.
// Restores the sources. Prints one line per mutation and its failing rows.
import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';

const TPL = 'packages/material-x/src/icon/icon.tpl.html';
const SOURCE = 'packages/material-x/src/icon/icon.ts';
const SHEET = 'packages/material-x/src/icon/styles/icon.ctr.css';
const SPLIT = 'packages/material-x/src/button/split-button.tpl.html';
const [engine, REPORT] = process.argv.slice(2);
const originals = new Map(
  [TPL, SOURCE, SHEET, SPLIT].map((f) => [f, readFileSync(f, 'utf8')]),
);
const CALL =
  "this.shadowRoot!.querySelector('slot')!.setAttribute('aria-hidden', 'true');";
const swap = (file, from, to) => {
  const text = originals.get(file);
  if (text.split(from).length !== 2) throw new Error(`not once: ${from}`);
  return { [file]: text.replace(from, () => to) };
};
const display = (value) =>
  swap(SHEET, 'display: inline;\n}', `display: ${value};\n}`);
const mutations = [
  ['no mutation', {}],
  ['the value is false', swap(SOURCE, CALL, CALL.replace("'true'", "'false'"))],
  [
    'at the connect',
    swap(
      SOURCE,
      `    ${CALL}\n  }\n`,
      `  }\n\n  connectedCallback(): void {\n    ${CALL}\n  }\n`,
    ),
  ],
  [
    'by the reflected property',
    swap(
      SOURCE,
      CALL,
      "this.shadowRoot!.querySelector('slot')!.ariaHidden = 'true';",
    ),
  ],
  ['display: block', display('block')],
  ['display: inline-block', display('inline-block')],
  ['display: contents', display('contents')],
  ['display: none', display('none')],
  [
    'the slot in a span of display: contents, hidden by the constructor',
    {
      [TPL]: '<span style="display: contents"><slot></slot></span>\n',
      ...swap(
        SOURCE,
        CALL,
        "this.shadowRoot!.querySelector('span')!.setAttribute('aria-hidden', 'true');",
      ),
    },
  ],
  [
    "the split button's icon hidden again",
    swap(
      SPLIT,
      '<mx-icon>keyboard_arrow_down</mx-icon>',
      '<mx-icon aria-hidden="true">keyboard_arrow_down</mx-icon>',
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
