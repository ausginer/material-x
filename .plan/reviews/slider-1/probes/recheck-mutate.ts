// Mutations of mx-slider's remediation, none from the report. Run from packages/material-x of a scratch copy of the tree: it edits the source and restores it.
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
const TS = 'src/slider/slider.ts',
  CSS = 'src/slider/styles/default/main.styles.css',
  SZ = 'src/slider/styles/size/tokens.ts',
  HTML = 'src/slider/slider.tpl.html';
const UTILS = 'src/slider/styles/utils.ts';
const T = ['chromium'],
  A = ['chromium', 'firefox', 'webkit'];
const M: [string, string, string, string, string[]][] = [
  [
    'a held input reaches the host',
    TS,
    "press = 'held';\n            event.stopImmediatePropagation();",
    "press = 'held';",
    T,
  ],
  [
    'a lift does not end the pressed phase',
    TS,
    "reportHeld();\n            press = 'idle';\n            pointer = null;",
    'reportHeld();\n            pointer = null;',
    T,
  ],
  [
    "another pointer's move ends the pressed phase",
    TS,
    "press === 'pressed' && pointerId === pointer",
    "press === 'pressed'",
    T,
  ],
  [
    "another pointer's cancel ends the press",
    TS,
    'pointercancel: ({ pointerId }) => {\n          if (pointerId === pointer) {',
    'pointercancel: () => {\n          if (Math.random() < 2) {',
    T,
  ],
  [
    "another pointer's release ends the press",
    TS,
    'pointerup: ({ pointerId }) => {\n          if (pointerId === pointer) {',
    'pointerup: () => {\n          if (Math.random() < 2) {',
    T,
  ],
  [
    'a mouse is held',
    TS,
    "pointerType === 'mouse' ? 'idle' : 'pressed'",
    "pointerType === 'x' ? 'idle' : 'pressed'",
    A,
  ],
  [
    'a pen is not held',
    TS,
    "pointerType === 'mouse' ? 'idle' : 'pressed'",
    "pointerType !== 'touch' ? 'idle' : 'pressed'",
    A,
  ],
  [
    'a press does not reset the uncommitted slide',
    TS,
    '            isUncommitted = false;\n            setPressed',
    '            setPressed',
    T,
  ],
  [
    'a commit does not reset the uncommitted slide',
    TS,
    '      isUncommitted = false;\n      this.dispatchEvent',
    '      this.dispatchEvent',
    T,
  ],
  [
    'a change does not report the held press',
    TS,
    '            reportHeld();\n            commit();',
    '            commit();',
    T,
  ],
  [
    'a primary press does not begin anew',
    TS,
    'if (pointer === null || isPrimary) {',
    'if (pointer === null) {',
    A,
  ],
  [
    'a press after a scroll is not decided anew',
    TS,
    "press = pointerType === 'mouse' ? 'idle' : 'pressed';",
    "press = pointerType === 'mouse' ? 'idle' : press === 'cancelled' ? press : 'pressed';",
    T,
  ],
  [
    'a cancel commits a scroll too',
    TS,
    'if (isUncommitted) {',
    'if (Math.random() < 2) {',
    T,
  ],
  [
    'a cancel of a held press keeps its number',
    TS,
    "endPress();\n            press = 'cancelled';",
    "setPressed(false);\n            press = 'cancelled';",
    T,
  ],
  [
    'the report is not bubbling',
    TS,
    "new Event('input', { bubbles: true, composed: true })",
    "new Event('input', { composed: true })",
    T,
  ],
  [
    'the indicator takes pointer events',
    CSS,
    '  opacity: 0;\n  pointer-events: none;\n  transition:',
    '  opacity: 0;\n  transition:',
    A,
  ],
  [
    'the indicator is not shown on focus',
    CSS,
    ':host(:state(indicator):state(pressed)) .indicator,\n:host(:state(indicator)) .input:focus-visible ~ .indicator',
    ':host(:state(indicator):state(pressed)) .indicator',
    A,
  ],
  [
    'the indicator is shown without the attribute on a press',
    CSS,
    ':host(:state(indicator):state(pressed)) .indicator',
    ':host(:state(pressed)) .indicator',
    A,
  ],
  [
    'the indicator spans from the left only',
    CSS,
    '  inset-inline: 0;\n  opacity: 0;',
    '  inset-inline-start: 0;\n  opacity: 0;',
    A,
  ],
  [
    'isolated text, not plaintext',
    CSS,
    'unicode-bidi: plaintext',
    'unicode-bidi: isolate; direction: ltr',
    A,
  ],
  [
    'the text breaks no word',
    CSS,
    '  overflow-wrap: anywhere;\n',
    '  overflow-wrap: break-word;\n',
    A,
  ],
  [
    'the held handle is wide in a size',
    UTILS,
    "selector(':host', size, pressed)",
    "selector(':host', size, size ? null : pressed)",
    A,
  ],
];
for (const [name, file, from, to, engines] of M) {
  const src = readFileSync(file, 'utf8');
  if (src.split(from).length !== 2) {
    console.log('## NOT APPLIED', name, src.split(from).length - 1);
    continue;
  }
  writeFileSync(
    file,
    src.replace(from, () => to),
  );
  for (const e of engines) {
    let out = '';
    try {
      execSync(
        `aube exec just test --project "browser*" --project "spec*" --reporter=json --outputFile=mutation.json tests/slider/`,
        {
          env: { ...process.env, MX_TEST_ENGINES: e },
          stdio: 'pipe',
          timeout: 280000,
        },
      );
    } catch (x: any) {
      out = String(x.stdout).slice(-300);
    }
    try {
      const j = JSON.parse(readFileSync('mutation.json', 'utf8'));
      const f = j.testResults.flatMap((t: any) =>
        t.assertionResults
          .filter((a: any) => a.status === 'failed')
          .map((a: any) => a.fullName),
      );
      console.log(
        `## ${name} | ${e} | ${f.length}` +
          f
            .slice(0, 4)
            .map((x: string) => '\n   ' + x)
            .join(''),
      );
    } catch {
      console.log(`## ${name} | ${e} | NO REPORT ${out}`);
    }
    rmSync('mutation.json', { force: true });
  }
  writeFileSync(file, src);
}
console.log('DONE');
