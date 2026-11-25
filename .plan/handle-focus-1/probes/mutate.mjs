// RF-128, the remediation's witnesses: applies each mutation to the rule of the handle's indicator, runs
// list-item.spec.browser.test.ts in each engine, and restores the sheet.
// Run from packages/material-x: node ../../.plan/handle-focus-1/probes/mutate.mjs <engine,...> [name of one mutation]
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
const file = 'src/list/styles/item/main.styles.css';
const source = readFileSync(file, 'utf8');
const SELECTOR = ':is(.lead, .trail)::slotted([data-handle]:focus-visible) {';
const at = source.indexOf(SELECTOR);
if (at < 0) throw new Error('no rule');
const selector = (to) => source.replace(SELECTOR, () => to);
const mutations = [
  ['no mutation', source],
  [
    'without :focus-visible',
    selector(':is(.lead, .trail)::slotted([data-handle]) {'),
  ],
  [
    'with :focus',
    selector(':is(.lead, .trail)::slotted([data-handle]:focus) {'),
  ],
  [
    'any child in both slots',
    selector(':is(.lead, .trail)::slotted(:focus-visible) {'),
  ],
  ['dashed', source.slice(0, at) + source.slice(at).replace('solid', 'dashed')],
  ['in every slot', selector('::slotted([data-handle]:focus-visible) {')],
];
const out = `${process.env.TMPDIR ?? '/tmp'}/handle-focus-${process.pid}.json`;
try {
  for (const [name, text] of mutations) {
    if (process.argv[3] && process.argv[3] !== name) continue;
    writeFileSync(file, text);
    for (const engine of process.argv[2].split(',')) {
      spawnSync(
        'aube',
        [
          'exec',
          '--',
          'vitest',
          'run',
          '-c',
          'vitest.config.ts',
          '--project',
          'spec*',
          'tests/list/list-item.spec.browser.test.ts',
          `--reporter=${import.meta.dirname}/messages-reporter.mjs`,
        ],
        {
          env: { ...process.env, MX_TEST_ENGINES: engine, MESSAGES_FILE: out },
        },
      );
      let result = { tests: [], unhandled: ['no report'] };
      if (existsSync(out)) {
        result = JSON.parse(readFileSync(out, 'utf8'));
        rmSync(out);
      }
      const { tests, unhandled } = result;
      const count = (state) => tests.filter((t) => t.state === state).length;
      console.log(
        `## ${name} | ${engine} | ${tests.length ? `${count('passed')} passed, ${count('failed')} failed` : 'no result'}`,
      );
      for (const message of unhandled) console.log(`   unhandled: ${message}`);
      for (const test of tests.filter((t) => t.state === 'failed')) {
        console.log(`   ${test.name}`);
        for (const m of test.messages)
          console.log(m.replaceAll(/^/gmu, '      '));
      }
    }
  }
} finally {
  writeFileSync(file, source);
}
