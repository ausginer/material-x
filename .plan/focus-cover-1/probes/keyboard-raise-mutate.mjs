// Run from packages/material-x, with a clean src:
//   node ../../.plan/focus-cover-1/probes/keyboard-raise-mutate.mjs <engine,...> [name]
// RF-126 (c): applies each mutation to the source, runs the rows of
// button-group-focus.spec, and restores the files.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
const button = 'src/button/styles/default/main.styles.css';
const group = 'src/button-group/styles/connected/main.styles.css';
const script = 'src/button-group/connected-button-group.ts';
const replaced = (from, to) => (source) => {
  if (source.split(from).length !== 2)
    throw new Error(`not one match: ${from}`);
  return source.replace(from, () => to);
};
const zIndex = '  z-index: var(--_focus-z-index);\n';
const declared = '  --_focus-z-index: auto;\n';
const raise = ':host(:state(focus-visible)) ::slotted(*) {';
const isolated = ':host(:state(focus-visible):focus-within) {';
const read = "member.shadowRoot?.activeElement?.matches(':focus-visible'),";
const mutations = [
  ['no mutation', {}],
  ['the button does not read the z-index', { [button]: replaced(zIndex, '') }],
  [
    'the group sets no z-index',
    { [group]: replaced('  --_focus-z-index: 1;\n', '') },
  ],
  [
    'the first member alone is raised',
    { [group]: replaced(raise, raise.replace('*', '[data-first]')) },
  ],
  ['no isolation', { [group]: replaced('  isolation: isolate;\n', '') }],
  ['isolation at rest', { [group]: replaced(isolated, ':host {') }],
  [
    'isolation with any focus inside',
    { [group]: replaced(isolated, ':host(:focus-within) {') },
  ],
  [
    'isolation after focus leaves',
    { [group]: replaced(isolated, ':host(:state(focus-visible)) {') },
  ],
  [
    'every focused button is raised',
    { [button]: replaced(zIndex, '  z-index: 1;\n') },
  ],
  [
    'an unconditional raise, with no declaration on the button',
    {
      [group]: replaced(raise, '::slotted(*) {'),
      [button]: replaced(declared, ''),
    },
  ],
  ['no declaration on the button', { [button]: replaced(declared, '') }],
  [
    'no keydown',
    { [script]: replaced('      keydown: updateFocusVisible,\n', '') },
  ],
  [
    'no focusin',
    { [script]: replaced('      focusin: updateFocusVisible,\n', '') },
  ],
  [
    "the event's target in place of the focused control",
    {
      [script]: (source) =>
        replaced(
          read,
          "member === event.target && member.shadowRoot?.activeElement?.matches(':focus-visible'),",
        )(
          replaced(
            'const updateFocusVisible = () =>',
            'const updateFocusVisible = (event: Event) =>',
          )(source),
        ),
    },
  ],
];
const [engines, only] = process.argv.slice(2);
for (const [name, files] of mutations) {
  if (only && name !== only) continue;
  const sources = Object.keys(files).map((file) => [
    file,
    readFileSync(file, 'utf8'),
  ]);
  try {
    for (const [file, source] of sources)
      writeFileSync(file, files[file](source));
    for (const engine of engines.split(',')) {
      const { stdout, stderr } = spawnSync(
        'aube',
        [
          'exec',
          'vitest',
          'run',
          '-c',
          'vitest.config.ts',
          '--project',
          'spec*',
          'tests/button-group/button-group-focus.spec',
        ],
        {
          env: { ...process.env, MX_TEST_ENGINES: engine, NO_COLOR: '1' },
          encoding: 'utf8',
        },
      );
      const out = stdout + stderr;
      console.log(
        `## ${name} | ${engine} | ${/Tests\s+(.*)/u.exec(out)?.[1] ?? 'no result'}`,
      );
      for (const row of new Set(
        [...out.matchAll(/FAIL\s+(.*)/gu)].map((m) =>
          m[1].replace(/^.*?> /u, ''),
        ),
      ))
        console.log(`   ${row}`);
    }
  } finally {
    for (const [file, source] of sources) writeFileSync(file, source);
  }
}
