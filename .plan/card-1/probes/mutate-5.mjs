// Run from packages/material-x, with a clean src:
//   node ../../.plan/card-1/probes/mutate-5.mjs <engine,...> [name]
// Applies each mutation to the source, runs the rows, and restores the file.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
const main = 'src/card/styles/default/main.styles.css';
const replaced = (from, to) => (source) => {
  if (!source.includes(from)) throw new Error(`no match: ${from}`);
  return source.replaceAll(from, () => to);
};
const mutations = [
  ['no mutation', main, (source) => source],
  ['display: grid', main, replaced('display: flow-root', 'display: grid')],
  [
    'a flex column',
    main,
    replaced('display: flow-root', 'display: flex; flex-direction: column'),
  ],
  [
    'inline-size: fit-content',
    main,
    replaced(
      'display: flow-root',
      'display: flow-root; inline-size: fit-content',
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
