// Compare four size readings: base, head (this pass) and the committed before/after.
import { readFileSync } from 'node:fs';
const rows = (f) => {
  const j = JSON.parse(readFileSync(f, 'utf8'));
  const list = Array.isArray(j) ? j : (j.rows ?? Object.values(j));
  return new Map(
    list.map((r) => [`${r.package}:${r.row}`, r.brotli ?? r.size]),
  );
};
const [b, h, cb, ca] = process.argv.slice(2).map(rows);
let mismatch = 0;
for (const [k, v] of h) {
  if (v !== ca.get(k) || b.get(k) !== cb.get(k)) mismatch++;
  if (v !== b.get(k) || v !== ca.get(k) || b.get(k) !== cb.get(k))
    console.log(
      `${k}\tbase ${b.get(k)}\thead ${v}\tdelta ${v - b.get(k)}\tcommitted ${cb.get(k)} -> ${ca.get(k)}`,
    );
}
console.log(
  `rows ${h.size}, rows where this pass and the committed readings disagree: ${mismatch}`,
);
