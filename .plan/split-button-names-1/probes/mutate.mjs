// Run from the repository root, with the packages built:
//   node .plan/split-button-names-1/probes/mutate.mjs <engine,...>
// RF-136 and RF-138: applies each mutation to the split button's sources, runs
// its rows, and restores the sources. `main` is the merge base's source.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
const SOURCE = 'packages/material-x/src/button/split-button.ts';
const TEMPLATE = 'packages/material-x/src/button/split-button.tpl.html';
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
  [
    'open not written to aria-expanded',
    replaced(
      SOURCE,
      "        trailing.setAttribute('aria-expanded', String(open));\n",
      '',
    ),
  ],
  [
    'open on the leading button and the host too',
    replaced(
      SOURCE,
      "        trailing.setAttribute('aria-expanded', String(open));\n",
      "        for (const e of [trailing, this, this.shadowRoot!.querySelector('mx-button')!]) e.setAttribute('aria-expanded', String(open));\n",
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
  [
    'disabled not transferred',
    replaced(
      SOURCE,
      '{ ...BUTTON_ATTRS, ...DISABLEABLE_ATTRS }',
      'BUTTON_ATTRS',
    ),
  ],
];
const restore = () => {
  for (const [file, text] of Object.entries(originals))
    writeFileSync(file, text);
};
try {
  for (const [name, files] of mutations) {
    restore();
    for (const [file, text] of Object.entries(files)) writeFileSync(file, text);
    for (const engine of process.argv[2].split(',')) {
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
      const report = JSON.parse(
        readFileSync('packages/material-x/.vitest/json/output.json', 'utf8'),
      );
      console.log(
        `## ${name} | ${engine} | ${report.numFailedTests} failed, ${report.numPassedTests} passed`,
      );
      const names = report.testResults.flatMap(({ assertionResults }) =>
        assertionResults
          .filter(({ status }) => status === 'failed')
          .map(({ fullName }) => fullName),
      );
      for (const row of names) console.log(`   ${row}`);
    }
  }
} finally {
  restore();
}
