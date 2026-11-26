// Run from the repository root, with the packages built:
//   node .plan/list-selected-1/probes/mutate.mjs <engine> <path of a scratch report>
// RF-132: applies each mutation to the sources, runs the rows, and restores the
// sources. Core is rebuilt around the mutation that takes main's sources.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
const [engine, report] = process.argv.slice(2);
const MAIN = 'ee0afea12';
const LIST = 'packages/material-x/src/list/';
const CORE = `${LIST}ListInteractiveItemCore.ts`;
const BUTTON = `${LIST}list-button-item.ts`;
const LINK = `${LIST}list-link-item.ts`;
const SELECTABLE = 'packages/core/src/traits/selectable.ts';
const FILES = [CORE, BUTTON, LINK, SELECTABLE];
const originals = new Map(FILES.map((f) => [f, readFileSync(f, 'utf8')]));
const restore = () => originals.forEach((text, f) => writeFileSync(f, text));
const buildCore = () =>
  execFileSync('aube', ['exec', 'just', 'build'], {
    cwd: 'packages/core',
    stdio: 'ignore',
  });
const replace = (file, from, to) => () => {
  const text = originals.get(file);
  if (text.split(from).length !== 2)
    throw new Error(`not one match in ${file}: ${from}`);
  writeFileSync(file, text.replace(from, to));
};
const WRITE = "setOwnARIA(target, 'aria-current', newValue ? current : null);";
const write = (to) => replace(CORE, WRITE, to);
const mutations = [
  ['no mutation', () => {}],
  [
    "main's sources",
    () => {
      for (const f of FILES)
        writeFileSync(
          f,
          execFileSync('git', ['show', `${MAIN}:${f}`], { encoding: 'utf8' }),
        );
      buildCore();
    },
    buildCore,
  ],
  [
    'not selected writes "false"',
    write("setOwnARIA(target, 'aria-current', newValue ? current : 'false');"),
  ],
  ['nothing is written', write('')],
  ['a button item says "page"', replace(BUTTON, "'true')", "'page')")],
  ['a link item says "true"', replace(LINK, "'page',", "'true',")],
  [
    'the value is written past setOwnARIA',
    write(
      "if (newValue) target.setAttribute('aria-current', current); else target.removeAttribute('aria-current');",
    ),
  ],
  [
    'aria-pressed in its place',
    write("setOwnARIA(target, 'aria-pressed', newValue ? 'true' : null);"),
  ],
  [
    'aria-selected beside it',
    write(`${WRITE} setOwnARIA(target, 'aria-selected', String(newValue));`),
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
          'tests/list/list-item-selected',
          'tests/aria-own-value',
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
