// RF-142: applies each mutation, runs sortable-list.browser and sortable-list.spec, and restores the sources.
// Run from packages/material-x: node ../../.plan/disabled-item-1/probes/mutate.mjs <engine> [name of one mutation]
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
const ITEM = 'src/list/sortable-item.ts';
const LIST = 'src/list/sortable-list.ts';
const TOKENS = 'src/list/styles/sortable/tokens.ts';
const source = Object.fromEntries(
  [ITEM, LIST, TOKENS].map((f) => [f, readFileSync(f, 'utf8')]),
);
const mutations = [
  ['no mutation'],
  [
    "the admission's rule out",
    LIST,
    '(isDisabled(item) ? null : (handleOf(item) ?? item))',
    'handleOf(item) ?? item',
  ],
  [
    "the semantics' rule out",
    ITEM,
    'const disabled = isDisabled(host);',
    'const disabled = false;',
  ],
  [
    'no observer',
    ITEM,
    "  state.observe(host, { attributeFilter: ['disabled'] });\n",
    '',
  ],
  [
    'the tab index removed instead of -1',
    ITEM,
    "disabled ? '-1' : '0'",
    "disabled ? null : '0'",
  ],
  [
    'the operation ended when its item is disabled',
    LIST,
    '        dragged = item as ControlledElement;\n',
    "        dragged = item as ControlledElement;\n        new MutationObserver(() => controller?.requestCancel()).observe(item, { attributeFilter: ['disabled'] });\n",
  ],
  [
    'the attribute read on any item',
    ITEM,
    "item.matches(':state(disabled)')",
    "item.hasAttribute('disabled')",
  ],
  [
    ':not(:state(disabled)) out',
    TOKENS,
    ':state(drag):not(:state(disabled))',
    ':state(drag)',
  ],
  [
    "a page's value replaced",
    ITEM,
    '      : !element.hasAttribute(name)',
    '      : true',
  ],
  [
    "a page's value removed on enabling",
    ITEM,
    'if (!owned.delete(name)) {',
    'if (!owned.delete(name) && !element) {',
  ],
];
const out = `${tmpdir()}/disabled-item-${process.pid}.json`;
const restore = () => {
  for (const [f, text] of Object.entries(source)) writeFileSync(f, text);
};
try {
  for (const [name, file, from, to] of mutations) {
    if (process.argv[3] && process.argv[3] !== name) continue;
    if (file) {
      if (source[file].split(from).length !== 2)
        throw new Error(`not one match: ${name}`);
      writeFileSync(
        file,
        source[file].replace(from, () => to),
      );
    }
    spawnSync(
      'aube',
      [
        'exec',
        '--',
        'vitest',
        'run',
        '-c',
        'vitest.config.ts',
        'tests/list/sortable-list',
        '--reporter=json',
        `--outputFile=${out}`,
      ],
      {
        env: { ...process.env, MX_TEST_ENGINES: process.argv[2] },
      },
    );
    restore();
    const json = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : null;
    rmSync(out, { force: true });
    console.log(
      `## ${name} | ${process.argv[2]} | ${json?.numTotalTests ? `${json.numPassedTests} passed, ${json.numFailedTests} failed` : 'no result'}`,
    );
    for (const test of json?.testResults.flatMap((f) => f.assertionResults) ??
      [])
      if (test.status === 'failed') console.log(`   ${test.fullName}`);
  }
} finally {
  restore();
}
