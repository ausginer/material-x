// Run from the repository root:
//   node .plan/reviews/icon-name-1/probes/mutate-trees.mjs <engine> <mutation> <out file>
// Applies one mutation to the icon's sources, builds the packages, runs
// trees.ts on the build, restores the sources and builds again.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TPL = 'packages/material-x/src/icon/icon.tpl.html';
const SOURCE = 'packages/material-x/src/icon/icon.ts';
const SHEET = 'packages/material-x/src/icon/styles/icon.ctr.css';
const MAIN = 'ee0afea12';
const CALL =
  "this.shadowRoot!.querySelector('slot')!.setAttribute('aria-hidden', 'true');";
const BOX = 'slot {\n  display: inline;\n}\n';
const [engine, name, out] = process.argv.slice(2);
const originals = new Map(
  [TPL, SOURCE, SHEET].map((f) => [f, readFileSync(f, 'utf8')]),
);
const swap = (file, from, to) => {
  const text = originals.get(file);
  if (text.split(from).length !== 2) throw new Error(`not once: ${from}`);
  return { [file]: text.replace(from, () => to) };
};
const main = (file) =>
  execFileSync('git', ['show', `${MAIN}:${file}`], { encoding: 'utf8' });
const MUTATIONS = {
  main: { [TPL]: main(TPL), [SOURCE]: main(SOURCE), [SHEET]: main(SHEET) },
  'no display': swap(SHEET, BOX, ''),
  'in the template only': {
    [TPL]: '<slot aria-hidden="true"></slot>\n',
    ...swap(SOURCE, CALL, ''),
  },
};
const build = () =>
  execFileSync('aube', ['exec', 'just', 'build'], { stdio: 'ignore' });
const restore = () => {
  for (const [file, text] of originals) writeFileSync(file, text);
};
try {
  for (const [file, text] of Object.entries(MUTATIONS[name]))
    writeFileSync(file, text);
  build();
  const { stdout, stderr } = spawnSync(
    'node',
    ['.plan/reviews/icon-name-1/probes/trees.ts', resolve('packages'), engine],
    { encoding: 'utf8', maxBuffer: 1e8 },
  );
  writeFileSync(out, `# mutation: ${name}\n${stdout}${stderr}`);
} finally {
  restore();
  build();
}
