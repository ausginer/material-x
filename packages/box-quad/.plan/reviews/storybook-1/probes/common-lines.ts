// Lists normalized lines of at least `min` characters that two sets of files share.
import { readFileSync } from 'node:fs';
const [min, ...rest] = process.argv.slice(2);
const split = rest.indexOf('--');
const ours = rest.slice(0, split),
  theirs = rest.slice(split + 1);
const norm = (l: string) =>
  l
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[;,{}]$/g, '');
const lines = (files: string[]) =>
  new Map(
    files
      .flatMap((f) =>
        readFileSync(f, 'utf8')
          .split('\n')
          .map((l, i) => [norm(l), `${f.split('/').pop()}:${i + 1}`] as const),
      )
      .filter(([l]) => l.length >= Number(min)),
  );
const a = lines(ours),
  b = lines(theirs);
let n = 0;
for (const [l, at] of a)
  if (b.has(l)) {
    n++;
    console.log(`${at}  ~  ${b.get(l)}  | ${l}`);
  }
console.log(`shared lines of ${min}+ characters: ${n}`);
