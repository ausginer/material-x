// The review's mutations. Run from the repository root, with the packages built:
//   node .plan/reviews/split-button-names-1/probes/mutations.mjs <engine,...>
// Applies each mutation to the split button's sources, runs its rows (the last
// one: every row of the buttons and their groups), and restores the sources.
// Derived from .plan/split-button-names-1/probes/mutate.mjs.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
const SOURCE = 'packages/material-x/src/button/split-button.ts';
const TEMPLATE = 'packages/material-x/src/button/split-button.tpl.html';
const originals = Object.fromEntries(
  [SOURCE, TEMPLATE].map((file) => [file, readFileSync(file, 'utf8')]),
);
const replaced = (file, from, to) => {
  if (originals[file].split(from).length !== 2)
    throw new Error(`not one match: ${from}`);
  return { [file]: originals[file].replace(from, () => to) };
};
const ARIA = "        trailing.setAttribute('aria-expanded', String(open));\n";
const LABEL = "secondarylabel: transfer(trailing, 'aria-label'),";
const LEADING = "trailing.parentElement!.querySelector('mx-button')!";
const HOST = '(trailing.getRootNode() as ShadowRoot).host';
const mutations = [
  ['no mutation', {}],
  // The recorded mutation, whose `this` is the argument of useAttributes.
  [
    'recorded: open on the leading button and the host too',
    replaced(
      SOURCE,
      ARIA,
      "        for (const e of [trailing, this, this.shadowRoot!.querySelector('mx-button')!]) e.setAttribute('aria-expanded', String(open));\n",
    ),
  ],
  [
    'open on the leading button too',
    replaced(
      SOURCE,
      ARIA,
      `${ARIA}        ${LEADING}.setAttribute('aria-expanded', String(open));\n`,
    ),
  ],
  [
    'open on the host too',
    replaced(
      SOURCE,
      ARIA,
      `${ARIA}        ${HOST}.setAttribute('aria-expanded', String(open));\n`,
    ),
  ],
  [
    'host aria-* on the leading button',
    {
      [SOURCE]: `import { useARIA } from '@ydinjs/core/controllers/useARIA.js';\n${replaced(SOURCE, '    const innards = internals(this);', "    useARIA(this, this.shadowRoot!.querySelector('mx-button')!);\n    const innards = internals(this);")[SOURCE]}`,
    },
  ],
  [
    'secondarylabel not removed with null',
    replaced(
      SOURCE,
      LABEL,
      "secondarylabel: (_, value) => { if (value != null) trailing.setAttribute('aria-label', value); },",
    ),
  ],
  [
    'secondarylabel with a default',
    replaced(
      TEMPLATE,
      '    aria-expanded="false"\n',
      '    aria-expanded="false"\n    aria-label="More options"\n',
    ),
  ],
  ['open inverted', replaced(SOURCE, 'String(open)', 'String(!open)')],
  [
    'open never false again',
    replaced(
      SOURCE,
      ARIA,
      "        if (open) trailing.setAttribute('aria-expanded', 'true');\n",
    ),
  ],
  [
    'expanded by aria-expanded presence',
    replaced(
      SOURCE,
      ARIA,
      "        trailing.toggleAttribute('aria-expanded', open);\n",
    ),
  ],
  [
    'disabled on the trailing button only',
    replaced(
      SOURCE,
      '      secondarylabel: transfer',
      "      disabled: transfer(trailing, 'disabled'),\n      secondarylabel: transfer",
    ),
  ],
  [
    'disabled never removed',
    replaced(
      SOURCE,
      'transfer(group, attr),',
      "(_: string | null, v: string | null) => { if (v != null || attr !== 'disabled') transfer(group, attr)(_, v); },",
    ),
  ],
  [
    'a leading click is dispatched on the host when disabled',
    replaced(
      SOURCE,
      '    const innards = internals(this);',
      "    this.shadowRoot!.addEventListener('pointerup', () => { if (this.disabled) this.dispatchEvent(new Event('click')); }, true);\n    const innards = internals(this);",
    ),
  ],
];
mutations.push(
  [
    'not form-associated',
    replaced(
      SOURCE,
      'static override formAssociated = true;',
      'static override formAssociated = false;',
    ),
  ],
  [
    'disabled not transferred, not form-associated',
    {
      [SOURCE]: replaced(
        SOURCE,
        '{ ...BUTTON_ATTRS, ...DISABLEABLE_ATTRS }',
        'BUTTON_ATTRS',
      )[SOURCE].replace(
        'static override formAssociated = true;',
        'static override formAssociated = false;',
      ),
    },
  ],
  [
    'the group takes disabled only',
    replaced(
      SOURCE,
      '{ ...BUTTON_ATTRS, ...DISABLEABLE_ATTRS }',
      'DISABLEABLE_ATTRS',
    ),
    ['tests/button/', 'tests/button-group/', 'tests/traits-baseline'],
  ],
);
// the trailing-only mutation also drops the group's disabled
mutations[10][1][SOURCE] = mutations[10][1][SOURCE].replace(
  '{ ...BUTTON_ATTRS, ...DISABLEABLE_ATTRS }',
  'BUTTON_ATTRS',
);
const restore = () => {
  for (const [file, text] of Object.entries(originals))
    writeFileSync(file, text);
};
try {
  for (const [
    name,
    files,
    tests = ['tests/button/split-button.browser'],
  ] of mutations) {
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
          ...tests,
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
