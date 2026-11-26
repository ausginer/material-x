// The witnesses of RD-57's implementation. Run from packages/material-x on a clean tree:
// node ../../.plan/axe-checks-1/probes/witnesses.mjs
// Each change is reverted before the next one.
// An argument runs only the witnesses whose name starts with it, such as `2.`.
import { spawnSync } from 'node:child_process';
import { readFile, rm, writeFile } from 'node:fs/promises';

const TEST = 'tests/axe.browser.test.ts';
const CORE = 'src/button/ButtonCore.ts';
const FAB = 'src/fab/fab.ts';
const NEW = 'src/icon/witness.ts';

/** Replaces exactly one occurrence of `from`. */
function replace(source, from, to) {
  if (source.split(from).length !== 2) throw new Error(`not once: ${from}`);
  return source.replace(from, () => to);
}

const WITNESSES = [
  [
    '1a. a listed line removed: radio, checked',
    TEST,
    (s) =>
      s.replace(
        /(state: 'checked',\s*html: '<mx-radio checked[^\n]*\n)\s*violations: RADIO_LABEL,\n/u,
        '$1',
      ),
  ],
  [
    '1b. a line added to a clean state: mx-button, disabled',
    TEST,
    (s) =>
      replace(
        s,
        `'<mx-button disabled>Go</mx-button>' }`,
        `'<mx-button disabled>Go</mx-button>', violations: RADIO_LABEL }`,
      ),
  ],
  [
    "2. useARIA's call out of ButtonCore",
    CORE,
    (s) => s.replace(/^\s*useARIA\([^;]*;\n/mu, ''),
  ],
  [
    "2b. the FAB's own useARIA call out",
    FAB,
    (s) => replace(s, '    useARIA(this, target);\n', ''),
  ],
  [
    '3. axe.run replaced by an empty result',
    TEST,
    (s) =>
      s.replace(
        /await axe\.run\(fixture, \{[\s\S]*?\n {2}\}\);/u,
        '{ passes: [], violations: [], incomplete: [] } as Record<string, Result[]>;',
      ),
  ],
  [
    '4. a new element in files.json, with no row',
    'files.json',
    (s) => replace(s, '"icon/icon",', '"icon/icon",\n    "icon/witness",'),
  ],
  [
    '5. without the glyph file',
    TEST,
    (s) =>
      replace(
        s,
        'document.fonts.add(await arrow.load());',
        'await arrow.load();',
      ),
  ],
];

await writeFile(
  NEW,
  "customElements.define('mx-witness', class extends HTMLElement {});\n",
);
const [only = ''] = process.argv.slice(2);
for (const [name, file, mutate] of WITNESSES.filter(([name]) =>
  name.startsWith(only),
)) {
  const source = await readFile(file, 'utf8');
  const mutated = mutate(source);
  if (mutated === source) throw new Error(`no change: ${name}`);
  let run;
  try {
    await writeFile(file, mutated);
    run = spawnSync(
      'aube',
      [
        'exec',
        'vitest',
        'run',
        '-c',
        'vitest.config.ts',
        '--project',
        'browser',
        TEST,
        '--reporter=verbose',
      ],
      { encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } },
    );
  } finally {
    await writeFile(file, source);
  }
  const lines = `${run.stdout}\n${run.stderr}`
    .replaceAll(/\u001B\[\d+m/gu, '')
    .split('\n');
  const keep = lines.filter((l) =>
    /^\s*×|^AssertionError|^\s*[+-] {2,}["']|^\s*Tests /u.test(l),
  );
  console.log(`## ${name}\n${keep.join('\n')}\n`);
}
await rm(NEW);
