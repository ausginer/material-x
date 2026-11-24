// Run from the repository's root, with the packages built. Applies each mutation,
// runs the rows in each engine, one at a time, and restores the file.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
const op = 'packages/drag/src/sortable/operation.ts';
const entry = 'packages/drag/src/sortable.ts';
const behavior = 'packages/drag/src/sortable/behavior.ts';
const list = 'packages/material-x/src/list/sortable-list.ts';
const css = 'packages/material-x/src/list/styles/default/main.styles.css';
const kind = "this.#direction === null ? 'pointer' : 'command'";
const toggle =
  "toggleState(internals(this), COMMAND_STATE, kind === 'command');";
const swap = (from, to) => (s) => {
  if (s.split(from).length !== 2) throw new Error(`not one match: ${from}`);
  return s.replace(from, () => to);
};
const mutations = [
  ['drag: no mutation', op, (s) => s],
  ["drag: a pointer's kind for a command", op, swap(kind, "'pointer'")],
  ["drag: a command's kind for a pointer", op, swap(kind, "'command'")],
  [
    'drag: the kinds exchanged',
    op,
    swap(kind, "this.#direction === null ? 'command' : 'pointer'"),
  ],
  ['drag: no kind', op, swap(`${kind},\n`, '')],
  [
    'drag: onStart called at the drop too',
    op,
    swap(
      '    this.#frame.cancel();\n\n    if (isPointerOperation) {',
      '    this.start();\n    this.#frame.cancel();\n\n    if (isPointerOperation) {',
    ),
  ],
  [
    'drag: a key at the edge reports a start',
    behavior,
    swap(
      'if (direction !== null && !keyboardInsertion(snapshot, item, direction)) {\n',
      "if (direction !== null && !keyboardInsertion(snapshot, item, direction)) {\n      this.config.onStart?.(item, 'command');\n",
    ),
  ],
  [
    'drag: data-drag-ignore declines nothing',
    'packages/drag/src/kernel/gesture.ts',
    swap("'[data-drag-ignore]'", "'[data-none]'"),
  ],
  [
    'types: the kind is not exported',
    entry,
    (s) =>
      s
        .replaceAll('  SortableOperationKind,\n', '')
        .replace('  type SortableOperationKind,\n', ''),
  ],
  [
    'types: onStart without the kind',
    behavior,
    swap('item: HTMLElement, kind: SortableOperationKind', 'item: HTMLElement'),
  ],
  ['list: no mutation', list, (s) => s],
  ['list: the state is never set', list, swap(toggle, '')],
  [
    'list: no rule for the state',
    css,
    swap('visibility: hidden', 'visibility: visible'),
  ],
  [
    'list: the state is set at every start',
    list,
    swap(toggle, toggle.replace("kind === 'command'", 'true')),
  ],
  [
    'list: a pointer does not turn the state off',
    list,
    swap(toggle, `if (kind === 'command') { ${toggle} }`),
  ],
  [
    'list: the state is set for a pointer',
    list,
    swap(toggle, toggle.replace("'command'", "'pointer'")),
  ],
];
const [only = ''] = process.argv.slice(2);
for (const [name, file, mutate] of mutations) {
  if (!name.includes(only)) continue;
  const source = readFileSync(file, 'utf8');
  try {
    writeFileSync(file, mutate(source));
    if (name.startsWith('types')) {
      const { status, stdout } = spawnSync(
        'aube',
        ['exec', 'tsc', '-p', 'tsconfig.json', '--noEmit'],
        { cwd: 'packages/drag', encoding: 'utf8' },
      );
      console.log(`## ${name} | tsc exit ${status}`);
      for (const line of stdout
        .split('\n')
        .filter((l) => l.startsWith('tests/')))
        console.log(`   ${line.slice(0, 160)}`);
      continue;
    }
    const [cwd, args] = name.startsWith('drag')
      ? [
          'packages/drag',
          [
            '--project',
            'browser*',
            '--project',
            'consumer*',
            'tests/keyboard.browser',
          ],
        ]
      : [
          'packages/material-x',
          ['--project', 'browser*', 'tests/list/sortable-list.browser'],
        ];
    for (const engine of ['chromium', 'firefox', 'webkit']) {
      const { stdout, stderr } = spawnSync(
        'aube',
        ['exec', 'vitest', 'run', '-c', 'vitest.config.ts', ...args],
        {
          cwd,
          encoding: 'utf8',
          env: { ...process.env, MX_TEST_ENGINES: engine, NO_COLOR: '1' },
        },
      );
      const out = stdout + stderr;
      console.log(
        `## ${name} | ${engine} | ${/Tests\s+(.*)/u.exec(out)?.[1] ?? `no result ${out.slice(-300)}`}`,
      );
      for (const row of new Set(
        [...out.matchAll(/FAIL\s+(.*)/gu)].map((m) =>
          m[1].replace(/^\|?(\w+)[^|]*\|.*?> /u, '$1: '),
        ),
      ))
        console.log(`   ${row}`);
    }
  } finally {
    writeFileSync(file, source);
  }
}
