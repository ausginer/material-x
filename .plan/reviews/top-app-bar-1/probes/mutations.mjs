import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const T = 'src/top-app-bar/top-app-bar.ts',
  C = 'src/top-app-bar/styles/default/main.styles.css',
  H = 'src/top-app-bar/top-app-bar.tpl.html',
  K = 'src/top-app-bar/styles/default/tokens.ts';
const r = (a, b) => (s) => {
  if (!s.includes(a)) throw new Error('no match: ' + a);
  return s.replace(a, b);
};
const M = [
  ['clean', T, (s) => s + ' '],
  [
    'T top margin 1px',
    T,
    r("'1000000px 1000000px -100%'", "'1px 1000000px -100%'"),
  ],
  [
    'T side margins 0',
    T,
    r("'1000000px 1000000px -100%'", "'1000000px 0px -100%'"),
  ],
  [
    'T scroll listener sets state',
    T,
    r(
      '    use(this, {',
      "    addEventListener('scroll', () => toggleState(internals(this), 'scrolled', scrollY > 0));\n    use(this, {",
    ),
  ],
  ['T default root', T, r('  root: document,\n', '')],
  ['T threshold 0.01', T, r('1e-9', '0.01')],
  ['T threshold 0.0005', T, r('1e-9', '0.0005')],
  [
    'T isIntersecting',
    T,
    r(
      'entries.at(-1)!.intersectionRatio > 0',
      'entries.at(-1)!.isIntersecting',
    ),
  ],
  ['T bottom margin 0', T, r('-100%', '0px')],
  ['T never observes', T, r('observer.observe(document.documentElement);', '')],
  ['T no disconnect', T, r('observer.disconnect();', '')],
  [
    'T observes once in ctor',
    T,
    (s) =>
      r(
        '    use(this, {',
        '    observer.observe(document.documentElement);\n    use(this, {',
      )(
        s
          .replace('        observer.observe(document.documentElement);\n', '')
          .replace('observer.disconnect();', ''),
      ),
  ],
  [
    'T disconnect clears the state',
    T,
    r(
      'observer.disconnect();',
      "observer.disconnect(); internals(this).states.delete('scrolled');",
    ),
  ],
  ['T first entry', T, r('entries.at(-1)!', 'entries[0]!')],
  [
    'T internals role banner',
    T,
    r(
      'useCore(this, [template], {}',
      'useCore(this, [template], { role: "banner" }',
    ),
  ],
  [
    'T role attribute at connect',
    T,
    r(
      'observer.observe(document',
      "this.setAttribute('role','banner'); observer.observe(document",
    ),
  ],
  [
    'T host tabindex',
    T,
    r(
      'observer.observe(document',
      'this.tabIndex = 0; observer.observe(document',
    ),
  ],
  [
    'T scroll listener only',
    T,
    r(
      '    use(this, {',
      "    addEventListener('scroll', () => {});\n    use(this, {",
    ),
  ],
  [
    'T onscroll reads layout',
    T,
    r(
      '    use(this, {',
      '    document.onscroll = () => this.getBoundingClientRect();\n    use(this, {',
    ),
  ],
  ['C no sticky', C, r('  position: sticky;\n', '')],
  ['C position fixed', C, r('position: sticky', 'position: fixed')],
  [
    'C sticky important',
    C,
    r('position: sticky', 'position: sticky !important'),
  ],
  ['C no z-index', C, r('  z-index: 1;\n', '')],
  ['C no inset', C, r('  inset-block-start: 0;\n', '')],
  ['C no border-radius', C, (s) => s.replace(/  border-radius:[^;]+;\n/, '')],
  [
    'C border-radius 4px',
    C,
    (s) => s.replace(/  border-radius:[^;]+;\n/, '  border-radius: 4px;\n'),
  ],
  [
    'C no min-block-size',
    C,
    r('  min-block-size: var(--_container-height);\n', ''),
  ],
  [
    'C fixed block-size',
    C,
    r('min-block-size: var(--_c', 'block-size: var(--_c'),
  ],
  ['C no transition', C, (s) => s.replace(/  transition:[^;]+;\n/, '')],
  [
    'C transition 100ms',
    C,
    r('background-color var(--_scroll-duration)', 'background-color 100ms'),
  ],
  ['C transition linear', C, r('var(--_scroll-easing)', 'linear')],
  ['C transition all', C, r('transition: background-color', 'transition: all')],
  ['C no rest property', C, r('--md-top-app-bar-container-color', '--md-x')],
  [
    'C no scrolled property',
    C,
    r('--md-top-app-bar-on-scroll-container-color', '--md-x'),
  ],
  [
    'C scrolled ignores state',
    C,
    r(':host(:state(scrolled))', ':host(:state(x))'),
  ],
  [
    'C shadow when scrolled',
    C,
    r(
      ':host(:state(scrolled)) {',
      ':host(:state(scrolled)) { box-shadow: 0 1px 2px black;',
    ),
  ],
  [
    'C drop-shadow when scrolled',
    C,
    r(
      ':host(:state(scrolled)) {',
      ':host(:state(scrolled)) { filter: drop-shadow(0 1px 2px black);',
    ),
  ],
  [
    'C host not centered',
    C,
    r('  align-items: center;\n  min-block', '  min-block'),
  ],
  ['C slots not centered', C, r('  align-items: center;\n  gap', '  gap')],
  ['C no gap', C, r('  gap: var(--_icon-button-space);\n', '')],
  ['C gap 2px', C, r('var(--_icon-button-space)', '2px')],
  ['C no icon size', C, r('  font-size: var(--_icon-size);\n', '')],
  ['C no lead color', C, r('  color: var(--_leading-icon-color);\n', '')],
  ['C no trail color', C, r('  color: var(--_trailing-icon-color);\n', '')],
  [
    'C lead takes trail color',
    C,
    r('var(--_leading-icon-color)', 'var(--_trailing-icon-color)'),
  ],
  [
    'C lead edge 0',
    C,
    r('var(--_leading-space) var(--_between', '0 var(--_between'),
  ],
  [
    'C lead between 0',
    C,
    r('var(--_leading-space) var(--_between-space)', 'var(--_leading-space) 0'),
  ],
  [
    'C trail between 0',
    C,
    r('var(--_between-space) var(--_trailing', '0 var(--_trailing'),
  ],
  [
    'C trail edge 0',
    C,
    r(
      'var(--_between-space) var(--_trailing-space)',
      'var(--_between-space) 0',
    ),
  ],
  [
    'C headline space 0',
    C,
    r('margin-inline: var(--_headline-space)', 'margin-inline: 0'),
  ],
  [
    'C physical margins',
    C,
    (s) =>
      s
        .replaceAll('margin-inline-start', 'margin-left')
        .replaceAll('margin-inline-end', 'margin-right'),
  ],
  [
    'C physical lead',
    C,
    r(
      'margin-inline: var(--_leading-space) var(--_between-space)',
      'margin: 0 var(--_between-space) 0 var(--_leading-space)',
    ),
  ],
  ['C lead rule off', C, r('.lead:has-slotted + .headline', '.x + .headline')],
  ['C trail rule off', C, r('.headline:has(+ .trail:has-slotted)', '.x')],
  [
    'C empty slots displayed',
    C,
    r('  display: none;\n  flex: none', '  display: flex;\n  flex: none'),
  ],
  [
    'C edge insets on host',
    C,
    (s) =>
      r(
        '  display: flex;\n  align-items',
        '  padding-inline: 4px;\n  display: flex;\n  align-items',
      )(s)
        .replace('var(--_leading-space) var(--_b', '0 var(--_b')
        .replace(
          'var(--_between-space) var(--_trailing-space)',
          'var(--_between-space) 0',
        )
        .replace(
          'margin-inline: var(--_headline-space)',
          'margin-inline: 12px',
        ),
  ],
  ...[
    'color: var(--_title-color)',
    'font-family: var(--_title-font-font-name)',
    'font-size: var(--_title-font-font-size)',
    'font-weight: var(--_title-font-font-weight)',
    'line-height: var(--_title-font-line-height)',
    'letter-spacing: var(--_title-font-font-tracking)',
  ].map((d) => [
    'C headline no ' + d.split(':')[0],
    C,
    r('  ' + d + ';\n', ''),
  ]),
  ['C slotted margin', C, r('  margin: 0;\n', '')],
  ['C slotted font', C, r('  font: inherit;\n', '')],
  ['C slotted important', C, r('font: inherit', 'font: inherit !important')],
  ['C slotted font-size only', C, r('font: inherit', 'font-size: inherit')],
  ['C no overflow-wrap', C, r('  overflow-wrap: anywhere;\n', '')],
  ['C no min-inline-size', C, r('  min-inline-size: 0;\n', '')],
  ['C nowrap', C, r('overflow-wrap: anywhere', 'white-space: nowrap')],
  [
    'C ellipsis',
    C,
    r(
      'overflow-wrap: anywhere',
      'white-space: nowrap; overflow: hidden; text-overflow: ellipsis',
    ),
  ],
  [
    'C headline clips one line',
    C,
    r(
      'overflow-wrap: anywhere',
      'overflow-wrap: anywhere; overflow: hidden; max-block-size: 28px',
    ),
  ],
  [
    'C headline clips two lines',
    C,
    r(
      'overflow-wrap: anywhere',
      'overflow-wrap: anywhere; overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3',
    ),
  ],
  ['C slots shrink', C, r('flex: none', 'flex: initial')],
  ['C headline no flex', C, r('  flex: 1;\n', '')],
  ['H order', H, (s) => s.split('\n').filter(Boolean).reverse().join('\n')],
  [
    'H wrapper',
    H,
    (s) =>
      s.replace(
        '<slot class="headline"></slot>',
        '<div><slot class="headline"></slot></div>',
      ),
  ],
  ['K between 5px', K, r("'between-space': '4px'", "'between-space': '5px'")],
  [
    'K headline 15px',
    K,
    r("'headline.space': '16px'", "'headline.space': '15px'"),
  ],
  ['K no scrolled state', K, r("'state', 'scrolled'", "'state', 'x'")],
  [
    'K excluded elevation read',
    K,
    r("  'container.color',", "  'container.color', 'container.elevation',"),
  ],
];
const only = process.argv[3];
const out = process.argv[2];
for (const [n, f, m] of M) {
  if (only && !n.includes(only)) continue;
  const o = fs.readFileSync(f, 'utf8');
  let x;
  try {
    x = m(o);
  } catch (e) {
    fs.appendFileSync(out, `## ${n}: ${e.message}\n`);
    continue;
  }
  try {
    fs.writeFileSync(f, x);
    const p = spawnSync(
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
        '--outputFile=/tmp/top-app-bar-proof/r.json',
      ],
      {
        encoding: 'utf8',
        env: { ...process.env, MX_TEST_ENGINES: 'chromium,firefox,webkit' },
      },
    );
    fs.writeFileSync('/tmp/top-app-bar-proof/last.txt', p.stdout + p.stderr);
    const j = JSON.parse(
      fs.readFileSync('/tmp/top-app-bar-proof/r.json', 'utf8'),
    );
    const c = {};
    for (const t of j.testResults)
      for (const a of t.assertionResults)
        if (a.status === 'failed') c[a.fullName] = (c[a.fullName] ?? 0) + 1;
    const fileErr = j.testResults.filter(
      (t) =>
        t.status === 'failed' &&
        !t.assertionResults.some((a) => a.status === 'failed'),
    ).length;
    fs.appendFileSync(
      out,
      `## ${n}: passed ${j.numPassedTests} failed ${j.numFailedTests}${fileErr ? ' FILE-ERR ' + fileErr : ''}\n` +
        Object.entries(c)
          .map(([k, v]) => `   ${v}x ${k}\n`)
          .join(''),
    );
  } finally {
    fs.writeFileSync(f, o);
  }
}
fs.appendFileSync(out, 'DONE\n');
