// Probe of the RF-70 feature proof (PR #120): is every built material-x file equal
// to the base build, byte for byte or after mapping the head's short private
// property names back to the base's? Adapted from
// .plan/reviews/list-roles-1/probes/private-props-remap.ts.
// node private-props-remap.ts <dir holding the exports head and base>
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
const W = load('head'),
  M = load('base');
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
for (const p of walk(root('head'))) {
  const rel = relative(root('head'), p);
  const q = join(root('base'), rel);
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
