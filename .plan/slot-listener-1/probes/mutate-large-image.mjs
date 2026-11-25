// Run from the repository root, with a clean src and core built:
//   node .plan/slot-listener-1/probes/mutate-large-image.mjs <engine,...>
// RF-131: applies each mutation to its source, builds core, runs the two rows of
// a list item's large leading image, and restores the file and the build.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
const hook = 'packages/core/src/controllers/useSlot.ts';
const item = 'packages/material-x/src/list/ListItemCore.ts';
const sources = Object.fromEntries(
  [hook, item].map((file) => [file, readFileSync(file, 'utf8')]),
);
const replaceOnce = (file, from, to) => {
  if (sources[file].split(from).length !== 2) throw new Error('not one match');
  return sources[file].replace(from, () => to);
};
const mutations = [
  ['no mutation', hook, sources[hook]],
  [
    'the listener through useEvents, as before the repair',
    hook,
    `import { useEvents } from './useEvents.ts';\n${replaceOnce(
      hook,
      `  slot.addEventListener('slotchange', () => {
    callback(slot, slot.assignedNodes());
  });
`,
      `  useEvents(host, { slotchange() { callback(slot, slot.assignedNodes()); } }, slot);\n`,
    )}`,
  ],
  [
    'lead-large never set',
    item,
    replaceOnce(
      item,
      `nodes.some((n) => n instanceof HTMLElement && 'large' in n.dataset)`,
      'false && nodes',
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
  for (const [name, file, text] of mutations) {
    for (const [path, source] of Object.entries(sources))
      writeFileSync(path, path === file ? text : source);
    build();
    for (const engine of process.argv[2].split(',')) {
      const { out } = run(
        'packages/material-x',
        [
          'vitest',
          'run',
          '-c',
          'vitest.config.ts',
          'tests/slotted-content',
          '-t',
          'large leading image',
        ],
        { MX_TEST_ENGINES: engine },
      );
      console.log(
        `## ${name} | ${engine} | ${/Tests\s+(.*)/u.exec(out)?.[1] ?? 'no result'}`,
      );
      for (const line of out.matchAll(/FAIL\s+.*|AssertionError: .*/gmu))
        console.log(`   ${line[0].trim().replace(/^FAIL.*?> /u, '')}`);
    }
  }
} finally {
  for (const [path, source] of Object.entries(sources))
    writeFileSync(path, source);
  build();
}
