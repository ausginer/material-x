// Proof 5: the rows whose Brotli or gzip bytes differ between two size
// readings that `just size-reading` wrote.
// Usage: node size-compare.ts BASE.json HEAD.json
import { readFile } from 'node:fs/promises';

type Row = Readonly<{
  package: string;
  row: string;
  brotli: number;
  gzip: number | null;
}>;

const [base, head] = await Promise.all(
  process.argv
    .slice(2, 4)
    .map(
      async (file) =>
        (JSON.parse(await readFile(file, 'utf8')) as { rows: Row[] }).rows,
    ),
);
const key = (row: Row): string => `${row.package} ${row.row}`;
const before = new Map(base!.map((row) => [key(row), row]));
let moved = 0;
for (const row of head!) {
  const old = before.get(key(row));
  if (!old) {
    console.log(`only in head: ${key(row)}`);
    moved += 1;
  } else if (old.brotli !== row.brotli || old.gzip !== row.gzip) {
    console.log(`${key(row)}: ${old.brotli} -> ${row.brotli} Brotli`);
    moved += 1;
  }
}
console.log(
  `rows: ${base!.length} base, ${head!.length} head; moved: ${moved}`,
);
