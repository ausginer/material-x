// Run from the repository root, with the packages built:
//   node .plan/split-button-names-1/probes/mutate.mjs <engine,...> [<mutation,...>]
// RF-136 and RF-138: applies each mutation to the split button's sources, runs
// its rows, and restores the sources. `main` is the merge base's source. With no
// list of mutations, all of them run.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
const SOURCE = 'packages/material-x/src/button/split-button.ts';
const TEMPLATE = 'packages/material-x/src/button/split-button.tpl.html';
const REPORT = 'packages/material-x/.vitest/json/output.json';
const MAIN = '855990331';
const originals = Object.fromEntries(
  [SOURCE, TEMPLATE].map((file) => [file, readFileSync(file, 'utf8')]),
);
const main = (file) =>
  execFileSync('git', ['show', `${MAIN}:${file}`], { encoding: 'utf8' });
const replaced = (file, from, to) => {
  if (originals[file].split(from).length !== 2)
    throw new Error(`not one match: ${from}`);
  return { [file]: originals[file].replace(from, () => to) };
};
const HOST_ARIA = replaced(
  SOURCE,
  '    const innards = internals(this);',
  `    useARIA(this, trailing);\n    const innards = internals(this);`,
)[SOURCE];
const ARIA = "        trailing.setAttribute('aria-expanded', String(open));\n";
const ATTRIBUTES = '{ ...BUTTON_ATTRS, ...DISABLEABLE_ATTRS }';
const mutations = [
  ['no mutation', {}],
  ['main', { [SOURCE]: main(SOURCE), [TEMPLATE]: main(TEMPLATE) }],
  [
    'secondarylabel not transferred',
    replaced(
      SOURCE,
      "      secondarylabel: transfer(trailing, 'aria-label'),\n",
      '',
    ),
  ],
  [
    'secondarylabel on the host too',
    replaced(
      SOURCE,
      "secondarylabel: transfer(trailing, 'aria-label'),",
      "secondarylabel: (_, value) => { transfer(trailing, 'aria-label')(_, value); this.setAttribute('aria-label', value ?? ''); },",
    ),
  ],
  [
    'secondarylabel on the leading button too',
    replaced(
      SOURCE,
      "secondarylabel: transfer(trailing, 'aria-label'),",
      "secondarylabel: (_, value) => { transfer(trailing, 'aria-label')(_, value); transfer(this.shadowRoot!.querySelector('mx-button')!, 'aria-label')(_, value); },",
    ),
  ],
  [
    "the host's aria-* on the trailing button",
    {
      [SOURCE]: `import { useARIA } from '@ydinjs/core/controllers/useARIA.js';\n${HOST_ARIA}`,
    },
  ],
  ['open not written to aria-expanded', replaced(SOURCE, ARIA, '')],
  [
    'open on the leading button too',
    replaced(
      SOURCE,
      ARIA,
      `${ARIA}        trailing.parentElement!.querySelector('mx-button')!.setAttribute('aria-expanded', String(open));\n`,
    ),
  ],
  [
    'open on the host too',
    replaced(
      SOURCE,
      ARIA,
      `${ARIA}        (trailing.getRootNode() as ShadowRoot).host.setAttribute('aria-expanded', String(open));\n`,
    ),
  ],
  [
    'no aria-expanded in the template',
    replaced(TEMPLATE, '    aria-expanded="false"\n', ''),
  ],
  [
    "no aria-hidden on the template's icon",
    replaced(TEMPLATE, ' aria-hidden="true"', ''),
  ],
  ['disabled not transferred', replaced(SOURCE, ATTRIBUTES, 'BUTTON_ATTRS')],
  ...['color', 'size', 'shape'].map((name) => [
    `${name} not transferred`,
    replaced(
      SOURCE,
      `Object.keys(${ATTRIBUTES}).map`,
      `Object.keys(${ATTRIBUTES}).filter((name) => name !== '${name}').map`,
    ),
  ]),
];
const names = process.argv[3]?.split(',');
const selected = names
  ? mutations.filter(([name]) => names.includes(name))
  : mutations;
if (names && selected.length !== names.length)
  throw new Error('unknown mutation');
const restore = () => {
  for (const [file, text] of Object.entries(originals))
    writeFileSync(file, text);
};
try {
  for (const [name, files] of selected) {
    restore();
    for (const [file, text] of Object.entries(files)) writeFileSync(file, text);
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
      console.log(
        `## ${name} | ${engine} | ${report.numFailedTests} failed, ${report.numPassedTests} passed`,
      );
      const rows = report.testResults.flatMap(({ assertionResults }) =>
        assertionResults
          .filter(({ status }) => status === 'failed')
          .map(({ fullName }) => fullName),
      );
      for (const row of rows) console.log(`   ${row}`);
    }
  }
} finally {
  restore();
}
