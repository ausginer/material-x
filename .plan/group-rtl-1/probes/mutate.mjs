// Run from the repository root, with the packages built:
//   node .plan/group-rtl-1/probes/mutate.mjs <engine> <path of a scratch report>
// RF-134: applies each mutation to the connected group's sheet or to core's
// arrow keys, runs the rows of RTL, and restores the sources. Core is rebuilt
// around its mutation.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
const [engine, report] = process.argv.slice(2);
const MAIN = 'ee0afea12';
const SHEET =
  'packages/material-x/src/button-group/styles/connected/main.styles.css';
const HOOK = 'packages/core/src/controllers/useRovingTabindex.ts';
const originals = new Map(
  [SHEET, HOOK].map((file) => [file, readFileSync(file, 'utf8')]),
);
const restore = () =>
  originals.forEach((text, file) => writeFileSync(file, text));
const buildCore = () =>
  execFileSync('aube', ['exec', 'just', 'build'], {
    cwd: 'packages/core',
    stdio: 'ignore',
  });
const replaced = (file, from, to) => {
  const text = originals.get(file);
  if (text.split(from).length !== 2)
    throw new Error(`not one match in ${file}: ${from}`);
  return text.replace(from, () => to);
};
const sheet = (text) => () => writeFileSync(SHEET, text);
const swap = (from, to) => sheet(replaced(SHEET, from, to));
const RULE = ':host(:dir(rtl)) {';
const [before, rtl] = originals.get(SHEET).split(RULE);
const mutations = [
  ['no mutation', () => {}],
  [
    "main's sheet",
    sheet(
      execFileSync('git', ['show', `${MAIN}:${SHEET}`], { encoding: 'utf8' }),
    ),
  ],
  ['the directions reversed', swap(RULE, ':host(:dir(ltr)) {')],
  ['always reversed', swap(RULE, ':host {')],
  ['only a dir attribute on the group', swap(RULE, ":host([dir='rtl']) {")],
  [
    'no rule for the first button',
    swap('[data-first]:not([data-last])', '[data-none]'),
  ],
  [
    'no rule for the last button',
    swap('[data-last]:not([data-first])', '[data-none]'),
  ],
  [
    'the first-button rule without [data-first]',
    swap('[data-first]:not([data-last])', ':not([data-last])'),
  ],
  [
    'the last-button rule without :not([data-first])',
    swap('[data-last]:not([data-first])', '[data-last]'),
  ],
  [
    "the member's direction in place of the group's",
    sheet(
      `${before}:host {${rtl
        .replace('[data-first]:not', '[data-first]:dir(rtl):not')
        .replace('[data-last]:not', '[data-last]:dir(rtl):not')}`,
    ),
  ],
  [
    'the override ignored in RTL',
    sheet(
      `${before}${RULE}${rtl.replaceAll('var(--_inner-corner)', 'var(--_inner-corner-corner-size)')}`,
    ),
  ],
  [
    'the arrow keys reversed',
    () => {
      writeFileSync(
        HOOK,
        replaced(HOOK, "direction === 'rtl'", "direction !== 'rtl'"),
      );
      buildCore();
    },
    buildCore,
  ],
  [
    'the arrow keys without a direction',
    () => {
      writeFileSync(
        HOOK,
        replaced(
          HOOK,
          "getComputedStyle(host).direction === 'rtl'",
          "getComputedStyle(host).direction === 'none'",
        ),
      );
      buildCore();
    },
    buildCore,
  ],
];
try {
  for (const [name, apply, after] of mutations) {
    try {
      apply();
      rmSync(report, { force: true });
      spawnSync(
        'aube',
        [
          'exec',
          'vitest',
          'run',
          '-c',
          'vitest.config.ts',
          '--reporter=json',
          `--outputFile=${report}`,
          'tests/button-group/button-group-rtl',
        ],
        {
          cwd: 'packages/material-x',
          env: { ...process.env, NO_COLOR: '1', MX_TEST_ENGINES: engine },
          encoding: 'utf8',
          maxBuffer: 1e8,
        },
      );
      const { numFailedTests, numPassedTests, testResults } = JSON.parse(
        readFileSync(report, 'utf8'),
      );
      if (!numPassedTests) throw new Error(`no rows: ${name}`);
      console.log(
        `## ${name} | ${engine} | ${numFailedTests} failed, ${numPassedTests} passed`,
      );
      for (const { assertionResults } of testResults)
        for (const { status, fullName } of assertionResults)
          if (status === 'failed') console.log(`   ${fullName}`);
    } finally {
      restore();
      after?.();
    }
  }
} finally {
  restore();
}
