// Run from the repository root, with the packages built:
//   node .plan/hidden-1/probes/mutate.mjs <engine,...>
// RF-121: applies each mutation to its source, runs the rows of `hidden`, and
// restores the source.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
const CSS = 'packages/material-x/src/core/styles/host/host.styles.css';
const CORE = 'packages/material-x/src/core/utils/useCore.ts';
const LIST = 'packages/material-x/src/list/styles/item/main.styles.css';
const AVATAR = "[data-avatar]:not([hidden]:not([hidden='until-found' i]))";
const RULE = ":host([hidden]:not([hidden='until-found' i]))";
const originals = new Map(
  [CSS, CORE, LIST].map((file) => [file, readFileSync(file, 'utf8')]),
);
const once = (file, from, to) => {
  const source = originals.get(file);
  if (source.split(from).length !== 2) throw new Error(`not once: ${from}`);
  return [file, source.replace(from, () => to)];
};
const mutations = [
  ['no mutation'],
  ['not adopted, as on main', once(CORE, '[...styles, hostStyles]', 'styles')],
  [
    'adopted before the component',
    once(CORE, '[...styles, hostStyles]', '[hostStyles, ...styles]'),
  ],
  ['without the until-found exception', once(CSS, RULE, ':host([hidden])')],
  ['until-found in lower case alone', once(CSS, "' i]", "']")],
  [
    'with no specificity of the attributes',
    once(CSS, RULE, ":host(:where([hidden]:not([hidden='until-found' i])))"),
  ],
  ['important', once(CSS, 'display: none;', 'display: none !important;')],
  [
    'the empty value alone',
    once(CSS, RULE, ":host([hidden='']:not([hidden=x]))"),
  ],
  ['every avatar, as before', once(LIST, AVATAR, '[data-avatar]')],
  ['no avatar with hidden', once(LIST, AVATAR, '[data-avatar]:not([hidden])')],
  [
    "the selector on the avatar's whole rule",
    once(LIST, '::slotted([data-avatar]) {', `::slotted(${AVATAR}) {`),
  ],
  ["the avatar's until-found in lower case alone", once(LIST, "' i]", "']")],
];
const restore = () => {
  for (const [file, source] of originals) writeFileSync(file, source);
};
try {
  for (const [name, edit] of mutations) {
    restore();
    if (edit) writeFileSync(...edit);
    for (const engine of process.argv[2].split(',')) {
      const { stdout, stderr } = spawnSync(
        'aube',
        [
          'exec',
          'vitest',
          'run',
          '-c',
          'vitest.config.ts',
          'tests/core/hidden',
        ],
        {
          cwd: 'packages/material-x',
          encoding: 'utf8',
          env: { ...process.env, NO_COLOR: '1', MX_TEST_ENGINES: engine },
          maxBuffer: 1e8,
        },
      );
      const lines = `${stdout}${stderr}`.split('\n');
      console.log(
        `## ${name} | ${engine} | ${lines.find((l) => /^ +Tests /u.test(l))?.trim() ?? 'no result'}`,
      );
      for (const line of new Set(lines.filter((l) => l.includes('FAIL '))))
        console.log(
          `   ${line.replace(/^.*?test\.ts(?::\d+)? > /u, '').trim()}`,
        );
    }
  }
} finally {
  restore();
}
