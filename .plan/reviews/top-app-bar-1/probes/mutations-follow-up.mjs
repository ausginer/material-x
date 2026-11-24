import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const T = 'src/top-app-bar/top-app-bar.ts',
  B = 'tests/top-app-bar/top-app-bar.browser.test.ts',
  P = 'tests/top-app-bar/top-app-bar.spec.browser.test.ts',
  C = 'src/top-app-bar/styles/default/main.styles.css';
const r = (a, b) => (s) => {
  if (!s.includes(a)) throw new Error('no match: ' + a);
  return s.replace(a, b);
};
const host = (x) => (s) =>
  r(
    'observer.observe(document',
    x + ' observer.observe(document',
  )(r('    super();', '    super();\n    const host = this;')(s));
// the row, changed only to let the bar observe the start first
const waits = r(
  '    const bar = createPage();\n    await scrollPage(top);',
  '    const bar = createPage();\n    await observed();\n    await scrollPage(top);',
);
const listenOnly = (s) =>
  r(
    '    use(this, {',
    "    window.addEventListener('scroll', () => {});\n    use(this, {",
  )(s);
const docListen = (s) =>
  r(
    '    use(this, {',
    "    document.addEventListener('scroll', () => {});\n    use(this, {",
  )(s);
const docSet = (s) =>
  r(
    '    use(this, {',
    "    document.addEventListener('scroll', () => toggleState(internals(this), 'scrolled', scrollY > 0));\n    use(this, {",
  )(s);
const crossOnly = (s) =>
  r(
    '    use(this, {',
    "    let was = false; document.addEventListener('scroll', () => { if (was !== scrollY > 0) { was = scrollY > 0; toggleState(internals(this), 'scrolled', was); } });\n    use(this, {",
  )(s);
const M = [
  [
    'role attribute at connect',
    [[T, host("host.setAttribute('role','banner');")]],
  ],
  ['host tabindex at connect', [[T, host('host.tabIndex = 0;')]]],
  [
    'delegatesFocus tabindex 0 via attribute',
    [[T, host("host.setAttribute('tabindex','-1');")]],
  ],
  ['window listener, no work', [[T, listenOnly]]],
  ['document listener, no work', [[T, docListen]]],
  ['document listener sets state', [[T, docSet]]],
  ['document listener, crossing only, no observer state', [[T, crossOnly]]],
  ['1px row waits, clean', [[B, waits]]],
  [
    '1px row waits, threshold 0.01',
    [
      [B, waits],
      [T, r('1e-9', '0.01')],
    ],
  ],
  [
    '1px row waits, threshold 0.0005',
    [
      [B, waits],
      [T, r('1e-9', '0.0005')],
    ],
  ],
  [
    'surroundings beat the test body, clean',
    [[P, r("'body { font: italic", "'body.mx-test-body { font: italic")]],
  ],
  [
    'surroundings beat the test body, no font-family',
    [
      [P, r("'body { font: italic", "'body.mx-test-body { font: italic")],
      [C, r('  font-family: var(--_title-font-font-name);\n', '')],
    ],
  ],
];
const S = '/tmp/top-app-bar-proof';
for (const [n, es] of M) {
  const o = es.map(([f]) => [f, fs.readFileSync(f, 'utf8')]);
  try {
    for (const [f, m] of es) fs.writeFileSync(f, m(fs.readFileSync(f, 'utf8')));
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
        `--outputFile=${S}/r.json`,
      ],
      {
        encoding: 'utf8',
        env: { ...process.env, MX_TEST_ENGINES: 'chromium,firefox,webkit' },
      },
    );
    const j = JSON.parse(fs.readFileSync(S + '/r.json', 'utf8'));
    const c = {};
    for (const t of j.testResults)
      for (const a of t.assertionResults)
        if (a.status === 'failed') {
          const k =
            a.fullName.replace('mx-top-app-bar ', '') +
            ' :: ' +
            (a.failureMessages[0] ?? '').split('\n')[0].slice(0, 110);
          c[k] = (c[k] ?? 0) + 1;
        }
    fs.appendFileSync(
      S + '/mut2.txt',
      `## ${n}: passed ${j.numPassedTests} failed ${j.numFailedTests}\n` +
        Object.entries(c)
          .map(([k, v]) => `   ${v}x ${k}\n`)
          .join(''),
    );
  } finally {
    for (const [f, s] of o) fs.writeFileSync(f, s);
  }
}
