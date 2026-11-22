import { readFileSync } from 'node:fs';
const [a, b, c, d] = process.argv
  .slice(2)
  .map((p) => JSON.parse(readFileSync(p, 'utf8')));
const rows = (r: any): Map<string, number> =>
  new Map((r.rows ?? r).map((x: any) => [`${x.package}:${x.row}`, x.brotli]));
const [mineBase, mineHead, recBase, recHead] = [a, b, c, d].map(rows);
let diff = 0;
for (const [k, v] of mineHead) {
  const line = [
    k,
    mineBase.get(k),
    v,
    v - (mineBase.get(k) ?? NaN),
    recBase.get(k),
    recHead.get(k),
  ];
  if (mineBase.get(k) !== recBase.get(k) || v !== recHead.get(k)) diff++;
  if (k.startsWith('material-x') || v !== mineBase.get(k))
    console.log(line.join('\t'));
}
console.log('rows', mineHead.size, 'differing from the record:', diff);
