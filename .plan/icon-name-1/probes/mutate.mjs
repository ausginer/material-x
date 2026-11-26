// Run from the repository root, with the packages built:
//   node .plan/icon-name-1/probes/mutate.mjs <engine,...>
// RF-137: applies each mutation to its source, runs the icon's and the split
// button's rows, and restores the source. `main` is the merge base's source.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
const ICON = 'packages/material-x/src/icon/icon.tpl.html';
const SOURCE = 'packages/material-x/src/icon/icon.ts';
const SPLIT = 'packages/material-x/src/button/split-button.tpl.html';
const REPORT = 'packages/material-x/.vitest/json/output.json';
const MAIN = '8bed561de';
const originals = new Map(
  [ICON, SOURCE, SPLIT].map((file) => [file, readFileSync(file, 'utf8')]),
);
const main = (file) =>
  execFileSync('git', ['show', `${MAIN}:${file}`], { encoding: 'utf8' });
const CORE = 'useCore(this, [template], {}, [iconStyles]);';
const withHost = (code) => {
  const source = originals.get(SOURCE);
  if (source.split(CORE).length !== 2) throw new Error('not once');
  return source.replace(CORE, `${CORE} ${code}`);
};
const plain = '<slot></slot>\n';
const mutations = [
  ['no mutation', {}],
  ['main', { [ICON]: main(ICON), [SPLIT]: main(SPLIT) }],
  ['no aria-hidden on the span', { [ICON]: '<span><slot></slot></span>\n' }],
  ['aria-hidden on the slot', { [ICON]: '<slot aria-hidden="true"></slot>\n' }],
  [
    "the internals' ariaHidden",
    {
      [ICON]: plain,
      [SOURCE]: `import { internals } from '@ydinjs/core/element.js';\n${withHost("internals(this).ariaHidden = 'true';")}`,
    },
  ],
  [
    'aria-hidden on the host too',
    {
      [SOURCE]: withHost(
        "queueMicrotask(() => this.setAttribute('aria-hidden', 'true'));",
      ),
    },
  ],
  [
    "the icon's text is its name",
    {
      [SOURCE]: withHost(
        "queueMicrotask(() => { if (!this.ariaLabel) { this.role = 'img'; this.ariaLabel = this.textContent; } });",
      ),
    },
  ],
];
const restore = () => {
  for (const [file, text] of originals) writeFileSync(file, text);
};
try {
  for (const [name, files] of mutations) {
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
          'tests/icon',
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
      for (const { assertionResults } of report.testResults)
        for (const { status, fullName } of assertionResults)
          if (status === 'failed') console.log(`   ${fullName}`);
    }
  }
} finally {
  restore();
}
