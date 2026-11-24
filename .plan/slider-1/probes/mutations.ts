// Mutates one line of mx-slider at a time, runs tests/slider and prints the rows
// that fail, per engine, with their count. Run from the repository's root:
// node .plan/slider-1/probes/mutations.ts
// The files are restored at the end.
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const DIR = 'packages/material-x/src/slider/';
const TS = `${DIR}slider.ts`;
const CSS = `${DIR}styles/default/main.styles.css`;
const HTML = `${DIR}slider.tpl.html`;
const ALL = ['chromium', 'firefox', 'webkit'];
const TOUCH = ['chromium'];
const MUTATIONS = [
  ['none', TS, '', '', ALL],
  [
    'the press is not held',
    TS,
    "if (press === 'pressed') {\n            press = 'held';",
    "if (Math.random() > 2) {\n            press = 'held';",
    TOUCH,
  ],
  [
    "the press's number is taken as asked for",
    TS,
    "press = 'held';\n            event",
    "press = 'held';\n            this.#requested = input.valueAsNumber;\n            event",
    TOUCH,
  ],
  [
    'the number at pointerdown is restored',
    TS,
    "press = 'idle';\n        this.#write();",
    "press = 'idle';\n        this.#requested = Number(pressedValue);\n        this.#write();",
    TOUCH,
  ],
  [
    "the engine's change after a cancel is not dropped",
    TS,
    "          if (press !== 'cancelled') {\n            reportHeld();\n            commit();\n          }",
    '          reportHeld();\n          commit();',
    TOUCH,
  ],
  [
    'the first input is also held after a move',
    TS,
    "if (press === 'pressed' && pointerId === pointer) {",
    'if (Math.random() > 2) {',
    TOUCH,
  ],
  [
    'a cancelled slide is not committed',
    TS,
    'if (isUncommitted) {',
    'if (Math.random() > 2) {',
    TOUCH,
  ],
  [
    'a key does not end a cancelled press',
    TS,
    "          if (press === 'cancelled') {\n            press = 'idle';\n          }",
    '',
    TOUCH,
  ],
  [
    'a second finger takes over a held press',
    TS,
    "if (press !== 'held' || isPrimary) {",
    'if (isPrimary || !isPrimary) {',
    TOUCH,
  ],
  [
    'a disconnection does not drop the press',
    TS,
    '      disconnected: dropHeld,\n',
    '',
    TOUCH,
  ],
  [
    'disabling does not drop the press',
    TS,
    '        if (input.disabled) {\n          dropHeld();\n        }\n',
    '',
    TOUCH,
  ],
  [
    "value reads the input's number",
    TS,
    'return Number(this.#shown);',
    'return this.#input.valueAsNumber;',
    TOUCH,
  ],
  [
    "the indicator shows the input's number",
    TS,
    'this.valuetext ?? this.#shown',
    'this.valuetext ?? this.#input.value',
    TOUCH,
  ],
  [
    'the dispatched input is not composed',
    TS,
    'composed: true',
    'composed: false',
    TOUCH,
  ],
  [
    'a tap reports a number that is shown',
    TS,
    'if (input.value !== this.#shown) {',
    'if (Math.random() < 2) {',
    TOUCH,
  ],
  ['no touch-action', CSS, '  touch-action: pan-y;\n', '', ALL],
  ['no guard for equal bounds', TS, ' || 0;', ';', ALL],
  [
    'an empty aria-label is a source',
    TS,
    'host.ariaLabel?.trim()',
    "host.hasAttribute('aria-label')",
    ALL,
  ],
  [
    'a white-space aria-label is a source',
    TS,
    'host.ariaLabel?.trim()',
    'host.ariaLabel',
    ALL,
  ],
  ['no aria-hidden', HTML, ' aria-hidden="true"', '', TOUCH],
  [
    'no @starting-style',
    CSS,
    '  @starting-style {\n    opacity: 0;\n  }\n',
    '',
    ALL,
  ],
  ['no unicode-bidi', CSS, '  unicode-bidi: plaintext;\n', '', ALL],
  ['the spaces do not shrink', CSS, 'flex: 1 1 max', 'flex: 1 0 max', ALL],
  [
    'no basis at the start',
    CSS,
    'flex: 1 1 max(0px, 2 * var(--_center) - 100%);',
    'flex: 1 1 0px;',
    ALL,
  ],
  [
    'no basis at the end',
    CSS,
    'flex-basis: max(0px, 100% - 2 * var(--_center));',
    'flex-basis: 0px;',
    ALL,
  ],
  ['no max-inline-size', CSS, '  max-inline-size: 100%;\n', '', ALL],
  [
    'no box-sizing on the text',
    CSS,
    '.text {\n  box-sizing: border-box;',
    '.text {',
    ALL,
  ],
  ["the page's white-space", CSS, '  white-space: normal;\n', '', ALL],
  ['no overflow-wrap', CSS, '  overflow-wrap: anywhere;\n', '', ALL],
  [
    "the input's opacity",
    CSS,
    '  opacity: 0;\n  touch-action',
    '  touch-action',
    ALL,
  ],
  [
    'the indicator is shown at rest',
    CSS,
    '.indicator {\n  display: none;',
    '.indicator {\n  display: flex;',
    ALL,
  ],
  [
    'the text is written without the attribute',
    TS,
    'if (this.indicator) {',
    'if (Math.random() < 2) {',
    ALL,
  ],
];

const only = process.argv[2];
for (const [name, file, from, to, engines] of MUTATIONS) {
  if (only && !name.includes(only)) continue;
  const good = readFileSync(file, 'utf8');
  if (from && good.split(from).length !== 2) throw new Error(name);
  if (from)
    writeFileSync(
      file,
      good.replace(from, () => to),
    );
  try {
    for (const engine of engines) {
      const suffix = engine === 'chromium' ? '' : `/${engine}`;
      const projects = ['browser', 'spec']
        .flatMap((p) => [p + suffix, `${p}${suffix} (${engine})`])
        .map((p) => `--project "${p}"`)
        .join(' ');
      const report = 'packages/material-x/.vitest/json/output.json';
      rmSync(report, { force: true });
      let out = '';
      try {
        execSync(
          `aube exec vitest run -c vitest.config.ts --reporter=json ${projects} tests/slider`,
          {
            cwd: 'packages/material-x',
            env: { ...process.env, MX_TEST_ENGINES: engine },
            stdio: 'pipe',
            maxBuffer: 1e8,
          },
        );
      } catch (error) {
        out = String(error.stdout) + String(error.stderr);
      }
      if (!existsSync(report)) {
        console.log(`## ${name} | ${engine} | NO RESULT ${out.slice(-400)}`);
        continue;
      }
      const { numPassedTests, testResults } = JSON.parse(
        readFileSync(report, 'utf8'),
      );
      const failed = testResults
        .flatMap((r) => r.assertionResults)
        .filter((r) => r.status === 'failed');
      console.log(
        `## ${name} | ${engine} | ${failed.length} failed, ${numPassedTests} passed`,
      );
      for (const { fullName } of failed) console.log(fullName);
    }
  } finally {
    writeFileSync(file, good);
  }
}
