// Is every built material-x file equal to the base build, byte for byte or after
// mapping the head's short private property names back to the base's?
// node remap.ts <dir holding build-head and build-base>
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
const S = process.argv[2]!;
const load = (t: string) =>
  JSON.parse(readFileSync(`${S}/build-${t}/names.json`, 'utf8')) as Record<
    string,
    string
  >;
const H = load('head'),
  B = load('base');
const back = new Map(
  Object.entries(H).map(([long, short]) => [short, B[long]!]),
);
const walk = (d: string): string[] =>
  readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : [];
  });
const same: string[] = [],
  renamedOnly: string[] = [],
  differ: string[] = [],
  missing: string[] = [];
for (const p of walk(`${S}/build-head`)) {
  const rel = relative(`${S}/build-head`, p),
    q = join(`${S}/build-base`, rel);
  if (!existsSync(q)) {
    missing.push(rel);
    continue;
  }
  const a = readFileSync(p, 'utf8'),
    b = readFileSync(q, 'utf8');
  if (a === b) {
    same.push(rel);
    continue;
  }
  const mapped = a.replace(
    /--([a-z]{1,2})(?![\w-])/g,
    (all, s) => back.get(`--${s}`) ?? all,
  );
  (mapped === b ? renamedOnly : differ).push(rel);
}
const gone = walk(`${S}/build-base`)
  .map((p) => relative(`${S}/build-base`, p))
  .filter((r) => !existsSync(join(`${S}/build-head`, r)));
console.log(
  JSON.stringify(
    { same: same.length, renamedOnly, differ, missing, onlyInBase: gone },
    null,
    1,
  ),
);
