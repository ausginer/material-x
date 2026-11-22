// Probe of the useSlot feature proof (PR #125): compare two `just size-reading` outputs row by row.
// node size-compare.mjs <base.json> <head.json>
import { readFileSync } from 'node:fs';
const rows = (f) =>
  new Map(
    JSON.parse(readFileSync(f, 'utf8')).rows.map((r) => [
      `${r.package}:${r.row}`,
      r,
    ]),
  );
const [base, head] = process.argv.slice(2).map(rows);
let moved = 0;
for (const [key, r] of head) {
  const b = base.get(key);
  console.log(
    `${key}\tbrotli ${b?.brotli} -> ${r.brotli}\tgzip ${b?.gzip} -> ${r.gzip}\tlimit ${r.limit}`,
  );
  if (!b || b.brotli !== r.brotli || b.gzip !== r.gzip) moved += 1;
}
console.log(
  `rows ${head.size}, base rows ${base.size}, rows that move ${moved}`,
);
