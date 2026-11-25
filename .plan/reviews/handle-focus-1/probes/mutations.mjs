// Changes one thing of the unit's source at a time, and runs the changed spec file. Restores the source each time.
//
// Run from packages/material-x: node ../../.plan/reviews/handle-focus-1/probes/mutations.mjs [engine...]
import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';

const CSS = 'src/list/styles/item/main.styles.css';
const TOKENS = 'src/list/styles/item/tokens.ts';
const RULE = '::slotted([data-handle]:focus-visible) {';
const STYLE =
  'outline: var(--_focus-indicator-thickness) solid var(--_focus-indicator-color);';
const MUTATIONS = {
  none: [CSS, (s) => s],
  'the rule out': [CSS, (s) => s.replace(RULE, '::slotted(x-none) {')],
  'clip back in .trail': [
    CSS,
    (s) =>
      s.replace(
        '.trail {\n  align-content',
        '.trail {\n  overflow: hidden;\n  align-content',
      ),
  ],
  'overflow: clip, 4px margin in .trail': [
    CSS,
    (s) =>
      s.replace(
        '.trail {\n  align-content',
        '.trail {\n  overflow: clip; overflow-clip-margin: 4px;\n  align-content',
      ),
  ],
  'clip in .lead': [
    CSS,
    (s) =>
      s.replace('.lead {\n  margin', '.lead {\n  overflow: hidden;\n  margin'),
  ],
  'clip on both slots': [
    CSS,
    (s) =>
      s.replace(
        '.lead,\n.trail {\n',
        '.lead,\n.trail {\n  overflow: hidden;\n',
      ),
  ],
  "the item's own offset": [
    CSS,
    (s) =>
      s.replace(
        'var(--_handle-focus-indicator-outline-offset)',
        'var(--_focus-indicator-outline-offset)',
      ),
  ],
  'thickness 2px': [
    CSS,
    (s) =>
      s
        .replace(RULE, `${RULE}\n  --x: 0;`)
        .replace(
          `--x: 0;\n  ${STYLE}`,
          'outline: 2px solid var(--_focus-indicator-color);',
        ),
  ],
  'primary color': [
    CSS,
    (s) =>
      s.replace(
        `${RULE}\n  ${STYLE}`,
        `${RULE}\n  outline: 3px solid rgb(1 2 3);`,
      ),
  ],
  dashed: [
    CSS,
    (s) =>
      s.replace(
        `${RULE}\n  ${STYLE}`,
        `${RULE}\n  outline: var(--_focus-indicator-thickness) dashed var(--_focus-indicator-color);`,
      ),
  ],
  'without :focus-visible': [
    CSS,
    (s) => s.replace(RULE, '::slotted([data-handle]) {'),
  ],
  ':focus': [CSS, (s) => s.replace(RULE, '::slotted([data-handle]:focus) {')],
  'without [data-handle]': [
    CSS,
    (s) => s.replace(RULE, '::slotted(:focus-visible) {'),
  ],
  '!important': [
    CSS,
    (s) =>
      s.replace(
        `${RULE}\n  ${STYLE}`,
        `${RULE}\n  ${STYLE.replace(';', ' !important;')}`,
      ),
  ],
  'lead only': [
    CSS,
    (s) => s.replace(RULE, '.lead::slotted([data-handle]:focus-visible) {'),
  ],
  'the variable out': [
    TOKENS,
    (s) =>
      s.replace(
        "  'handle.focus.indicator.outline.offset':\n    'md.sys.state.focus-indicator.outer-offset',\n",
        '',
      ),
  ],
  'align-content out of .trail': [
    CSS,
    (s) => s.replace('.trail {\n  align-content: center;', '.trail {'),
  ],
};
for (const engine of process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['chromium', 'firefox', 'webkit']) {
  console.log(`# ${engine}`);
  for (const [name, [file, change]] of Object.entries(MUTATIONS)) {
    const before = readFileSync(file, 'utf8');
    const after = change(before);
    if (name !== 'none' && after === before) {
      console.log(`${name}: NOT APPLIED`);
      continue;
    }
    writeFileSync(file, after);

    try {
      rmSync('.vitest/json/output.json', { force: true });
      execFileSync(
        'aube',
        [
          'exec',
          'vitest',
          'run',
          '-c',
          'vitest.config.ts',
          '--reporter=json',
          'tests/list/list-item.spec.browser.test.ts',
        ],
        {
          env: { ...process.env, MX_TEST_ENGINES: engine },
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
          maxBuffer: 1e8,
        },
      );
    } catch {
      // Failed rows are in the report.
    } finally {
      writeFileSync(file, before);
    }
    const json = JSON.parse(readFileSync('.vitest/json/output.json', 'utf8'));
    const failed = json.testResults
      .flatMap((f) => f.assertionResults)
      .filter((r) => r.status === 'failed');
    const kinds = {};
    for (const { fullName: n } of failed) {
      const kind =
        /render the indicator (\w+)/u.exec(n)?.[1] ??
        (/leave the outline/u.test(n)
          ? "page's rule"
          : /in the trail slot as in/u.test(n)
            ? 'edge'
            : 'other');
      kinds[kind] = (kinds[kind] ?? 0) + 1;
    }
    console.log(
      `${name}: ${json.numPassedTests} passed, ${failed.length} failed ${JSON.stringify(kinds)}`,
    );
  }
}
