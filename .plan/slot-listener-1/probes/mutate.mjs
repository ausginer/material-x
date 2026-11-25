// Run from the repository root, with a clean src and core built:
//   node .plan/slot-listener-1/probes/mutate.mjs <engine,...>
// RF-131: applies each mutation to core's useSlot, builds core, runs the rows of
// core and material-x, and restores the file and the build.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
const file = 'packages/core/src/controllers/useSlot.ts';
const source = readFileSync(file, 'utf8');
const listener = `  slot.addEventListener('slotchange', () => {
    callback(slot, slot.assignedNodes());
  });
`;
if (source.split(listener).length !== 2) throw new Error('not one match');
const mutations = [
  ['no mutation', source],
  [
    'the listener through useEvents, as before the repair',
    `import { useEvents } from './useEvents.ts';\n${source.replace(
      listener,
      `  useEvents(host, { slotchange() { callback(slot, slot.assignedNodes()); } }, slot);\n`,
    )}`,
  ],
  [
    'a call at each connect too',
    source
      .replace(
        'import type { ControlledElement }',
        'import { use, type ControlledElement }',
      )
      .replace(
        listener,
        `${listener}  use(host, { connected() { callback(slot, slot.assignedNodes()); } });\n`,
      ),
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
        ['packages/core', 'useSlot'],
        ['packages/material-x', 'tests/slotted-content'],
      ]) {
        const { out } = run(
          cwd,
          ['vitest', 'run', '-c', 'vitest.config.ts', test],
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
