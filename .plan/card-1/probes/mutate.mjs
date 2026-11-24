// Run from packages/material-x, with a clean src:
//   node ../../.plan/card-1/probes/mutate.mjs <engine,...> [name]
// Applies each mutation to the source, runs the rows, and restores the file.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
const hostBox = 'src/core/styles/elevation/host-box.styles.css';
const outlined = 'src/card/styles/outlined/main.styles.css';
const main = 'src/card/styles/default/main.styles.css';
const before = ':host::before,\n:host::after {';
const mutations = [
  ['no mutation', hostBox, '', ''],
  ['no content', hostBox, "  content: '';\n", ''],
  ['no inset', hostBox, '  inset: 0;\n', ''],
  ['no border-radius', hostBox, '  border-radius: inherit;\n', ''],
  [
    'no position on the pseudo-elements',
    hostBox,
    '  position: absolute;\n',
    '',
  ],
  ['no position on the host', hostBox, '  position: relative;\n', ''],
  [
    'no box on ::before only',
    hostBox,
    before,
    `:host::before { display: none !important; }\n${before}`,
  ],
  [
    'no box on ::after only',
    hostBox,
    before,
    `:host::after { display: none !important; }\n${before}`,
  ],
  [
    'outline on the host',
    outlined,
    ':host(:state(outlined)) slot {',
    ':host(:state(outlined)) {',
  ],
  [
    'outline drawn outside',
    outlined,
    '  outline-offset: calc(-1 * var(--_outline-width));\n',
    '',
  ],
  ['slot does not stretch', main, '  flex: 1 0 auto;\n', ''],
];
const [engines, only] = process.argv.slice(2);
for (const [name, file, from, to] of mutations) {
  if (only && name !== only) continue;
  const source = readFileSync(file, 'utf8');
  if (!source.includes(from)) throw new Error(name);
  try {
    writeFileSync(
      file,
      source.replace(from, () => to),
    );
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
