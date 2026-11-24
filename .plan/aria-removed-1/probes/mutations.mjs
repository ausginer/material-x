// Runs the two changed test files with useARIA.ts as it is, as at 114270083, and
// with four mutations, in each engine, and restores the file. Run from the
// repository's root.
import fs from 'node:fs';
import { execSync } from 'node:child_process';
const f = 'packages/core/src/controllers/useARIA.ts',
  good = fs.readFileSync(f, 'utf8');
const muts = {
  main: () => execSync('git show 114270083:' + f).toString(),
  'the observer does not record the name': (s) =>
    s.replace('          mirrored.add(name);\n', ''),
  'the connect does not record the names': (s) =>
    s.replace('        mirrored.add(name);\n', '        sync(name);\n'),
  'the connect also syncs each aria-* of the target': (s) =>
    s.replace(
      '    mirrored.forEach(sync);',
      '    for (const name of target.getAttributeNames()) { if (name.startsWith("aria-")) mirrored.add(name); }\n    mirrored.forEach(sync);',
    ),
  'the connect removes a lost attribute without the transformer': (s) =>
    s.replace(
      '    mirrored.forEach(sync);',
      '    mirrored.forEach((name) => { if (host.hasAttribute(name)) sync(name); else target.removeAttribute(name); });',
    ),
};
const run = (c, o = {}) => {
  try {
    return execSync(c, { stdio: 'pipe', ...o }).toString();
  } catch (e) {
    return e.stdout.toString() + e.stderr.toString();
  }
};
const vt = (p, file, e) => {
  const n = e === 'chromium' ? 'browser' : 'browser/' + e;
  const J = `packages/${p}/.vitest/json/output.json`;
  fs.rmSync(J, { force: true });
  const out = run(
    `aube exec vitest run -c vitest.config.ts --reporter=json --project "${n}" --project "${n} (${e})" ${file}`,
    {
      cwd: 'packages/' + p,
      env: { ...process.env, MX_TEST_ENGINES: e },
      maxBuffer: 1e8,
    },
  );
  if (!fs.existsSync(J)) {
    console.log(p, e, 'NO RESULT', out.slice(-800));
    return;
  }
  const j = JSON.parse(fs.readFileSync(J, 'utf8'));
  console.log(
    `${p} ${e}: passed ${j.numPassedTests}, failed ${j.numFailedTests}`,
  );
  for (const t of j.testResults.flatMap((r) => r.assertionResults))
    if (t.status === 'failed')
      console.log(
        '  FAIL ' +
          t.fullName +
          ' | ' +
          (t.failureMessages[0] ?? '')
            .split('\n')
            .filter(Boolean)
            .slice(0, 6)
            .join(' ')
            .slice(0, 260)
            .replace(/\x1b\[\d+m/g, ''),
      );
};
try {
  for (const [k, m] of [['repair', (s) => s], ...Object.entries(muts)]) {
    const s = m(good);
    if (k !== 'repair' && s === good) throw Error(k);
    fs.writeFileSync(f, s);
    console.log('\n## ' + k);
    if (/rror/.test(run('aube exec just build', { cwd: 'packages/core' })))
      console.log('build error');
    for (const e of ['chromium', 'firefox', 'webkit']) {
      vt('core', 'tests/controllers/useARIA.browser.test.ts', e);
      vt('material-x', 'tests/text-field/text-field.browser.test.ts', e);
    }
  }
} finally {
  fs.writeFileSync(f, good);
  run('aube exec just build', { cwd: 'packages/core' });
}
