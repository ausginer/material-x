// Runs useARIA's rows in core and the text fields' rows with useARIA.ts mutated,
// in each engine, and restores the file. Run from the repository's root. An
// optional argument selects the mutations whose name contains it.
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const file = 'packages/core/src/controllers/useARIA.ts';
const good = fs.readFileSync(file, 'utf8');
const swap = (from, to) => (s) => {
  if (!s.includes(from)) throw Error(from);
  return s.replace(from, to);
};
const FOREACH = '    mirrored.forEach(sync);\n';
const mutations = {
  repair: (s) => s,
  'one Set for every hook': (s) =>
    'const mirrored = new Set<string>();\n' +
    s.replace('  const mirrored = new Set<string>();\n', ''),
  'the Set is emptied before each connect': swap(
    '    for (const { name } of host.attributes)',
    '    mirrored.clear();\n    for (const { name } of host.attributes)',
  ),
  'no sync on connect': swap(FOREACH, ''),
  'the connect forgets a lost name after it syncs it': swap(
    FOREACH,
    '    for (const name of mirrored) { sync(name); if (!host.hasAttribute(name)) mirrored.delete(name); }\n',
  ),
  'a name is forgotten once it is synced from null, on connect or by the observer':
    (s) =>
      swap(
        FOREACH,
        '    for (const name of mirrored) { sync(name); if (!host.hasAttribute(name)) mirrored.delete(name); }\n',
      )(
        swap(
          '          mirrored.add(name);\n          sync(name);',
          '          if (host.hasAttribute(name)) mirrored.add(name); else mirrored.delete(name);\n          sync(name);',
        )(s),
      ),
  'lost names are synced, and those the host has are not': swap(
    FOREACH,
    '    mirrored.forEach((n) => { if (!host.hasAttribute(n)) sync(n); });\n',
  ),
  'the connect ignores the namespace': swap(
    "      if (name.startsWith('aria-')) {\n        mirrored.add(name);\n      }",
    '      mirrored.add(name);',
  ),
  'the observer ignores the namespace': swap(
    "name?.startsWith('aria-')",
    'name',
  ),
  'no Set: the connect copies, and the observer also runs while the host is out':
    (s) =>
      s
        .replace(
          /  \/\/ The observer doesn't[\s\S]*?new Set<string>\(\);\n\n/,
          '',
        )
        .replace('        mirrored.add(name);\n', '        sync(name);\n')
        .replace('\n    mirrored.forEach(sync);\n', '')
        .replace('          mirrored.add(name);\n', '')
        .replace(
          '  useMutationObserver(\n    host,\n    (records) => {',
          '  new MutationObserver((records) => {',
        )
        .replace('    { attributes: true },\n  );', '')
        .replace(
          /    \},\n\n}\n$/,
          '  }).observe(host, { attributes: true });\n}\n',
        )
        .replace(
          "import { useMutationObserver } from './useMutationObserver.ts';\n",
          '',
        ),
};
const run = (c, o = {}) => {
  try {
    return execSync(c, { stdio: 'pipe', maxBuffer: 1e8, ...o }).toString();
  } catch (e) {
    return `${e.stdout}${e.stderr}`;
  }
};
const only = process.argv[2];
try {
  for (const [name, mutate] of Object.entries(mutations)) {
    if (only && !name.includes(only)) continue;
    const source = mutate(good);
    if (name !== 'repair' && source === good) throw Error(name);
    fs.writeFileSync(file, source);
    console.log(`\n## ${name}`);
    const built = run('aube exec just build', { cwd: 'packages/core' });
    if (/error/i.test(built)) console.log('BUILD', built.slice(-1500));
    for (const e of ['chromium', 'firefox', 'webkit']) {
      const n = e === 'chromium' ? 'browser' : `browser/${e}`;
      for (const [p, t] of [
        ['core', 'tests/controllers/useARIA.browser.test.ts'],
        ['material-x', 'tests/text-field/text-field.browser.test.ts'],
      ]) {
        const out = run(
          `aube exec vitest run -c vitest.config.ts --project "${n}" --project "${n} (${e})" ${t}`,
          { cwd: `packages/${p}`, env: { ...process.env, MX_TEST_ENGINES: e } },
        ).replace(/\x1b\[[0-9;]*m/g, '');
        console.log(
          `${p} ${e}: ${/Tests .*/.exec(out)?.[0] ?? `NO RESULT ${out.slice(-600)}`}`,
        );
        for (const l of new Set(out.match(/^ FAIL .*$/gm)))
          console.log(`  ${l.replace(/^.*> /, '')}`);
      }
    }
  }
} finally {
  fs.writeFileSync(file, good);
  run('aube exec just build', { cwd: 'packages/core' });
}
