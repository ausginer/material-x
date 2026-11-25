// Run from packages/material-x, with a scratch directory as the argument:
//   node ../../.plan/top-app-bar-1/probes/mutations-2.mjs <scratch>
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
const state = 'entries.at(-1)!.boundingClientRect.top < 0',
  margin = "'10000000px 1000000px -100%'",
  threshold = '  threshold: 1e-9,\n',
  size = '  inline-size: 1px;\n  block-size: 1px;\n',
  noSize = '  inline-size: 0;\n  block-size: 0;\n',
  open = 'if (scrollStart.isConnected) {',
  show = 'scrollStart.showPopover();';
// The options of `8f5ad01db`: the viewport is the area.
const viewport = (s) => r(threshold, '')(r(margin, "'0px 1000000px'")(s));
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
          )(r(state, 'entries.at(-1)!.intersectionRatio > 0')(s)),
      ],
    ],
  ],
  [
    'the options, box and state of 8f5ad01db',
    [
      [T, (s) => r(state, '!entries.at(-1)!.isIntersecting')(viewport(s))],
      [C, r(size, noSize)],
    ],
  ],
  ['viewport as the area, state from the box top', [[T, viewport]]],
  [
    'an entry that is not intersecting is ignored',
    [
      [
        T,
        (s) =>
          r(
            'toggleState(',
            'if (entries.at(-1)!.isIntersecting) toggleState(',
          )(s),
      ],
    ],
  ],
  ['box 2px below the start', [[C, r('  inset: 0;', '  inset: 2px 0 0;')]]],
  ['box without a size', [[C, r(size, noSize)]]],
  ['no threshold', [[T, r(threshold, '')]]],
  ['top margin 100000000px', [[T, r(margin, "'100000000px 1000000px -100%'")]]],
  ['side margins 0', [[T, r(margin, "'10000000px 0px -100%'")]]],
  ['default root', [[T, r('  root: document,\n', '')]]],
  ['popover auto', [[H, r('manual', 'auto')]]],
  ['popover hint', [[H, r('manual', 'hint')]]],
  [
    'nothing at a connect while the box is open',
    [
      [
        T,
        r(
          open,
          "if (scrollStart.isConnected && !scrollStart.matches(':popover-open')) {",
        ),
      ],
    ],
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
  ['no connected check', [[T, r('if (scrollStart.isConnected) {', '{')]]],
  [
    'started at the first connect only, also one while disconnected',
    [
      [
        T,
        (s) =>
          r(
            'if (scrollStart.isConnected) {',
            'if (started) { return; }\n started = true;\n if (scrollStart.isConnected) {',
          )(r(use, '    let started = false;\n' + use)(s)),
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
// Added for the second recheck.
M.push(
  [
    'state from isIntersecting',
    [[T, r(state, 'entries.at(-1)!.isIntersecting')]],
  ],
  [
    'state from the ratio',
    [[T, r(state, 'entries.at(-1)!.intersectionRatio > 0')]],
  ],
  [
    'state at or above 0',
    [[T, r('boundingClientRect.top < 0', 'boundingClientRect.top <= 0')]],
  ],
  ['first entry', [[T, r('entries.at(-1)!', 'entries[0]!')]]],
  ['threshold 1', [[T, r('threshold: 1e-9', 'threshold: 1')]]],
  ['top margin 0', [[T, r(margin, "'0px 1000000px -100%'")]]],
  ['top margin 1000000px', [[T, r(margin, "'1000000px 1000000px -100%'")]]],
  ['bottom margin -99%', [[T, r(margin, "'10000000px 1000000px -99%'")]]],
  ['bottom margin -101%', [[T, r(margin, "'10000000px 1000000px -101%'")]]],
  [
    'box without a block size',
    [[C, r('  block-size: 1px;', '  block-size: 0;')]],
  ],
  [
    'box without an inline size',
    [[C, r('  inline-size: 1px;', '  inline-size: 0;')]],
  ],
  [
    'box of 20px',
    [[C, r(size, '  inline-size: 20px;\n  block-size: 20px;\n')]],
  ],
  ['box visible', [[C, r('  visibility: hidden;\n', '')]]],
  [
    'box position fixed',
    [
      [
        C,
        r(
          '  position: absolute;\n  inset: 0;',
          '  position: fixed;\n  inset: 0;',
        ),
      ],
    ],
  ],
  [
    'a hidden bar turns off at the next scroll only',
    [[T, r('toggleState(', 'if (scrollStart.checkVisibility()) toggleState(')]],
  ],
);
for (const [n, es] of M) {
  const o = es.map(([f]) => [f, fs.readFileSync(f, 'utf8')]);
  try {
    for (const [f, m] of es) fs.writeFileSync(f, m(fs.readFileSync(f, 'utf8')));
    const c = {};
    let passed = 0,
      failed = 0;
    for (const engine of ['chromium', 'firefox', 'webkit']) {
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
        { encoding: 'utf8', env: { ...process.env, MX_TEST_ENGINES: engine } },
      );
      const j = JSON.parse(fs.readFileSync(S + '/r.json', 'utf8'));
      passed += j.numPassedTests;
      failed += j.numFailedTests;
      for (const t of j.testResults)
        for (const a of t.assertionResults)
          if (a.status === 'failed')
            (c[a.fullName.replace('mx-top-app-bar ', '')] ??= []).push(engine);
    }
    fs.appendFileSync(
      S + '/mut-3.txt',
      `## ${n}: passed ${passed} failed ${failed}\n` +
        Object.entries(c)
          .map(([k, v]) => `   ${v.length === 3 ? '3x' : v.join('+')} ${k}\n`)
          .join(''),
    );
  } catch (e) {
    fs.appendFileSync(S + '/mut-3.txt', `## ${n}: ERROR ${e}\n`);
  } finally {
    for (const [f, s] of o) fs.writeFileSync(f, s);
  }
}
