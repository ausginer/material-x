import fs from 'node:fs';
import path from 'node:path';
const S = process.argv[2];
const walk = (d) =>
  fs
    .readdirSync(d, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? walk(d + '/' + e.name) : [d + '/' + e.name],
    );
let same = 0,
  ren = 0,
  other = [],
  withMx = 0,
  withSrc = 0;
for (const f of walk(S + '/after').filter((f) => f.endsWith('.js.map'))) {
  const a = JSON.parse(fs.readFileSync(f)),
    b = JSON.parse(fs.readFileSync(f.replace('/after/', '/before/')));
  const x = JSON.stringify(a.sourcesContent),
    y = JSON.stringify(b.sourcesContent);
  if (x === y) same++;
  else if (x.replaceAll('--mx-', '--') === y) ren++;
  else other.push(f);
  if (/--mx-/.test(x)) withMx++;
  if (/--_\w/.test(x)) withSrc++;
}
console.log({ sourcesContentSame: same, renamed: ren, other, withMx, withSrc });
