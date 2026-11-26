// RF-134 feature proof: the reviewer's mutations of the connected group's sheet.
// Run from the repository root:
//   node .plan/reviews/group-rtl-1/probes/mutations.mjs <engine> <scratch report path> [names, separated by ;] [test paths, separated by ;]
// Runs tests/button-group and tests/button/split-button, or the given paths, and restores the sheet.
// With the paths of the probe, it prints the probe's readings.
import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
const [engine, report, only, paths] = process.argv.slice(2);
const files = paths
  ? paths.split(';')
  : ['tests/button-group', 'tests/button/split-button'];
const SHEET =
  'packages/material-x/src/button-group/styles/connected/main.styles.css';
const original = readFileSync(SHEET, 'utf8');
const RULE = ':host(:dir(rtl)) {';
const FOCUS = '\n/*\n * A member with keyboard focus';
const [head, rest] = original.split('\n/*\n * The corners of `border-radius`');
const [rtlBlock] = rest.split(FOCUS);
const once = (from, to) => {
  if (original.split(from).length !== 2)
    throw new Error(`not one match: ${from}`);
  return original.replace(from, () => to);
};
const mutations = [
  ['no mutation', original],
  [
    'the RTL first rule on every member but the last',
    once('[data-first]:not([data-last])', ':not([data-last])'),
  ],
  [
    'the RTL last rule on the only member',
    once('[data-last]:not([data-first])', '[data-last]'),
  ],
  [
    'the RTL rules before the base rules',
    `/*\n * The corners of \`border-radius\`${rtlBlock}\n${head}${FOCUS}${rest.split(FOCUS).slice(1).join(FOCUS)}`,
  ],
];
try {
  for (const [name, text] of mutations) {
    if (only && !only.split(';').includes(name)) continue;
    if (name !== 'no mutation' && text === original)
      throw new Error(`no change: ${name}`);
    if (
      name === 'the RTL rules before the base rules' &&
      !text.startsWith('/*\n * The corners')
    )
      throw new Error('bad move');
    writeFileSync(SHEET, text);
    rmSync(report, { force: true });
    const { stdout } = spawnSync(
      'aube',
      [
        'exec',
        'vitest',
        'run',
        '-c',
        'vitest.config.ts',
        '--reporter=default',
        '--reporter=json',
        `--outputFile=${report}`,
        '--silent=false',
        ...files,
      ],
      {
        cwd: 'packages/material-x',
        env: { ...process.env, NO_COLOR: '1', MX_TEST_ENGINES: engine },
        encoding: 'utf8',
        maxBuffer: 1e8,
      },
    );
    writeFileSync(SHEET, original);
    const { numFailedTests, numPassedTests, testResults } = JSON.parse(
      readFileSync(report, 'utf8'),
    );
    console.log(
      `## ${name} | ${engine} | ${numFailedTests} failed, ${numPassedTests} passed`,
    );
    if (paths)
      for (const line of stdout.split('\n'))
        if (line.includes(' | ')) console.log(`   ${line}`);
    for (const { assertionResults } of testResults)
      for (const { status, fullName } of assertionResults)
        if (status === 'failed') console.log(`   ${fullName}`);
  }
} finally {
  writeFileSync(SHEET, original);
}
