// Run from the repository root, with a clean src and core built:
//   node <this file> <engine,...>
// Ten other lifetimes of useSlot's listener against core's rows and material-x's.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
const file = 'packages/core/src/controllers/useSlot.ts';
const source = readFileSync(file, 'utf8');
const listener = `  slot.addEventListener('slotchange', () => {
    callback(slot, slot.assignedNodes());
  });
`;
if (source.split(listener).length !== 2) throw new Error('not one match');
const call = 'callback(slot, slot.assignedNodes());';
const m = (body) =>
  source
    .replace(
      'import type { ControlledElement }',
      'import { use, type ControlledElement }',
    )
    .replace(listener, body);
const mutations = {
  'one more listener at each connect': m(
    `${listener}  use(host, { connected() { slot.addEventListener('slotchange', () => { ${call} }); } });\n`,
  ),
  'one more listener at each reconnect': m(
    `${listener}  let n = 0; use(host, { connected() { if (n++) slot.addEventListener('slotchange', () => { ${call} }); } });\n`,
  ),
  once: m(listener.replace('  });\n', '  }, { once: true });\n')),
  'only while host.isConnected': m(
    `  slot.addEventListener('slotchange', () => { if (host.isConnected) { ${call} } });\n`,
  ),
  'until the first disconnect': m(
    `  const c = new AbortController(); slot.addEventListener('slotchange', () => { ${call} }, { signal: c.signal }); use(host, { disconnected() { c.abort(); } });\n`,
  ),
  'from the first connect': m(
    `  let d = false; use(host, { connected() { if (!d) { d = true; slot.addEventListener('slotchange', () => { ${call} }); } } });\n`,
  ),
  'a call at the first connect too': m(
    `${listener}  let d = false; use(host, { connected() { if (!d) { d = true; ${call} } } });\n`,
  ),
  'a call at each reconnect too': m(
    `${listener}  let n = 0; use(host, { connected() { if (n++) { ${call} } } });\n`,
  ),
  'silent while out, a call at the connect if one was missed': m(
    `  let missed = false; slot.addEventListener('slotchange', () => { if (host.isConnected) { ${call} } else { missed = true; } }); use(host, { connected() { if (missed) { missed = false; ${call} } } });\n`,
  ),
  'no listener': m(''),
};
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
  for (const [name, text] of Object.entries(mutations)) {
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
        if (cwd.endsWith('core'))
          for (const row of new Set(
            [...out.matchAll(/FAIL\s+(.*)/gu)].map((x) =>
              x[1].replace(/^.*?> /u, ''),
            ),
          ))
            console.log(`   ${row}`);
      }
  }
} finally {
  writeFileSync(file, source);
  build();
}
