// Run from packages/material-x, with a clean src:
//   node ../../.plan/focus-cover-1/probes/mutate.mjs <engine,...> [name]
// Applies each mutation to the source, runs the rows, and restores the file.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
const list = 'src/list/styles/utils.ts';
const interactive = 'src/list/styles/item/interactive-box.styles.css';
const fixed = 'src/list/styles/item/static-box.styles.css';
const core = 'src/list/ListInteractiveItemCore.ts';
const item = 'src/list/list-item.ts';
const button = 'src/button/styles/default/main.styles.css';
const group = 'src/button-group/styles/connected/main.styles.css';
const replaced = (from, to) => (source) => {
  if (source.split(from).length !== 2)
    throw new Error(`not one match: ${from}`);
  return source.replace(from, () => to);
};
const sharedSheet = (box) => (source) =>
  `import focusStyles from '../core/styles/focus/focus.css.ts' with { type: 'css' };\n${replaced(`[${box}]`, `[${box}, focusStyles]`)(source)}`;
const outlineOffset =
  '  outline-offset: var(--_focus-indicator-outline-offset);\n';
const outline =
  '  outline: var(--_focus-indicator-thickness) solid var(--_focus-indicator-color);\n';
const zIndex = '  z-index: var(--_focus-z-index);\n';
const mutations = [
  ['no mutation', list, (source) => source],
  ...['color', 'outline.offset', 'thickness'].map((name) => [
    `list: ${name} misspelled`,
    list,
    replaced(`'focus.indicator.${name}'`, `'focus-indicator.${name}'`),
  ]),
  [
    'list: the shared sheet after the interactive box',
    core,
    sharedSheet('interactiveBoxStyles'),
  ],
  [
    'list: the shared sheet after the static box',
    item,
    sharedSheet('staticBoxStyles'),
  ],
  [
    'list: no outline on the interactive box',
    interactive,
    replaced(outline, ''),
  ],
  ['list: no outline on the static box', fixed, replaced(outline, '')],
  [
    'list: 2px outside, interactive',
    interactive,
    replaced(outlineOffset, '  outline-offset: 2px;\n'),
  ],
  [
    'list: 2px outside, static',
    fixed,
    replaced(outlineOffset, '  outline-offset: 2px;\n'),
  ],
  ['group: the button does not read the z-index', button, replaced(zIndex, '')],
  [
    'group: the group sets no z-index',
    group,
    replaced('    --_focus-z-index: 1;\n', ''),
  ],
  ['group: no isolation', group, replaced('  isolation: isolate;\n', '')],
  [
    'group: every focused button is raised',
    button,
    replaced(zIndex, '  z-index: 1;\n'),
  ],
];
const [engines, only] = process.argv.slice(2);
for (const [name, file, mutate] of mutations) {
  if (only && name !== only) continue;
  const source = readFileSync(file, 'utf8');
  try {
    writeFileSync(file, mutate(source));
    for (const engine of engines.split(',')) {
      const { stdout, stderr } = spawnSync(
        'aube',
        [
          'exec',
          'vitest',
          'run',
          '-c',
          'vitest.config.ts',
          '--project',
          'spec*',
          'tests/list/list-item.spec',
          'tests/button-group/button-group-focus.spec',
        ],
        {
          env: { ...process.env, MX_TEST_ENGINES: engine, NO_COLOR: '1' },
          encoding: 'utf8',
        },
      );
      const out = stdout + stderr;
      console.log(
        `## ${name} | ${engine} | ${/Tests\s+(.*)/u.exec(out)?.[1] ?? 'no result'}`,
      );
      for (const row of new Set(
        [...out.matchAll(/FAIL\s+(.*)/gu)].map((m) =>
          m[1].replace(/^.*?> /u, ''),
        ),
      ))
        console.log(`   ${row}`);
    }
  } finally {
    writeFileSync(file, source);
  }
}
