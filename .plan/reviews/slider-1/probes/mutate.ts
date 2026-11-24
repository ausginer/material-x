// Mutations of mx-slider. Run from packages/material-x of a scratch copy of the tree: it edits the source and restores it.
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
const TS = 'src/slider/slider.ts',
  CSS = 'src/slider/styles/default/main.styles.css',
  SZ = 'src/slider/styles/size/tokens.ts',
  HTML = 'src/slider/slider.tpl.html';
const M: [string, string, string, string][] = [
  ['touch-action removed', CSS, '  touch-action: pan-y;\n', ''],
  ['touch-action none', CSS, 'touch-action: pan-y', 'touch-action: none'],
  ['no delegatesFocus', TS, '{ delegatesFocus: true }', '{}'],
  [
    'step text passed as it is',
    TS,
    "transfer(input, 'step', (value) => Num.to(Num.from(value)))",
    "transfer(input, 'step')",
  ],
  [
    'a reset does not write the input',
    TS,
    '        this.#requested = undefined;\n        this.#write();',
    '        this.#requested = undefined;',
  ],
  [
    'equal bounds not guarded',
    TS,
    '((this.max ?? 100) - min) || 0;',
    '((this.max ?? 100) - min);',
  ],
  ['the slot is not observed', TS, '  useSlot(host, slot, resolve);\n', ''],
  [
    'no resolution on focus',
    TS,
    '  useEvents(host, { focus: resolve }, input);\n',
    '',
  ],
  ['no resolution on connection', TS, '  useConnected(host, resolve);\n', ''],
  [
    'aria-describedby not observed',
    TS,
    "['aria-label', 'aria-labelledby', 'aria-describedby']",
    "['aria-label', 'aria-labelledby']",
  ],
  [
    'aria-label not above <label>',
    TS,
    "host.hasAttribute('aria-label')",
    'false',
  ],
  [
    'an empty reference list is kept',
    TS,
    'labelledBy?.length ? labelledBy : null',
    'labelledBy',
  ],
  ['handle exposed', HTML, ' aria-hidden="true"', ''],
  [
    'change composed',
    TS,
    "new Event('change', { bubbles: true })",
    "new Event('change', { bubbles: true, composed: true })",
  ],
  [
    'the restoration fires no input',
    TS,
    "            input.dispatchEvent(\n              new Event('input', { bubbles: true, composed: true }),\n            );\n",
    '            this.#requested = input.valueAsNumber;\n            this.#sync();\n',
  ],
  [
    'the restoration dispatches without a difference',
    TS,
    'if (input.value !== pressedValue) {',
    'if (pressedValue) {',
  ],
  [
    'the indicator is not shown on focus',
    CSS,
    '.input:is(:active, :focus-visible) ~ .handle::after',
    '.input:is(:active) ~ .handle::after',
  ],
  ['the indicator has no z-index', CSS, '  z-index: 1;\n', ''],
  [
    'no @starting-style',
    CSS,
    '\n  @starting-style {\n    opacity: 0;\n  }\n',
    '',
  ],
  [
    'active track at the left',
    CSS,
    '    inset-inline-start: 0;\n    inline-size: var(--_active-track-size)',
    '    left: 0;\n    inline-size: var(--_active-track-size)',
  ],
  [
    'the handle takes pointer events',
    CSS,
    '  opacity: var(--_handle-opacity, 1);\n  pointer-events: none;',
    '  opacity: var(--_handle-opacity, 1);',
  ],
  [
    'the native range is opaque',
    CSS,
    '  opacity: 0;\n  touch-action',
    '  touch-action',
  ],
  [
    'no forced colors',
    CSS,
    '@media (forced-colors: active)',
    '@media (forced-colors: none) and (forced-colors: active)',
  ],
  [
    'large reads the medium set',
    SZ,
    '.set(`md.comp.slider.${size}`)',
    ".set(`md.comp.slider.${size === 'large' ? 'medium' : size}`)",
  ],
  [
    'the midpoint is not the default after null',
    TS,
    "requested == null ? ''",
    "requested === undefined ? ''",
  ],
  [
    'valuetext does not update the indicator',
    TS,
    '        this.#writeIndicator();\n      },\n      error:',
    '      },\n      error:',
  ],
];
for (const [name, file, from, to] of M) {
  const src = readFileSync(file, 'utf8');
  if (src.split(from).length !== 2) {
    console.log('## NOT APPLIED', name, src.split(from).length - 1);
    continue;
  }
  writeFileSync(
    file,
    src.replace(from, () => to),
  );
  for (const e of ['chromium', 'firefox', 'webkit']) {
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
