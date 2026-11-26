// RD-58 (a) recheck: the reviewer's mutations, each restored before the next.
// Run from the repository root:
//   node .plan/reviews/axe-checks-1/probes/recheck-mutations.mjs <engine> <scratch report path> [names, separated by ;]
import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';

const [engine, report, only] = process.argv.slice(2);
const MX = 'packages/material-x';
const TEMPLATE = `${MX}/src/button/split-button.tpl.html`;
const ICON = `${MX}/src/icon/icon.ts`;
const CORE = `${MX}/src/button/ButtonCore.ts`;
const FILES = [
  'tests/axe.browser.test.ts',
  'tests/button/split-button.browser.test.ts',
  'tests/icon/icon.browser.test.ts',
  'tests/button-group/button-group-focus.spec.browser.test.ts',
  'tests/traits-baseline.browser.test.ts',
];
const originals = new Map(
  [TEMPLATE, ICON, CORE].map((file) => [file, readFileSync(file, 'utf8')]),
);
const restore = () =>
  originals.forEach((text, file) => writeFileSync(file, text));
const once = (file, from, to) => () => {
  const text = originals.get(file);
  if (text.split(from).length !== 2)
    throw new Error(`not one match in ${file}: ${from}`);
  writeFileSync(
    file,
    text.replace(from, () => to),
  );
};
const MUTATIONS = [
  ['no mutation', () => {}],
  [
    "the template's aria-hidden on the trailing icon removed",
    once(TEMPLATE, '<mx-icon aria-hidden="true">', '<mx-icon>'),
  ],
  [
    "the icon's slot not hidden (RF-137)",
    once(
      ICON,
      "this.shadowRoot!.querySelector('slot')!.setAttribute('aria-hidden', 'true');",
      '',
    ),
  ],
  [
    "useARIA's call out of ButtonCore (witness 2)",
    once(CORE, '  useARIA(host, target);\n', ''),
  ],
];
try {
  for (const [name, apply] of MUTATIONS) {
    if (only && !only.split(';').includes(name)) continue;
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
        ...FILES,
      ],
      {
        cwd: MX,
        env: { ...process.env, NO_COLOR: '1', MX_TEST_ENGINES: engine },
        encoding: 'utf8',
        maxBuffer: 1e8,
      },
    );
    restore();
    const { numFailedTests, numPassedTests, numPendingTests, testResults } =
      JSON.parse(readFileSync(report, 'utf8'));
    console.log(
      `## ${name} | ${engine} | ${numFailedTests} failed, ${numPassedTests} passed, ${numPendingTests} skipped`,
    );
    if (name === 'no mutation')
      for (const { name: file, assertionResults } of testResults) {
        const counts = {};
        for (const { status } of assertionResults)
          counts[status] = (counts[status] ?? 0) + 1;
        console.log(
          `   ${file.split(`${MX}/`)[1]}: ${Object.entries(counts)
            .map(([status, n]) => `${n} ${status}`)
            .join(', ')}`,
        );
      }
    for (const { assertionResults } of testResults)
      for (const { status, fullName, failureMessages } of assertionResults)
        if (status === 'failed')
          console.log(
            `   ${fullName}\n      ${failureMessages[0]?.split('\n')[0] ?? ''}`,
          );
  }
} finally {
  restore();
}
