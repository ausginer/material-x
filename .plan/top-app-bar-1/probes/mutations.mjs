// Run from packages/material-x, with a scratch directory as the argument:
//   node ../../.plan/top-app-bar-1/probes/mutations.mjs <scratch>
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const S = process.argv[2];
const T = 'src/top-app-bar/top-app-bar.ts',
  C = 'src/top-app-bar/styles/default/main.styles.css',
  H = 'src/top-app-bar/top-app-bar.tpl.html';
const r = (a, b) => (s) => {
  if (!s.includes(a)) throw new Error('no match ' + a);
  return s.replace(a, () => b);
};
const rx = (a, b) => (s) => {
  if (!a.test(s)) throw new Error('no match ' + a);
  return s.replace(a, b);
};
const state = '!entries.at(-1)!.isIntersecting',
  margin = "'0px 1000000px'",
  show = 'scrollStart.showPopover();';
const use = '    use(this, {';
const M = [
  ['clean', []],
  [
    'root element as target, its old options and state',
    [
      [
        T,
        (s) =>
          r(
            'observer.observe(scrollStart)',
            'observer.observe(document.documentElement)',
          )(
            r(
              state,
              'entries.at(-1)!.intersectionRatio > 0',
            )(r(margin, "'1000000px 1000000px -100%', threshold: 1e-9")(s)),
          ),
      ],
    ],
  ],
  ['top margin 2px', [[T, r(margin, "'2px 1000000px 0px'")]]],
  ['side margins 0', [[T, r(margin, "'0px'")]]],
  ['default root', [[T, r('  root: document,\n', '')]]],
  [
    'state from the box top',
    [[T, r(state, 'entries.at(-1)!.boundingClientRect.top < 0')]],
  ],
  [
    'state never turns off',
    [[T, r(state, "(this.matches(':state(scrolled)') || " + state + ')')]],
  ],
  ['not shown', [[T, r(show, '')]]],
  [
    'shown at the first connect only',
    [
      [
        T,
        (s) =>
          r(
            show,
            'if (!shown) { shown = true; ' + show + ' }',
          )(r(use, '    let shown = false;\n' + use)(s)),
      ],
    ],
  ],
  [
    'window listener, no work',
    [[T, r(use, "    window.addEventListener('scroll', () => {});\n" + use)]],
  ],
  [
    'bare listener, no work',
    [[T, r(use, "    addEventListener('scroll', () => {});\n" + use)]],
  ],
  [
    'document listener, no work',
    [[T, r(use, "    document.addEventListener('scroll', () => {});\n" + use)]],
  ],
  [
    'document listener sets state',
    [
      [
        T,
        r(
          use,
          "    document.addEventListener('scroll', () => toggleState(internals(this), 'scrolled', scrollY > 0));\n" +
            use,
        ),
      ],
    ],
  ],
  ['one more element', [[H, (s) => s + '<div></div>\n']]],
  ['position fixed', [[C, r('position: sticky', 'position: fixed')]]],
  ['slots shrink', [[C, r('flex: none', 'flex: initial')]]],
  [
    'slots not centered',
    [[C, rx(/(flex: none;\n)  align-items: center;\n/, '$1')]],
  ],
  ...[
    'color',
    'font-family',
    'font-size',
    'font-weight',
    'line-height',
    'letter-spacing',
  ].map((p) => [
    'headline without ' + p,
    [[C, rx(new RegExp('  ' + p + ': var\\(--_title-[^;]*;\\n'), '')]],
  ]),
];
for (const [n, es] of M) {
  const o = es.map(([f]) => [f, fs.readFileSync(f, 'utf8')]);
  try {
    for (const [f, m] of es) fs.writeFileSync(f, m(fs.readFileSync(f, 'utf8')));
    fs.rmSync(S + '/r.json', { force: true });
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
          const k = a.fullName.replace('mx-top-app-bar ', '');
          c[k] = (c[k] ?? 0) + 1;
        }
    fs.appendFileSync(
      S + '/mut.txt',
      `## ${n}: passed ${j.numPassedTests} failed ${j.numFailedTests}\n` +
        Object.entries(c)
          .map(([k, v]) => `   ${v}x ${k}\n`)
          .join(''),
    );
  } catch (e) {
    fs.appendFileSync(S + '/mut.txt', `## ${n}: ERROR ${e}\n`);
  } finally {
    for (const [f, s] of o) fs.writeFileSync(f, s);
  }
}
