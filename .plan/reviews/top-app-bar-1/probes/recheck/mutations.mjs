// Mutations beside the implementer's. Run from packages/material-x of a scratch copy: node mutate.mjs
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const T = 'src/top-app-bar/top-app-bar.ts',
  C = 'src/top-app-bar/styles/default/main.styles.css',
  H = 'src/top-app-bar/top-app-bar.tpl.html';
const M = [
  ['clean', T, '', ''],
  [
    'the check around the show only',
    T,
    '          observer.observe(scrollStart);\n        }',
    '        }\n        observer.observe(scrollStart);',
  ],
  [
    'the check around the observe only',
    T,
    '          scrollStart.showPopover();\n',
    '',
  ],
  [
    'the check inverted to a throw swallowed',
    T,
    'if (scrollStart.isConnected) {',
    'if (true) { try { scrollStart.showPopover(); } catch {}',
  ],
  ['the observer is not disconnected', T, '        observer.disconnect();', ''],
  ['entries[0]', T, 'entries.at(-1)!', 'entries[0]!'],
  ['popover auto', H, 'popover="manual"', 'popover="auto"'],
  ['box without visibility hidden', C, '  visibility: hidden;\n', ''],
  [
    'box with the user agent margin',
    C,
    '  block-size: 0;\n  margin: 0;',
    '  block-size: 0;',
  ],
  [
    'box with the user agent border',
    C,
    '  margin: 0;\n  border: 0;\n  padding: 0;',
    '  margin: 0;\n  padding: 0;',
  ],
  [
    'box with the user agent padding',
    C,
    '  border: 0;\n  padding: 0;',
    '  border: 0;',
  ],
  [
    'box fixed',
    C,
    '.scroll-start {\n  position: absolute;',
    '.scroll-start {\n  position: fixed;',
  ],
  [
    'box with the user agent size',
    C,
    '  inline-size: 0;\n  block-size: 0;\n  margin: 0;',
    '  margin: 0;',
  ],
  ['a bottom margin of -100%', T, "'0px 1000000px'", "'0px 1000000px -100%'"],
  ['a bottom margin of 10px', T, "'0px 1000000px'", "'0px 1000000px 10px'"],
  [
    'show deferred by a microtask',
    T,
    '          scrollStart.showPopover();',
    '          queueMicrotask(() => scrollStart.showPopover());',
  ],
];
for (const [n, f, a, b] of M) {
  const s = fs.readFileSync(f, 'utf8');
  if (a && s.split(a).length !== 2) {
    console.log('## NOT APPLIED', n);
    continue;
  }
  fs.writeFileSync(f, a ? s.replace(a, () => b) : s);
  fs.rmSync('r.json', { force: true });
  spawnSync(
    'aube',
    [
      'exec',
      '--',
      'vitest',
      'run',
      '-c',
      'vitest.config.ts',
      'tests/top-app-bar',
      '--project',
      'browser*',
      '--project',
      'spec*',
      '--reporter=json',
      '--outputFile=r.json',
    ],
    { env: { ...process.env, MX_TEST_ENGINES: 'chromium,firefox,webkit' } },
  );
  const j = JSON.parse(fs.readFileSync('r.json', 'utf8'));
  const c = {};
  for (const t of j.testResults)
    for (const x of t.assertionResults)
      if (x.status === 'failed') c[x.fullName] = (c[x.fullName] ?? 0) + 1;
  console.log(
    `## ${n}: passed ${j.numPassedTests} failed ${j.numFailedTests}${j.numFailedTestSuites && !j.numFailedTests ? ' (suite error)' : ''}`,
  );
  for (const [k, v] of Object.entries(c).slice(0, 6))
    console.log(`   ${v}x ${k.replace('mx-top-app-bar ', '')}`);
  fs.writeFileSync(f, s);
}
fs.rmSync('r.json', { force: true });
console.log('DONE');
