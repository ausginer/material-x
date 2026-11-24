// Runs useARIA's rows in core, the text fields' rows, the feature proof's
// probes and own-order's probe with each candidate of the ruling, in each
// engine, and restores the file. Run from the repository's root.
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const file = 'packages/core/src/controllers/useARIA.ts';
const good = fs.readFileSync(file, 'utf8');
const swap = (s, from, to) => {
  if (!s.includes(from)) throw Error(from);
  return s.replace(from, to);
};
const body = (s) => s.slice(0, s.indexOf('  // The observer'));
const forget = (s) =>
  swap(
    swap(
      s,
      '    mirrored.forEach(sync);\n',
      '    for (const name of mirrored) { sync(name); if (!host.hasAttribute(name)) mirrored.delete(name); }\n',
    ),
    '          mirrored.add(name);\n          sync(name);',
    '          if (host.hasAttribute(name)) mirrored.add(name); else mirrored.delete(name);\n          sync(name);',
  );
const observer = (
  s,
) => `${body(swap(s, "import { useMutationObserver } from './useMutationObserver.ts';\n", ''))}
  const sync = (name: string): void => {
    setAttribute(target, name, transform(name, host.getAttribute(name)));
  };
  const mirror = (records: readonly MutationRecord[]): void => {
    for (const { attributeName: name } of records) {
      if (name!.startsWith('aria-')) sync(name!);
    }
  };
  const observer = new MutationObserver(mirror);
  observer.observe(host, { attributes: true });
  useConnected(host, () => {
    mirror(observer.takeRecords());
    for (const { name } of host.attributes) {
      if (name.startsWith('aria-')) sync(name);
    }
  });
}
`;
const main = execSync(`git show 114270083:${file}`, { encoding: 'utf8' });
const only = process.argv[2] ?? '';
const CANDIDATES = {
  main: () => main,
  'head: a Set that keeps every name': (s) => s,
  'a Set that forgets a name synced from null': forget,
  'an observer that also runs while out, flushed on connect': observer,
};
const run = (cwd, cmd, env) => {
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
const P = '.plan/reviews/aria-removed-1/probes';
const probes = [
  [
    'packages/core',
    'tests/zz-core.browser.test.ts',
    `${P}/core.browser.test.ts.txt`,
  ],
  [
    'packages/material-x',
    'tests/zz-mx.browser.test.ts',
    `${P}/material-x.browser.test.ts.txt`,
  ],
  [
    'packages/material-x',
    'tests/zz-out.browser.test.ts',
    `${P}/own-out.browser.test.ts.txt`,
  ],
  [
    'packages/material-x',
    'tests/zz-order.browser.test.ts',
    '.plan/aria-removed-1/probes/own-order.browser.test.ts.txt',
  ],
];
try {
  for (const [pkg, at, from] of probes) fs.copyFileSync(from, `${pkg}/${at}`);
  for (const [name, make] of Object.entries(CANDIDATES)) {
    if (!name.includes(only)) continue;
    fs.writeFileSync(file, make(good));
    run('packages/core', 'aube exec just build', {});
    for (const engine of ['chromium', 'firefox', 'webkit']) {
      console.log(`## ${name} | ${engine}`);
      const env = { MX_TEST_ENGINES: engine };
      const n = engine === 'chromium' ? 'browser' : `browser/${engine}`;
      const vitest = `aube exec vitest run -c vitest.config.ts --project "${n}" --project "${n} (${engine})"`;
      for (const [pkg, t] of [
        ['packages/core', 'tests/controllers/useARIA.browser.test.ts'],
        ['packages/material-x', 'tests/text-field/text-field.browser.test.ts'],
      ]) {
        const out = run(pkg, `${vitest} ${t}`, env);
        // eslint-disable-next-line no-control-regex
        console.log(
          `${t}: ${(out.replace(/\u001b\[[0-9;]*m/gu, '').match(/Tests\s.*/u) ?? [out.slice(-300)])[0]}`,
        );
      }
      for (const [pkg, at] of probes) {
        const out = run(pkg, `${vitest} ${at}`, env);
        const rows = [
          ...new Set(
            out.replace(/\u001b\[[0-9;]*m/gu, '').match(/READ .*/gu) ?? [
              'NO READING ' + out.slice(-600),
            ],
          ),
        ];
        for (const row of rows)
          console.log(
            row.replace(/^READ \S+ \| /u, `${at.match(/zz-(\w+)/u)[1]} | `),
          );
      }
    }
  }
} finally {
  fs.writeFileSync(file, good);
  for (const [pkg, at] of probes) fs.rmSync(`${pkg}/${at}`, { force: true });
  run('packages/core', 'aube exec just build', {});
}
