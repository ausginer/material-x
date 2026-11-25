// #265: applies each mutation to the source, runs displacement.browser.test.ts in the source project, and restores it.
// Run from packages/drag: node .plan/displacement-1/probes/mutate.mjs <engine> [name of one mutation]
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
const OP = 'src/sortable/operation.ts';
const SINK = 'src/sortable/layout-animation.ts';
const BEHAVIOR = 'src/sortable/behavior.ts';
const Y = 'src/sortable/y.ts';
const source = Object.fromEntries(
  [OP, SINK, BEHAVIOR, Y].map((f) => [f, readFileSync(f, 'utf8')]),
);
const PLACE = `    if (resolved && this.#rows) {
      this.#follow(resolved);
    } else {
      this.#relocate(this.#query.insertion);
    }`;
const RETURN = `    if (this.#rows) {
      this.#returnPlaceholder(recovery);
    }`;
const RELEASE = '    this.displacement?.release(drag.item);\n';
const mutations = [
  ['no mutation'],
  [
    'the report of drop() removed',
    OP,
    PLACE,
    '    movePlaceholder(this.#context.placeholder, this.#query.insertion);',
  ],
  [
    "a pointer drop's report removed",
    OP,
    'this.#follow(resolved);\n    } else {',
    'movePlaceholder(this.#context.placeholder, resolved);\n    } else {',
  ],
  [
    "a command's report removed",
    OP,
    '      this.#relocate(this.#query.insertion);',
    '      movePlaceholder(this.#context.placeholder, this.#query.insertion);',
  ],
  ['the report of the return removed', OP, RETURN, ''],
  [
    'the return only with a landing',
    OP,
    RETURN,
    RETURN.replace(
      'if (this.#rows)',
      'if (this.#rows && this.#behavior.landing)',
    ),
  ],
  [
    "the fault's return removed",
    OP,
    RETURN,
    RETURN.replace(
      'if (this.#rows)',
      "if (this.#rows && !(outcome.type === 'canceled' && outcome.origin === 'fault'))",
    ),
  ],
  [
    "an accepted item's return removed",
    OP,
    RETURN,
    RETURN.replace(
      'if (this.#rows)',
      'if (this.#rows && recovery !== RECOVERY_DESTINATION)',
    ),
  ],
  ["the row's release at the activation removed", BEHAVIOR, RELEASE, ''],
  [
    "the row's release before the activation can decline",
    BEHAVIOR,
    '    const snapshot = this.#pull();\n\n    if (!snapshot.items.includes(drag.item)) {',
    `${RELEASE}    const snapshot = this.#pull();\n\n    if (!snapshot.items.includes(drag.item)) {`,
  ],
  [
    'the preference not read',
    SINK,
    /const timing = element[\s\S]*?: this\.#timing\(\);/u,
    'const timing = this.#timing();',
  ],
  [
    'the preference read once',
    SINK,
    "element.ownerDocument.defaultView!.matchMedia(\n      '(prefers-reduced-motion: reduce)',\n    ).matches",
    "(globalThis.zzOnce ??= element.ownerDocument.defaultView!.matchMedia('(prefers-reduced-motion: reduce)').matches)",
  ],
  [
    'timing called under the preference',
    SINK,
    '? null\n      : this.#timing();',
    '? (this.#timing(), null)\n      : this.#timing();',
  ],
  [
    'the array read after the drop',
    OP,
    '        this.#rows,\n        this.#behavior.axis.isLinear',
    '        this.#query.snapshot.items.filter((r) => r !== this.#query.item),\n        this.#behavior.axis.isLinear',
  ],
  ['the rows not kept at a rebase', OP, '    this.#collect(next);\n', ''],
  ['an absent item returned home', OP, ' || this.#home.index < 0', ''],
  [
    'a lost anchor not checked',
    OP,
    '      (target.after ?? target.before)?.parentNode === placeholder.parentNode',
    '      true',
  ],
  [
    'a lost item not checked',
    OP,
    'placeholder.parentNode === item.parentNode &&',
    '',
  ],
  ['y() reads every row', Y, 'isLinear = true', 'isLinear = false'],
];
const out = `${tmpdir()}/displacement-${process.pid}.json`;
const restore = () => {
  for (const [f, text] of Object.entries(source)) writeFileSync(f, text);
};
try {
  for (const [name, file, from, to] of mutations) {
    if (process.argv[3] && process.argv[3] !== name) continue;
    if (file) {
      const text = source[file];
      if (text.split(from).length !== 2)
        throw new Error(`not one match: ${name}`);
      writeFileSync(
        file,
        text.replace(from, () => to),
      );
    }
    spawnSync(
      'aube',
      [
        'exec',
        '--',
        'vitest',
        'run',
        '-c',
        'vitest.config.ts',
        '--project',
        'browser*',
        'tests/displacement.browser.test.ts',
        '--reporter=json',
        `--outputFile=${out}`,
      ],
      {
        env: { ...process.env, MX_TEST_ENGINES: process.argv[2] },
      },
    );
    restore();
    const json = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : null;
    rmSync(out, { force: true });
    console.log(
      `## ${name} | ${process.argv[2]} | ${json?.numTotalTests ? `${json.numPassedTests} passed, ${json.numFailedTests} failed` : 'no result'}`,
    );
    for (const test of json?.testResults.flatMap((f) => f.assertionResults) ??
      [])
      if (test.status === 'failed') console.log(`   ${test.fullName}`);
  }
} finally {
  restore();
}
