// The implementer's runner (.plan/reorder-tokens-1/probes/mutations.mjs) with
// the reviewer's mutations: three of its own, repeated, and five that its list
// doesn't have.
//
// Run from packages/material-x, with core and drag built:
//   node ../../.plan/reviews/reorder-tokens-1/probes/mutations.mjs [engine ...]
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const LIST = 'src/list/sortable-list.ts';
const CSS = 'src/list/styles/sortable/main.styles.css';
const TOKENS = 'src/list/styles/sortable/tokens.ts';
const UTILS = 'src/list/styles/utils.ts';
const NOT_COMMAND = ':host(:not(:state(command)))';
const DRAGGED = "state === 'dragged' && name !== 'container.elevation'";

const PLAIN = 'src/list/list.ts';
const BOX = 'src/list/styles/item/interactive-box.styles.css';

const MUTATIONS = [
  ['as it is'],
  ['repeated: the sheet not adopted', [LIST, '[sortableStyles]', '[]']],
  [
    'repeated: in a key move too',
    [TOKENS, NOT_COMMAND, ':host'],
    [CSS, NOT_COMMAND, ':host'],
  ],
  ['repeated: every dragged token', [UTILS, DRAGGED, 'false']],
  [
    "the static item's rule on every item's host",
    [CSS, 'mx-list-item:state(drag)', ':state(drag)'],
  ],
  [
    'a plain list adopts the sheet too',
    [PLAIN, 'useListCore(this)', 'useListCore(this, [sortableStyles])'],
    [
      PLAIN,
      'import { type ListCoreCSSProperties',
      "import sortableStyles from './styles/sortable/main.css.ts' with { type: 'css' };\nimport { type ListCoreCSSProperties",
    ],
  ],
  [
    "a transition of the container's color",
    [
      BOX,
      'transition: border-radius',
      'transition: background-color 350ms, border-radius',
    ],
  ],
  [
    "the static item's rule at rest too",
    [CSS, 'mx-list-item:state(drag)', 'mx-list-item'],
  ],
  [
    'the drop zone painted in no operation',
    [CSS, 'background-color: var(--_drop-zone-color);', ''],
  ],
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
