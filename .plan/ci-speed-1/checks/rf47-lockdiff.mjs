import { readFileSync } from 'node:fs';
const [a, b] = process.argv
  .slice(2)
  .map((p) => JSON.parse(readFileSync(p, 'utf8')));
const A = a.packages,
  B = b.packages;
const out = { added: [], removed: [], changed: [], fieldOnly: [] };
for (const k of Object.keys(A))
  if (!(k in B)) out.removed.push(`${k}@${A[k].version}`);
for (const k of Object.keys(B))
  if (!(k in A)) out.added.push(`${k}@${B[k].version}`);
for (const k of Object.keys(A))
  if (k in B) {
    if (A[k].version !== B[k].version)
      out.changed.push(`${k}: ${A[k].version} -> ${B[k].version}`);
    else if (JSON.stringify(A[k]) !== JSON.stringify(B[k])) {
      const keys = new Set([...Object.keys(A[k]), ...Object.keys(B[k])]);
      const d = [...keys].filter(
        (f) => JSON.stringify(A[k][f]) !== JSON.stringify(B[k][f]),
      );
      out.fieldOnly.push(`${k} [${d.join(',')}]`);
    }
  }
console.log(
  'top-level keys differ:',
  JSON.stringify(
    Object.keys(a).filter(
      (k) => k !== 'packages' && JSON.stringify(a[k]) !== JSON.stringify(b[k]),
    ),
  ),
);
for (const [n, l] of Object.entries(out)) {
  console.log(`== ${n}: ${l.length}`);
  for (const x of l) console.log('  ' + x);
}
