// Run from the repository root, with core and drag built and material-x's
// `build:prepare` run:
//   node .plan/reorder-tokens-1/probes/mutations-lift.mjs
// RF-129: applies each mutation to its source, builds drag, runs `tests/list` in
// each engine, and restores the sources and drag's build.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
const LIFT = 'packages/drag/src/lift.ts';
const CSS = 'packages/material-x/src/list/styles/sortable/main.styles.css';
const originals = new Map(
  [LIFT, CSS].map((file) => [file, readFileSync(file, 'utf8')]),
);
const once = (file, from, to) => {
  const source = originals.get(file);
  if (source.split(from).length !== 2) throw new Error(`not once: ${from}`);
  return [file, source.replace(from, () => to)];
};
const mutations = [
  ['as it is'],
  [
    "color and background-color out of drag's UA_PROPS",
    once(
      LIFT,
      "  'overflow',\n  'color',\n  'background-color',\n];",
      "  'overflow',\n];",
    ),
  ],
  [
    "the static item's rule on ::slotted(:state(drag))",
    once(CSS, 'mx-list-item:state(drag)', ':state(drag)'),
  ],
];
const run = (cwd, args, env) =>
  spawnSync('aube', ['exec', ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1', ...env },
    maxBuffer: 1e8,
  });
const restore = () => {
  for (const [file, source] of originals) writeFileSync(file, source);
};
const build = () => {
  if (run('packages/drag', ['just', 'build']).status !== 0)
    throw new Error('drag build failed');
};
try {
  for (const [name, edit] of mutations) {
    restore();
    if (edit) writeFileSync(...edit);
    build();
    for (const engine of ['chromium', 'firefox', 'webkit']) {
      const { stdout, stderr } = run(
        'packages/material-x',
        ['vitest', 'run', '-c', 'vitest.config.ts', 'tests/list'],
        { MX_TEST_ENGINES: engine },
      );
      const lines = `${stdout}${stderr}`.split('\n');
      console.log(
        `## ${name} | ${engine} | ${lines.find((l) => /^ +Tests /u.test(l))?.trim() ?? 'no result'}`,
      );
      for (const line of new Set(lines.filter((l) => l.includes('FAIL '))))
        console.log(
          `   ${line.replace(/^.*?test\.ts(?::\d+)? > /u, '').trim()}`,
        );
    }
  }
} finally {
  restore();
  build();
}
