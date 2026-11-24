// Mutations of mx-slider's second recheck: the source, or a row, or both. Run
// from the root of a scratch copy of the tree: it edits files and restores them.
// node recheck-2-mutate.ts [a part of a name]
import { execSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';

type Edit = readonly [file: string, from: string, to: string];
type Mutation = readonly [
  name: string,
  engines: readonly string[],
  ...edits: readonly Edit[],
];

const TS = 'packages/material-x/src/slider/slider.ts';
const CSS = 'packages/material-x/src/slider/styles/default/main.styles.css';
const ROWS = 'packages/material-x/tests/slider/slider.browser.test.ts';
const ALL = ['chromium', 'firefox', 'webkit'];
const TOUCH = ['chromium'];
const NOT_PRIMARY: Edit = [
  TS,
  'if (pointer === null || isPrimary) {',
  'if (pointer === null) {',
];
const HIDDEN_ONLY: Edit = [
  ROWS,
  "    // Ends the held look, which the missed release left.\n    slider.disabled = true;\n    slider.disabled = false;\n    slider.style.display = '';\n    await expectResting(slider);\n",
  "    slider.style.display = '';\n    expect(readLook(slider)).toEqual(HELD);\n",
];
const RESET_ROW: Edit = [
  TS,
  '            isUncommitted = false;\n            setPressed',
  '            setPressed',
];
const MERGES_CHANGE: Edit = [
  ROWS,
  "if (target === slider && (type === 'change' || log.at(-1) !== entry)) {",
  'if (target === slider && log.at(-1) !== entry) {',
];

const MUTATIONS: readonly Mutation[] = [
  ['none', ALL],
  // The report's seven, again.
  [
    'RC commit keeps uncommitted',
    TOUCH,
    [
      TS,
      '      isUncommitted = false;\n      this.dispatchEvent',
      '      this.dispatchEvent',
    ],
  ],
  [
    'RC commit keeps uncommitted, with the old recordEvents',
    TOUCH,
    [
      TS,
      '      isUncommitted = false;\n      this.dispatchEvent',
      '      this.dispatchEvent',
    ],
    MERGES_CHANGE,
  ],
  [
    'RC scroll not decided anew',
    TOUCH,
    [
      TS,
      "press = pointerType === 'mouse' ? 'idle' : 'pressed';",
      "press = pointerType === 'mouse' ? 'idle' : press === 'cancelled' ? press : 'pressed';",
    ],
  ],
  ['RC press keeps uncommitted', TOUCH, RESET_ROW],
  [
    'RC change does not report',
    TOUCH,
    [
      TS,
      '            reportHeld();\n            commit();',
      '            commit();',
    ],
  ],
  [
    'RC only a finger is held',
    TOUCH,
    [
      TS,
      "press = pointerType === 'mouse' ? 'idle' : 'pressed';",
      "press = pointerType === 'touch' ? 'pressed' : 'idle';",
    ],
  ],
  [
    'RC indicator takes pointer events',
    ALL,
    [
      CSS,
      '  opacity: 0;\n  pointer-events: none;\n  transition:',
      '  opacity: 0;\n  transition:',
    ],
  ],
  ['RC primary press not anew', ALL, NOT_PRIMARY],
  // The departure.
  ['row hidden only', ALL, HIDDEN_ONLY],
  ['row hidden only, primary press not anew', ALL, HIDDEN_ONLY, NOT_PRIMARY],
  [
    'disabling forgets the pointer, primary press not anew',
    ALL,
    NOT_PRIMARY,
    [
      TS,
      '      dropHeld();\n      setPressed(false);\n    };',
      '      dropHeld();\n      setPressed(false);\n      pointer = null;\n    };',
    ],
  ],
  // `change` counts.
  [
    'cancel commits twice',
    TOUCH,
    [
      TS,
      '            if (isUncommitted) {\n              commit();',
      '            if (isUncommitted) {\n              commit();\n              commit();',
    ],
  ],
  [
    'cancel commits twice, with the old recordEvents',
    TOUCH,
    [
      TS,
      '            if (isUncommitted) {\n              commit();',
      '            if (isUncommitted) {\n              commit();\n              commit();',
    ],
    MERGES_CHANGE,
  ],
  [
    'a change commits twice',
    ALL,
    [
      TS,
      '            reportHeld();\n            commit();',
      '            reportHeld();\n            commit();\n            commit();',
    ],
  ],
  [
    'a change commits twice, with the old recordEvents',
    ALL,
    [
      TS,
      '            reportHeld();\n            commit();',
      '            reportHeld();\n            commit();\n            commit();',
    ],
    MERGES_CHANGE,
  ],
  // The focus and the pen.
  [
    'the change comes before the report',
    TOUCH,
    [
      TS,
      '            reportHeld();\n            commit();',
      '            commit();\n            reportHeld();',
    ],
  ],
  [
    'a change reports twice',
    TOUCH,
    [
      TS,
      '            reportHeld();\n            commit();',
      "            const wasHeld = press === 'held';\n            reportHeld();\n            if (wasHeld) reportHeld();\n            if (wasHeld) input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));\n            commit();",
    ],
  ],
  [
    'a lift does not report',
    TOUCH,
    [
      TS,
      "            reportHeld();\n            press = 'idle';\n            pointer = null;",
      "            press = 'idle';\n            pointer = null;",
    ],
  ],
  [
    'a pen lift does not report or end the hold',
    TOUCH,
    [
      TS,
      '        pointerup: ({ pointerId }) => {\n          if (pointerId === pointer) {',
      "        pointerup: ({ pointerId, pointerType }) => {\n          if (pointerId === pointer && pointerType !== 'pen') {",
    ],
  ],
  [
    'a pen is held for ever',
    TOUCH,
    [
      TS,
      '            reportHeld();\n            commit();',
      '            commit();',
    ],
    [
      TS,
      '        pointerup: ({ pointerId }) => {\n          if (pointerId === pointer) {',
      "        pointerup: ({ pointerId, pointerType }) => {\n          if (pointerId === pointer && pointerType !== 'pen') {",
    ],
  ],
  // The second scroll.
  [
    'a cancel ends in idle',
    TOUCH,
    [TS, "            press = 'cancelled';", "            press = 'idle';"],
  ],
  [
    'the hold works once',
    TOUCH,
    [
      TS,
      "if (press === 'pressed') {\n            press = 'held';",
      "if (press === 'pressed' && !this.dataset['held']) {\n            this.dataset['held'] = '1';\n            press = 'held';",
    ],
  ],
  // The hit test.
  [
    'the text takes pointer events',
    ALL,
    [
      CSS,
      '  /* A text with no letters',
      '  pointer-events: auto;\n  /* A text with no letters',
    ],
  ],
  [
    'the spaces take pointer events',
    ALL,
    [
      CSS,
      '    flex: 1 1 max(0px, 2 * var(--_center) - 100%);',
      '    pointer-events: auto;\n    flex: 1 1 max(0px, 2 * var(--_center) - 100%);',
    ],
  ],
  [
    'hit test is not shown',
    ALL,
    [
      ROWS,
      '    expect(height).toBeGreaterThan(0);\n    expect(\n      document.elementFromPoint',
      '    expect(height).toBeGreaterThan(0);\n    expect(document.elementFromPoint(left + width / 2, top + height / 2)).not.toBe(null);\n    expect(\n      document.elementFromPoint',
    ],
  ],
];

const report = 'packages/material-x/recheck-2.json';
const only = process.argv[2];

for (const [name, engines, ...edits] of MUTATIONS) {
  if (only && !name.includes(only)) continue;

  const saved = new Map<string, string>();

  try {
    for (const [file, from, to] of edits) {
      const text = readFileSync(file, 'utf8');
      if (!saved.has(file)) saved.set(file, text);
      if (text.split(from).length !== 2) throw new Error(`${name}: ${file}`);
      writeFileSync(
        file,
        text.replace(from, () => to),
      );
    }

    for (const engine of engines) {
      const project =
        engine === 'chromium' ? '"browser"' : `"browser/${engine}"`;
      rmSync(report, { force: true });
      let out = '';

      try {
        execSync(
          `aube exec vitest run -c vitest.config.ts --reporter=json --outputFile=recheck-2.json --project ${project} --project ${project.slice(0, -1)} (${engine})" tests/slider/slider.browser.test.ts`,
          {
            cwd: 'packages/material-x',
            env: { ...process.env, MX_TEST_ENGINES: engine },
            stdio: 'pipe',
            maxBuffer: 1e8,
            timeout: 300_000,
          },
        );
      } catch (error) {
        const { stdout, stderr } = error as { stdout: Buffer; stderr: Buffer };
        out = String(stdout) + String(stderr);
      }

      let result;

      try {
        result = JSON.parse(readFileSync(report, 'utf8'));
      } catch {
        console.log(`## ${name} | ${engine} | NO REPORT ${out.slice(-600)}`);
        continue;
      }

      const failed = result.testResults
        .flatMap((r: any) => r.assertionResults)
        .filter((r: any) => r.status === 'failed');
      console.log(
        `## ${name} | ${engine} | ${failed.length} failed, ${result.numPassedTests} passed`,
      );
      for (const { fullName, failureMessages } of failed) {
        const [message = ''] = failureMessages;
        console.log(
          `   ${fullName} :: ${message
            .split('\n')[0]
            .replaceAll(/\x1b\[[0-9;]*m/gu, '')
            .slice(0, 140)}`,
        );
      }
    }
  } finally {
    for (const [file, text] of saved) writeFileSync(file, text);
  }
}

rmSync(report, { force: true });
console.log('DONE');
