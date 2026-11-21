// Probe of the feature proof of RF-68's second re-ruling: is every built file
// outside the changed list modules equal to main's, byte for byte or after
// mapping the branch's short private property names back to main's?
//
// node private-props-remap.ts <dir holding the worktrees wt (branch) and mn (main)>
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
const S = process.argv[2]!;
const load = (t: string) =>
  JSON.parse(
    readFileSync(
      `${S}/${t}/node_modules/.cache/css/css-private-props.json`,
      'utf8',
    ),
  ) as Record<string, string>;
const W = load('wt'),
  M = load('mn');
const keys = (x: Record<string, string>) =>
  JSON.stringify(Object.keys(x).sort());
console.log(
  'names',
  Object.keys(W).length,
  Object.keys(M).length,
  'same set',
  keys(W) === keys(M),
  'renamed',
  Object.keys(W).filter((k) => W[k] !== M[k]).length,
);
const back = new Map(
  Object.entries(W).map(([long, short]) => [short, M[long]!]),
);
const root = (t: string) => `${S}/${t}/packages/material-x`;
const walk = (d: string): string[] =>
  readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    if (
      f === 'node_modules' ||
      f === 'src' ||
      f === 'tests' ||
      f.startsWith('.')
    )
      return [];
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : [];
  });
let same = 0,
  renamedOnly = 0;
const differ: string[] = [],
  missing: string[] = [];
for (const p of walk(root('wt'))) {
  const rel = relative(root('wt'), p);
  const q = join(root('mn'), rel);
  if (!existsSync(q)) {
    missing.push(rel);
    continue;
  }
  const a = readFileSync(p, 'utf8'),
    b = readFileSync(q, 'utf8');
  if (a === b) {
    same++;
    continue;
  }
  const mapped = a.replace(
    /--([a-z]{1,2})(?![\w-])/g,
    (all, s) => back.get(`--${s}`) ?? all,
  );
  if (mapped === b) renamedOnly++;
  else differ.push(rel);
}
console.log({ same, renamedOnly, differ, missing });
