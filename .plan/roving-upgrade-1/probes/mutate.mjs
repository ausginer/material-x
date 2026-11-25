// Run from the repository root, with a clean src and core built:
//   node .plan/roving-upgrade-1/probes/mutate.mjs <engine,...> [name of one mutation]
// RF-141: applies each mutation to core's useRovingTabindex, builds core, runs
// the rows of core and material-x, and restores the file and the build.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
const file = 'packages/core/src/controllers/useRovingTabindex.ts';
const source = readFileSync(file, 'utf8');
const swap = (from, to) => {
  if (source.split(from).length !== 2)
    throw new Error(`not one match: ${from}`);
  return source.replace(from, () => to);
};
const main = spawnSync('git', ['show', `e57c9f074:${file}`], {
  encoding: 'utf8',
}).stdout;
const mutations = [
  ['no mutation', source],
  ['the hook of main', main],
  [
    "main's choice with the new read",
    swap(
      'enabled.find((item) => item === this.#chosen) ??',
      `(this.active && !this.active.disabled && this.contains(this.active)
        ? this.active
        : undefined) ??`,
    ),
  ],
  [
    'focus not recorded',
    swap('items.choose(target)', 'items.setTabStop(target)'),
  ],
  [
    'the item that is focused at a read not recorded',
    swap('this.enabled.find((item) => item === focused) ??', ''),
  ],
  [
    'only the first focus recorded',
    swap(
      '    this.#chosen = item;\n    this.setTabStop(item);',
      '    this.#chosen ??= item;\n    this.setTabStop(item);',
    ),
  ],
  [
    'the former choice preferred at a read',
    swap(
      `      this.enabled.find((item) => item === focused) ??
      value.find((item) => item === this.#chosen);`,
      `      value.find((item) => item === this.#chosen) ??
      this.enabled.find((item) => item === focused);`,
    ),
  ],
  [
    'a focused item recorded without the check that it is enabled',
    swap('this.enabled.find((item) => item === focused)', 'focused'),
  ],
  [
    'a removed item still the chosen one',
    swap('value.find((item) => item === this.#chosen);', 'this.#chosen;'),
  ],
  ["the slot change's own nodes read", swap('read(current);', 'read(nodes);')],
  ['no upgrade', swap('            customElements.upgrade(node);\n', '')],
  [
    'no wait',
    swap('customElements.whenDefined(node.localName)', 'Promise.resolve()'),
  ],
  [
    'a node that left is upgraded',
    swap('if (current.includes(node)) {', 'if (true) {'),
  ],
  [
    'customized built-in elements are waited for',
    swap("        node.localName.includes('-') &&\n", ''),
  ],
];
const run = (cwd, args, env) => {
  const { stdout, stderr, status } = spawnSync('aube', ['exec', ...args], {
    cwd,
    env: { ...process.env, NO_COLOR: '1', ...env },
    encoding: 'utf8',
  });
  return { out: stdout + stderr, status };
};
const build = () => {
  if (run('packages/core', ['just', 'build']).status !== 0)
    throw new Error('build failed');
};
try {
  for (const [name, text] of mutations) {
    if (process.argv[3] && process.argv[3] !== name) continue;
    writeFileSync(file, text);
    build();
    for (const engine of process.argv[2].split(','))
      for (const [cwd, test] of [
        ['packages/core', 'useRovingTabindex'],
        ['packages/material-x', 'tests/button-group/button-group'],
      ]) {
        const { out } = run(
          cwd,
          [
            'vitest',
            'run',
            '-c',
            'vitest.config.ts',
            '--project',
            'browser*',
            test,
          ],
          { MX_TEST_ENGINES: engine },
        );
        console.log(
          `## ${name} | ${engine} | ${cwd} | ${/Tests\s+(.*)/u.exec(out)?.[1] ?? 'no result'}`,
        );
        for (const row of new Set(
          [...out.matchAll(/FAIL\s+(.*)/gu)].map((m) =>
            m[1].replace(/^.*?> /u, ''),
          ),
        ))
          console.log(`   ${row}`);
      }
  }
} finally {
  writeFileSync(file, source);
  build();
}
