// For each classified row (rule 5) outside the two indexes, print the link text, old and new target.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const [gitDir, tsv, B, A] = process.argv.slice(2);
const show = (r, p) =>
  execFileSync('git', ['-C', gitDir, 'show', `${r}:${p}`], {
    encoding: 'utf8',
    maxBuffer: 1 << 30,
  }).split('\n');
const cache = new Map();
const get = (r, p) => {
  const k = r + p;
  if (!cache.has(k)) cache.set(k, show(r, p));
  return cache.get(k);
};
const seen = new Set();
const LINK = /\[((?:[^\[\]]|\[[^\]]*\])*)\]\(([^)\s]+)\)/g;
for (const row of readFileSync(tsv, 'utf8').trim().split('\n')) {
  const [cls, loc] = row.split('\t');
  if (seen.has(loc)) continue;
  seen.add(loc);
  const [file, ln] = [
    loc.slice(0, loc.lastIndexOf(':')),
    +loc.slice(loc.lastIndexOf(':') + 1),
  ];
  if (file.endsWith('00-index.md')) {
    console.log(`${cls}\t${loc}\t(index; skipped)`);
    continue;
  }
  const b = [...get(B, file)[ln - 1].matchAll(LINK)];
  const a = [...get(A, file)[ln - 1].matchAll(LINK)];
  b.forEach((m, i) => {
    if (a[i] && a[i][2] !== m[2])
      console.log(`${cls}\t${loc}\t[${m[1]}]\t${m[2]} -> ${a[i][2]}`);
  });
}
