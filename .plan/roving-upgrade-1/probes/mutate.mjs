// Run from the repository root, with a clean src and core built:
//   node .plan/roving-upgrade-1/probes/mutate.mjs <engine,...>
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
const join = `            if (isItem(node)) {
              join(nodes, current);
            }`;
const mutations = [
  ['no mutation', source],
  ['the hook of main', main],
  ['no upgrade', swap('            customElements.upgrade(node);\n', '')],
  [
    'no wait',
    swap('customElements.whenDefined(node.localName)', 'Promise.resolve()'),
  ],
  [
    'the read of the registered candidate, with no memory of the choice',
    swap(
      join,
      '            items.value = current.filter(isItem);\n            select();',
    ),
  ],
  [
    'a default choice is kept',
    swap('if (chosenBy === nodes) {', 'if (false) {'),
  ],
  [
    "any change's default choice is dropped",
    swap('if (chosenBy === nodes) {', 'if (chosenBy) {'),
  ],
  ['a moved tab stop is dropped', swap('isMoved = true', 'isMoved = false')],
  [
    'focus keeps the default choice',
    swap('        chosenBy = undefined;\n        isMoved', '        isMoved'),
  ],
  [
    'a node that left is read',
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
