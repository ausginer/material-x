// Mutates one line of mx-slider at a time, runs tests/slider and prints the rows
// that fail, per engine, with their count. Run from the repository's root:
// node .plan/slider-1/probes/mutations.ts
// The files are restored at the end.
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const DIR = 'packages/material-x/src/slider/';
const TS = `${DIR}slider.ts`;
const UTILS = `${DIR}styles/utils.ts`;
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
    'a second finger takes over a press in progress',
    TS,
    'if (pointer === null || isPrimary) {',
    'if (isPrimary || !isPrimary) {',
    TOUCH,
  ],
  [
    'a disconnection does not drop the press',
    TS,
    'disconnected: endPress',
    'disconnected: () => setPressed(false)',
    TOUCH,
  ],
  [
    'disabling does not drop the press',
    TS,
    '        if (input.disabled) {\n          endPress();',
    '        if (input.disabled) {\n          setPressed(false);',
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
  [
    'a second finger takes over a press that is not held back',
    TS,
    'if (pointer === null || isPrimary) {',
    "if (press !== 'held' || isPrimary) {",
    TOUCH,
  ],
  [
    'the indicator follows :active',
    CSS,
    ':host(:state(indicator):state(pressed)) .indicator,',
    ':host(:state(indicator)) .input:active ~ .indicator,',
    ALL,
  ],
  [
    'the handle follows :active',
    UTILS,
    "  disabled: pseudoClass('disabled'),",
    "  pressed: pseudoClass('active'),\n  disabled: pseudoClass('disabled'),",
    ALL,
    "path === 'pressed' ? PRESSED : null",
    'null',
  ],
  [
    'any button holds',
    TS,
    'setPressed(button === 0);',
    'setPressed(true);',
    ALL,
  ],
  [
    'disabling does not end the held state',
    TS,
    '        if (input.disabled) {\n          endPress();',
    '        if (input.disabled) {\n          dropHeld();',
    ALL,
  ],
  [
    'a disconnection does not end the held state',
    TS,
    'disconnected: endPress',
    'disconnected: dropHeld',
    ALL,
  ],
  [
    'a release does not end the held state',
    TS,
    'pointer = null;\n            setPressed(false);',
    'pointer = null;',
    ALL,
  ],
  [
    'a cancel does not end the held state',
    TS,
    "            endPress();\n            press = 'cancelled';",
    "            dropHeld();\n            press = 'cancelled';",
    TOUCH,
  ],
  [
    'a release does not end the press',
    TS,
    'pointer = null;\n            setPressed(false);',
    'setPressed(false);',
    TOUCH,
  ],
  [
    'a cancel does not end the press',
    TS,
    "press = 'cancelled';\n            pointer = null;",
    "press = 'cancelled';",
    TOUCH,
  ],
  [
    'a second finger ends the held state',
    TS,
    '          if (pointerId === pointer) {\n            reportHeld();',
    '          setPressed(false);\n          if (pointerId === pointer) {\n            reportHeld();',
    TOUCH,
  ],
  [
    'RC: a commit does not reset the uncommitted slide',
    TS,
    '      isUncommitted = false;\n      this.dispatchEvent',
    '      this.dispatchEvent',
    TOUCH,
  ],
  [
    'RC: a press after a scroll is not decided anew',
    TS,
    "press = pointerType === 'mouse' ? 'idle' : 'pressed';",
    "press = pointerType === 'mouse' ? 'idle' : press === 'cancelled' ? press : 'pressed';",
    TOUCH,
  ],
  [
    'RC: a press does not reset the uncommitted slide',
    TS,
    '            isUncommitted = false;\n            setPressed',
    '            setPressed',
    TOUCH,
  ],
  [
    'RC: a change does not report the held press',
    TS,
    '            reportHeld();\n            commit();',
    '            commit();',
    TOUCH,
  ],
  [
    'RC: only a finger is held',
    TS,
    "press = pointerType === 'mouse' ? 'idle' : 'pressed';",
    "press = pointerType === 'touch' ? 'pressed' : 'idle';",
    TOUCH,
  ],
  [
    'RC: a primary press does not begin anew',
    TS,
    'if (pointer === null || isPrimary) {',
    'if (pointer === null) {',
    ALL,
  ],
  [
    'RC: the indicator takes pointer events',
    CSS,
    '  opacity: 0;\n  pointer-events: none;\n  transition:',
    '  opacity: 0;\n  transition:',
    ALL,
  ],
];

const only = process.argv[2];
for (const [name, file, from, to, engines, from2, to2] of MUTATIONS) {
  if (only && !name.includes(only)) continue;
  const good = readFileSync(file, 'utf8');
  if (from && good.split(from).length !== 2) throw new Error(name);
  if (from)
    writeFileSync(
      file,
      good
        .replace(from, () => to)
        .replace(from2 ?? '', (match) => to2 ?? match),
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
