// Run from packages/material-x, with a clean src:
//   node ../../.plan/card-1/probes/mutate-4.mjs <engine,...> [name]
// Applies each mutation to the source, runs the rows, and restores the file.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
const hostBox = 'src/core/styles/elevation/host-box.styles.css';
const outlined = 'src/card/styles/outlined/main.styles.css';
const main = 'src/card/styles/default/main.styles.css';
const tokens = 'src/card/styles/default/tokens.ts';
const list =
  'var(--_elevation-umbra), var(--_elevation-penumbra),\n    var(--_elevation-ambient)';
const padding =
  '  box-sizing: border-box !important;\n  padding: var(--md-card-padding, 16px) !important;\n';
const replaced = (from, to) => (source) => {
  if (!source.includes(from)) throw new Error(`no match: ${from}`);
  return source.replaceAll(from, () => to);
};
const mutations = [
  ['no mutation', hostBox, (source) => source],
  [
    'outline on the slot',
    outlined,
    replaced(
      ':host(:state(outlined):not(:focus-visible)) {',
      ':host(:state(outlined)) slot {',
    ),
  ],
  [
    'outline without !important',
    outlined,
    replaced('--_outline-color)) !important', '--_outline-color))'),
  ],
  ['no !important', outlined, replaced(' !important', '')],
  ['no :not(:focus-visible)', outlined, replaced(':not(:focus-visible)', '')],
  [
    'outline drawn outside',
    outlined,
    replaced(
      '  outline-offset: calc(-1 * var(--_outline-width)) !important;\n',
      '',
    ),
  ],
  [
    'own outline color ignored',
    outlined,
    replaced(
      'var(--md-card-outline-color, var(--_outline-color))',
      'var(--_outline-color)',
    ),
  ],
  [
    'own shape ignored',
    main,
    replaced(
      'var(--md-card-container-shape, var(--_container-shape))',
      'var(--_container-shape)',
    ),
  ],
  ['padding without !important', main, replaced('16px) !important', '16px)')],
  [
    'padding on a block slot',
    main,
    (source) =>
      replaced(
        'slot {\n',
        'slot {\n  display: block;\n  flex: 1 0 auto;\n  padding: var(--md-card-padding, 16px);\n',
      )(
        replaced(
          '  display: flow-root;\n',
          '  display: flex;\n  flex-direction: column;\n',
        )(replaced(padding, '')(source)),
      ),
  ],
  ['slot a block', main, replaced('slot {\n', 'slot {\n  display: block;\n')],
  [
    'slot that scrolls',
    main,
    (source) =>
      replaced(
        'slot {\n',
        'slot {\n  display: block;\n  box-sizing: border-box;\n  block-size: 100%;\n  overflow: inherit;\n  padding: var(--md-card-padding, 16px);\n',
      )(replaced(padding, '')(source)),
  ],
  ['host a block', main, replaced('flow-root', 'block')],
  [
    'no box-sizing',
    main,
    replaced('  box-sizing: border-box !important;\n', ''),
  ],
  [
    'box-sizing without !important',
    main,
    replaced('border-box !important', 'border-box'),
  ],
  [
    'host clips',
    main,
    replaced(
      '  display: flow-root;\n',
      '  display: flow-root;\n  overflow: clip;\n',
    ),
  ],
  [
    'own padding ignored',
    main,
    replaced('var(--md-card-padding, 16px)', '16px'),
  ],
  ['no --_level reset', main, replaced('  --_level: 0;\n', '')],
  [
    'no --_container-color reset',
    main,
    replaced('  --_container-color: initial;\n', ''),
  ],
  [
    'outline-offset without !important',
    outlined,
    replaced(
      'calc(-1 * var(--_outline-width)) !important',
      'calc(-1 * var(--_outline-width))',
    ),
  ],
  [
    'outline on every variant',
    outlined,
    replaced(':host(:state(outlined):not', ':host(:not'),
  ],
  [':not(:focus)', outlined, replaced(':not(:focus-visible)', ':not(:focus)')],
  [
    'no umbra',
    hostBox,
    replaced(list, 'var(--_elevation-penumbra), var(--_elevation-ambient)'),
  ],
  [
    'no penumbra',
    hostBox,
    replaced(list, 'var(--_elevation-umbra), var(--_elevation-ambient)'),
  ],
  [
    'no ambient',
    hostBox,
    replaced(list, 'var(--_elevation-umbra), var(--_elevation-penumbra)'),
  ],
  [
    'another order',
    hostBox,
    replaced(
      list,
      'var(--_elevation-penumbra), var(--_elevation-umbra), var(--_elevation-ambient)',
    ),
  ],
  [
    'box on ::before',
    hostBox,
    (source) => `${source}\n:host::before { content: ''; }\n`,
  ],
  [
    'box on ::after',
    hostBox,
    (source) => `${source}\n:host::after { content: ''; }\n`,
  ],
  ['no position on the host', hostBox, replaced('  position: relative;\n', '')],
  [
    'no shadow.color in the package',
    tokens,
    replaced(
      "  'shadow.color': CSSVariable.ref('container.shadow-color'),\n",
      '',
    ),
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
          'browser*',
          '--project',
          'spec*',
          'tests/card/card',
          'tests/core/elevation.spec',
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
