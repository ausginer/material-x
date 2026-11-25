// Runs the list's rows on each mutation of the reorder look, in one engine at
// a time, and prints the rows that fail.
//
// Run from packages/material-x, with core and drag built:
//   node ../../.plan/reorder-tokens-1/probes/mutations.mjs [engine ...]
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const LIST = 'src/list/sortable-list.ts';
const CSS = 'src/list/styles/sortable/main.styles.css';
const TOKENS = 'src/list/styles/sortable/tokens.ts';
const UTILS = 'src/list/styles/utils.ts';
const NOT_COMMAND = ':host(:not(:state(command)))';
const DRAGGED = "state === 'dragged' && name !== 'container.elevation'";

const MUTATIONS = [
  ['as it is'],
  ['the sheet not adopted', [LIST, '[sortableStyles]', '[]']],
  [
    'in a key move too',
    [TOKENS, NOT_COMMAND, ':host'],
    [CSS, NOT_COMMAND, ':host'],
  ],
  ['in a key move too, the tokens alone', [TOKENS, NOT_COMMAND, ':host']],
  [
    "in a key move too, the static item's rule alone",
    [CSS, NOT_COMMAND, ':host'],
  ],
  ['on a disabled item too', [TOKENS, ':not(:state(disabled))', '']],
  ["no static item's rule", [CSS, 'mx-list-item:state(drag)', 'mx-none']],
  [
    'no important background color',
    [CSS, '  ) !important;\n  color', '  );\n  color'],
  ],
  [
    'no important color',
    [CSS, 'var(--_label-text-color) !important', 'var(--_label-text-color)'],
  ],
  [
    "the static item's rule without the consumer's color",
    [
      CSS,
      /var\(\s+--md-list-item-container-color,\s+var\(--_container-color\)\s+\)/u,
      'var(--_container-color)',
    ],
  ],
  ['every dragged token', [UTILS, DRAGGED, 'false']],
  ['no dragged elevation', [UTILS, DRAGGED, "state === 'dragged'"]],
  [
    'a translucent drop zone',
    [CSS, 'box-sizing: border-box;', 'opacity: 0.16;'],
  ],
  [
    "the drop zone without the list's shape",
    [CSS, 'var(--md-list-container-shape, var(--_container-shape))', '0'],
  ],
  [
    'the drop zone in a key move',
    [CSS, 'visibility: hidden', 'visibility: visible'],
  ],
  ...[
    'container.color',
    'container.expressive.shape',
    'drop-zone.color',
    'label-text.color',
    'leading-icon.color',
    'overline.color',
    'state-layer.color',
    'state-layer.opacity',
    'supporting-text.color',
    'trailing-icon.color',
    'trailing-supporting-text.color',
  ].map((token) => [`no ${token}`, [TOKENS, `  '${token}',\n`, '']]),
];

for (const engine of process.argv.length > 2
  ? process.argv.slice(2)
  : ['chromium', 'firefox', 'webkit']) {
  for (const [name, ...edits] of MUTATIONS) {
    const originals = new Map();
    for (const [file, from, to] of edits) {
      const source = readFileSync(file, 'utf8');
      originals.set(file, originals.get(file) ?? source);
      if (source.split(from).length !== 2) {
        throw new Error(`${name}: ${file} doesn't have ${from} once`);
      }
      writeFileSync(
        file,
        source.replace(from, () => to),
      );
    }
    try {
      const { stdout, stderr } = spawnSync(
        'aube',
        [
          'exec',
          'vitest',
          'run',
          '-c',
          'vitest.config.ts',
          ...['browser', 'spec'].flatMap((kind) =>
            [
              kind,
              `${kind}/${engine}`,
              `${kind} (${engine})`,
              `${kind}/${engine} (${engine})`,
            ].flatMap((p) => ['--project', p]),
          ),
          'tests/list',
        ],
        {
          encoding: 'utf8',
          env: { ...process.env, MX_TEST_ENGINES: engine, NO_COLOR: '1' },
        },
      );
      const lines = `${stdout}${stderr}`.split('\n');
      const total = lines.find((line) => /^ +Tests /u.test(line))?.trim();
      console.log(`## ${name} | ${engine} | ${total ?? 'no result'}`);
      for (const line of new Set(lines.filter((l) => l.includes('FAIL ')))) {
        console.log(
          `   ${line.replace(/^.*?test\.ts(?::\d+)? > /u, '').trim()}`,
        );
      }
    } finally {
      for (const [file, source] of originals) {
        writeFileSync(file, source);
      }
    }
  }
}
