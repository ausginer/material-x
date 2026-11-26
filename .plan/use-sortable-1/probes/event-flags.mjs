// RF-117's witness: each flag of each dispatch, changed one at a time, run against the file that
// holds the dispatch's flags row. Run from the repository root: node .plan/use-sortable-1/probes/event-flags.mjs
// Each source is restored after its run.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const core = 'packages/core';
const mx = 'packages/material-x';
const SITES = [
  { name: 'useRovingTabindex input', pkg: core, file: 'src/controllers/useRovingTabindex.ts', test: 'tests/controllers/useRovingTabindex.browser.test.ts', text: "new Event('input', { bubbles: true, composed: true })" },
  { name: 'useRovingTabindex change', pkg: core, file: 'src/controllers/useRovingTabindex.ts', test: 'tests/controllers/useRovingTabindex.browser.test.ts', text: "new Event('change', { bubbles: true })" },
  { name: 'SwitchCore input', pkg: mx, file: 'src/button/SwitchCore.ts', test: 'tests/button/SwitchCore.browser.test.ts', text: "new Event('input', { bubbles: true, composed: true })" },
  { name: 'SwitchCore change', pkg: mx, file: 'src/button/SwitchCore.ts', test: 'tests/button/SwitchCore.browser.test.ts', text: "new Event('change', { bubbles: true })" },
  { name: 'CheckableCore change', pkg: mx, file: 'src/core/elements/CheckableCore.ts', test: 'tests/core/elements/CheckableCore.browser.test.ts', text: "new Event('change', { bubbles: true })" },
  { name: 'TextFieldCore change', pkg: mx, file: 'src/text-field/TextFieldCore.ts', test: 'tests/text-field/text-field.browser.test.ts', text: "new Event('change', { bubbles: true })" },
  { name: 'split-button secondaryaction', pkg: mx, file: 'src/button/split-button.ts', test: 'tests/button/split-button.browser.test.ts', text: "new Event('secondaryaction', { bubbles: true, composed: true })" },
  { name: 'ReorderEvent', pkg: mx, file: 'src/list/sortable-list.ts', test: 'tests/list/sortable-list.browser.test.ts', text: "super('reorder', { bubbles: true, cancelable: true, composed: true })" },
];

/** The text with `flag` flipped: an absent flag is added as true, a present one becomes false. */
function flip(text, flag) {
  const present = new RegExp(`${flag}: true`, 'u');
  if (present.test(text)) return text.replace(present, `${flag}: false`);
  return text.replace(/\{ /u, `{ ${flag}: true, `);
}

const run = (site) => {
  try {
    execFileSync('aube', ['exec', 'vitest', 'run', '--project', 'browser', site.test, '--reporter=verbose'], { cwd: site.pkg, encoding: 'utf8', stdio: 'pipe' });
    return [];
  } catch (error) {
    return [...String(error.stdout).matchAll(/^\s+× (.+?)(?: \d+ms)?$/gmu)].map((m) => m[1]);
  }
};

for (const site of SITES) {
  for (const flag of ['bubbles', 'cancelable', 'composed']) {
    const path = `${site.pkg}/${site.file}`;
    const source = readFileSync(path, 'utf8');
    if (source.split(site.text).length !== 2) throw new Error(`${site.name}: text not found once`);
    writeFileSync(path, source.replace(site.text, flip(site.text, flag)));
    try {
      const failed = run(site);
      console.log(`## ${site.name}, ${flag} flipped: ${failed.length} failed`);
      for (const name of failed) console.log(`  × ${name}`);
    } finally {
      writeFileSync(path, source);
    }
  }
}
