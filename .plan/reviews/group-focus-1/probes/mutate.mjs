// Run from packages/material-x, with a clean src:
//   node ../../.plan/reviews/group-focus-1/probes/mutate.mjs <engine,...> [name]
// The proof of RF-126 (c): applies mutations that the implementer did not to the source, runs the rows of
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
  [
    'the two rules in the other order',
    {
      [group]: (s) => {
        const a = s.indexOf(':host(:state(focus-visible):focus-within) {');
        const b = s.indexOf(':host(:state(focus-visible)) ::slotted(*) {');
        return s.slice(0, a) + s.slice(b) + '\n' + s.slice(a, b);
      },
    },
  ],
  [
    'any focus of the control sets the state',
    { [script]: replaced("matches(':focus-visible')", "matches(':focus')") },
  ],
  [
    'the first child alone is read',
    {
      [script]: replaced(
        'Array.from(this.children).some',
        'Array.from(this.children).slice(0, 1).some',
      ),
    },
  ],
  [
    'the state is never cleared',
    {
      [script]: replaced(
        '        Array.from(this.children)',
        "        innards.states.has('focus-visible') || Array.from(this.children)",
      ),
    },
  ],
  [
    'the raise is not bound to the state',
    { [group]: replaced(raise, '::slotted(*) {') },
  ],
  [
    'the group raises by :focus-within alone',
    { [group]: replaced(raise, ':host(:focus-within) ::slotted(*) {') },
  ],
  [
    'the z-index is 1 on the last member too, always',
    {
      [group]: (s) => s + '\n::slotted([data-last]) { --_focus-z-index: 1; }\n',
    },
  ],
  [
    'only a focused member in light DOM children[last] is ignored',
    {
      [script]: replaced(
        'Array.from(this.children).some',
        'Array.from(this.children).slice(0, -1).some',
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
