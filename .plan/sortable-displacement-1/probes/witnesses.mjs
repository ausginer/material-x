// RD-60's witnesses: each mutation in turn, against tests/list/sortable-list.browser.test.ts,
// in each engine; the sources are restored after each run.
// Run from the repository root: node .plan/sortable-displacement-1/probes/witnesses.mjs <engine> <scratch report>
import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';

const [engine, report] = process.argv.slice(2);
const ROOT = 'packages/material-x';
const LIST = `${ROOT}/src/list/sortable-list.ts`;
const SORTABLE = `${ROOT}/src/list/styles/sortable/tokens.ts`;
const DEFAULT = `${ROOT}/src/list/styles/default/tokens.ts`;
const TEST = `${ROOT}/tests/list/sortable-list.browser.test.ts`;
const FILES = [LIST, SORTABLE, DEFAULT, TEST];
const original = new Map(
  FILES.map((file) => [file, readFileSync(file, 'utf8')]),
);

function edit(file, from, to) {
  const text = readFileSync(file, 'utf8');
  if (!text.includes(from)) throw new Error(`no change in ${file}: ${from}`);
  writeFileSync(file, text.replaceAll(from, to));
}

const DISPLACEMENT = `      displacement: layoutAnimation({
        timing: useCSSProps(this, LAYOUT_CSS_PROPS),
      }),
`;
const DRAG_TOKENS = `  'drag.duration': motionEffects['expressive.slow-spatial.duration'],
  'drag.easing': motionEffects['expressive.slow-spatial'],
`;

const MUTATIONS = [
  ['none', () => {}],
  ['displacement removed', () => edit(LIST, DISPLACEMENT, '')],
  [
    'timing left out',
    () => edit(LIST, DISPLACEMENT, '      displacement: layoutAnimation(),\n'),
  ],
  [
    "the landing's pair in the layout animation's place",
    () => {
      edit(
        SORTABLE,
        "motionEffects['expressive.default-spatial.duration']",
        "motionEffects['expressive.slow-spatial.duration']",
      );
      edit(
        SORTABLE,
        "motionEffects['expressive.default-spatial']",
        "motionEffects['expressive.slow-spatial']",
      );
    },
  ],
  [
    'the four properties left in the default list sheet',
    () => {
      edit(SORTABLE, "    .append('default', SPECIAL_TOKENS)\n", '');
      edit(
        DEFAULT,
        "import { t, type TokenPackage } from '@ydinjs/tproc/index.js';",
        "import { t, type TokenPackage } from '@ydinjs/tproc/index.js';\nimport { SPECIAL_TOKENS } from '../sortable/tokens.ts';",
      );
      edit(
        DEFAULT,
        '    .adjustTokens(fixFullShape)\n',
        "    .adjustTokens(fixFullShape)\n    .append('default', SPECIAL_TOKENS)\n",
      );
      edit(
        SORTABLE,
        'const SPECIAL_TOKENS = {',
        'export const SPECIAL_TOKENS = {',
      );
    },
  ],
  [
    '--_drag-duration and --_drag-easing removed from the sortable sheet',
    () => edit(SORTABLE, DRAG_TOKENS, ''),
  ],
  [
    'row 4 without the emulation',
    () => {
      edit(
        TEST,
        'await commands.emulateReducedMotion(reduced);',
        'void reduced;',
      );
      edit(TEST, 'await commands.emulateReducedMotion(!reduced);', '');
    },
  ],
];

try {
  for (const [name, mutate] of MUTATIONS) {
    mutate();
    rmSync(report, { force: true });
    spawnSync(
      'aube',
      [
        'exec',
        'vitest',
        'run',
        '-c',
        'vitest.config.ts',
        '--project',
        'browser*',
        '--reporter=json',
        `--outputFile=${report}`,
        'tests/list/sortable-list.browser.test.ts',
      ],
      {
        cwd: ROOT,
        env: { ...process.env, NO_COLOR: '1', MX_TEST_ENGINES: engine },
        encoding: 'utf8',
        maxBuffer: 1e8,
      },
    );
    for (const [file, text] of original) writeFileSync(file, text);
    const { numFailedTests, numPassedTests, numPendingTests, testResults } =
      JSON.parse(readFileSync(report, 'utf8'));
    console.log(
      `## ${name} | ${engine} | ${numFailedTests} failed, ${numPassedTests} passed, ${numPendingTests} skipped`,
    );
    for (const { assertionResults } of testResults)
      for (const { status, fullName } of assertionResults)
        if (status === 'failed') console.log(`   ${fullName}`);
  }
} finally {
  for (const [file, text] of original) writeFileSync(file, text);
}
