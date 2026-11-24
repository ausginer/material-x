// Runs the changed test files with useARIA.ts as it is and with each mutation,
// in each engine, and restores the file. Run from the repository's root.
// The last four mutations are added to the implementer's mutations-2.mjs.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
const file = 'packages/core/src/controllers/useARIA.ts';
const good = fs.readFileSync(file, 'utf8');
const at = (rev) => () =>
  execSync(`git show ${rev}:${file}`, { encoding: 'utf8' });
const swap = (from, to) => (s) => {
  if (s.split(from).length !== 2) throw Error(`not one match: ${from}`);
  return s.replace(from, () => to);
};
const take =
  '      ...observer.takeRecords().map(({ attributeName }) => attributeName),\n';
const forget = (s) =>
  swap(
    '          mirrored.add(name);\n          sync(name);',
    '          if (host.hasAttribute(name)) mirrored.add(name); else mirrored.delete(name);\n          sync(name);',
  )(
    swap(
      '    mirrored.forEach(sync);\n',
      '    for (const name of mirrored) { sync(name); if (!host.hasAttribute(name)) mirrored.delete(name); }\n',
    )(at('6e0ca1d4f')()),
  );
const mutations = {
  'no mutation': (s) => s,
  'main (114270083)': at('114270083'),
  'the Set that keeps every name (6e0ca1d4f)': at('6e0ca1d4f'),
  'the Set that forgets a name': forget,
  'the records are not taken': swap(take, ''),
  'the records are dropped': swap(
    take,
    '      ...observer.takeRecords().slice(0, 0).map(() => null),\n',
  ),
  'each name is not written once': (s) =>
    swap(
      '    ]).forEach(sync);',
      '    ].forEach((name) => sync(name));',
    )(swap('    new Set([', '    [')(s)),
  'the observer does not run while out': swap(
    '  useConnected(host, () => {\n',
    '  useConnected(host, () => observer.observe(host, { attributes: true }));\n  use(host, { disconnected: () => observer.disconnect() });\n  useConnected(host, () => {\n',
  ),
  'the connect does not copy the host': swap(
    '      ...host.getAttributeNames(),\n',
    '',
  ),
  "the connect also syncs each of the target's": swap(
    '      ...host.getAttributeNames(),\n',
    '      ...host.getAttributeNames(),\n      ...target.getAttributeNames(),\n',
  ),
  'a lost attribute is removed without the transformer': swap(
    'setAttribute(target, name, transform(name, host.getAttribute(name)));',
    'setAttribute(target, name, host.hasAttribute(name) ? transform(name, host.getAttribute(name)) : null);',
  ),
  'every attribute is synced': swap("name?.startsWith('aria-')", 'name'),
};
Object.assign(mutations, {
  'the observer starts at the first connect': (s) => swap('  useConnected(host, () => {\n', '  useConnected(host, () => {\n    observer.observe(host, { attributes: true });\n')(swap('  observer.observe(host, { attributes: true });\n\n', '')(s)),
  'the observer stops at the first disconnect': swap('  useConnected(host, () => {\n', '  use(host, { disconnected: () => observer.disconnect() });\n  useConnected(host, () => {\n'),
  'the taken records are written a microtask later': swap('    ]).forEach(sync);', '    ]).forEach((n) => queueMicrotask(() => sync(n)));'),
  'the taken records of lost names are dropped': swap('observer.takeRecords().map', 'observer.takeRecords().filter(({ attributeName: n }) => host.hasAttribute(n!)).map'),
});
const run = (cmd, cwd, env) => {
  try {
    return execSync(cmd, {
      cwd,
      env: { ...process.env, ...env },
      encoding: 'utf8',
      stdio: 'pipe',
      maxBuffer: 1e8,
    });
  } catch (e) {
    return `${e.stdout}${e.stderr}`;
  }
};
const only = process.argv[2] ?? '';
try {
  for (const [name, mutate] of Object.entries(mutations)) {
    if (!name.includes(only)) continue;
    let source = mutate(good);
    if (source.includes('use(host, {'))
      source = source.replace(
        "import type { ControlledElement } from '../element.ts';",
        "import { use, type ControlledElement } from '../element.ts';",
      );
    fs.writeFileSync(file, source);
    const built = run('aube exec just build', 'packages/core');
    if (!/Build complete/u.test(built))
      console.log(`BUILD FAILED ${name} ${built.slice(-400)}`);
    for (const engine of ['chromium', 'firefox', 'webkit']) {
      for (const [pkg, tests] of [
        ['packages/core', 'tests/controllers/useARIA'],
        [
          'packages/material-x',
          'tests/text-field/text-field.browser tests/button/button.browser tests/list/sortable-list.browser',
        ],
      ]) {
        const project = pkg.endsWith('core') ? '' : "--project 'browser*'";
        const out = run(
          `aube exec vitest run -c vitest.config.ts ${project} ${tests}`,
          pkg,
          { MX_TEST_ENGINES: engine, NO_COLOR: '1' },
        );
        console.log(
          `## ${name} | ${engine} | ${pkg} | ${/Tests\s+(.*)/u.exec(out)?.[1] ?? `no result ${out.slice(-300)}`}`,
        );
        for (const row of new Set(
          [...out.matchAll(/FAIL\s+(.*)/gu)].map((m) =>
            m[1].replace(/^.*?> /u, ''),
          ),
        ))
          console.log(`   ${row}`);
      }
    }
  }
} finally {
  fs.writeFileSync(file, good);
  run('aube exec just build', 'packages/core');
}
