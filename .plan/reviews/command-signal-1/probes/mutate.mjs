// Mutations of drag:DRD-71 and repo:RF-127, none of them from command-signal-1/probes/mutations.mjs.
// Run from the root of a scratch copy with the packages built: node mutate.mjs. It restores each file.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
const op = 'packages/drag/src/sortable/operation.ts',
  list = 'packages/material-x/src/list/sortable-list.ts',
  css = 'packages/material-x/src/list/styles/default/main.styles.css';
const kind = "this.#direction === null ? 'pointer' : 'command'";
const toggle =
  "toggleState(internals(this), COMMAND_STATE, kind === 'command');";
const rule =
  ':host(:state(command)) ::slotted([data-drag-placeholder]) {\n  visibility: hidden;\n}';
const M = [
  [
    'drag',
    'only a key toward the end is a command',
    op,
    kind,
    "this.#direction === 111 ? 'command' : 'pointer'",
  ],
  [
    'drag',
    'the kind goes first',
    op,
    `this.#query.item,\n      ${kind},`,
    `(${kind}) as never,\n      this.#query.item as never,`,
  ],
  [
    'drag',
    'onStart after the drop has begun',
    op,
    `    this.#behavior.config.onStart?.(\n      this.#query.item,\n      ${kind},\n    );`,
    `    queueMicrotask(() => this.#behavior.config.onStart?.(\n      this.#query.item,\n      ${kind},\n    ));`,
  ],
  [
    'list',
    'the state hides every slotted element',
    css,
    ':host(:state(command)) ::slotted([data-drag-placeholder])',
    ':host(:state(command)) ::slotted(*)',
  ],
  [
    'list',
    'the placeholder gives up its place',
    css,
    'visibility: hidden',
    'display: none',
  ],
  [
    'list',
    'no footprint at all',
    css,
    ':host(:state(command)) ::slotted([data-drag-placeholder])',
    '::slotted([data-drag-placeholder])',
  ],
  [
    'list',
    'the state is set after the handler',
    list,
    toggle,
    `queueMicrotask(() => ${toggle.slice(0, -1)});`,
  ],
  [
    'list',
    "the state is the item's",
    list,
    toggle,
    toggle.replace('internals(this)', 'internals(item as ControlledElement)'),
  ],
  [
    'list',
    'the state is cleared when the command ends',
    list,
    'const item = dragged!;',
    'const item = dragged!;\n        toggleState(internals(this), COMMAND_STATE, false);',
  ],
  [
    'list',
    'the footprint is hidden by transparency',
    css,
    'visibility: hidden',
    'opacity: 0',
  ],
];
for (const [pkg, name, file, from, to] of M) {
  const s = readFileSync(file, 'utf8');
  if (s.split(from).length !== 2) {
    console.log('NOT APPLIED', name);
    continue;
  }
  try {
    writeFileSync(
      file,
      s.replace(from, () => to),
    );
    if (pkg === 'drag')
      spawnSync('aube', ['exec', 'just', 'build'], { cwd: 'packages/drag' });
    for (const e of ['chromium', 'firefox', 'webkit']) {
      const { stdout, stderr } = spawnSync(
        'aube',
        [
          'exec',
          'vitest',
          'run',
          '-c',
          'vitest.config.ts',
          ...(pkg === 'drag'
            ? [
                '--project',
                'browser*',
                '--project',
                'consumer*',
                'tests/keyboard.browser',
                'tests/callbacks.browser',
                'tests/sortable.browser',
              ]
            : ['--project', 'browser*', 'tests/list/']),
        ],
        {
          cwd: `packages/${pkg === 'drag' ? 'drag' : 'material-x'}`,
          encoding: 'utf8',
          env: { ...process.env, MX_TEST_ENGINES: e, NO_COLOR: '1' },
        },
      );
      const out = stdout + stderr;
      console.log(
        `## ${pkg}: ${name} | ${e} | ${/Tests\s+(.*)/u.exec(out)?.[1] ?? 'no result ' + out.slice(-200)}`,
      );
      for (const r of [
        ...new Set(
          [...out.matchAll(/FAIL\s+(.*)/gu)].map((m) =>
            m[1].replace(/^\|?[^|]*\|?.*?> /u, ''),
          ),
        ),
      ].slice(0, 5))
        console.log('   ' + r);
    }
  } finally {
    writeFileSync(file, s);
    if (pkg === 'drag')
      spawnSync('aube', ['exec', 'just', 'build'], { cwd: 'packages/drag' });
  }
}
console.log('DONE');
