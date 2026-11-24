import fs from 'node:fs';
import path from 'node:path';
const [S] = process.argv.slice(2);
const walk = (d) =>
  fs
    .readdirSync(d, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? walk(d + '/' + e.name) : [d + '/' + e.name],
    );
const A = walk(S + '/after')
    .map((f) => path.relative(S + '/after', f))
    .sort(),
  B = walk(S + '/before')
    .map((f) => path.relative(S + '/before', f))
    .sort();
console.log(
  'files',
  A.length,
  'same list',
  JSON.stringify(A) === JSON.stringify(B),
);
const mb = JSON.parse(fs.readFileSync(S + '/before.map.json')),
  ma = JSON.parse(fs.readFileSync(S + '/after.map.json'));
console.log(
  'map: same keys in order',
  JSON.stringify(Object.keys(mb)) === JSON.stringify(Object.keys(ma)),
  'each value after = --mx- + before',
  Object.keys(mb).every((k) => ma[k] === '--mx-' + mb[k].slice(2)),
);
const kinds = {};
let diff = [];
let names = new Map();
const ext = (f) =>
  f.endsWith('.js.map')
    ? '.js.map'
    : f.endsWith('.d.ts')
      ? '.d.ts'
      : path.extname(f);
for (const f of A) {
  const a = fs.readFileSync(S + '/after/' + f, 'utf8'),
    b = fs.readFileSync(S + '/before/' + f, 'utf8');
  const k = (kinds[ext(f)] ??= { n: 0, identical: 0, renamed: 0, other: 0 });
  k.n++;
  if (a === b) {
    k.identical++;
    continue;
  }
  if (a.replaceAll('--mx-', '--') === b) k.renamed++;
  else {
    k.other++;
    diff.push(f);
  }
  if (/--_\w/.test(a) && ext(f) === '.js') {
  }
}
console.log(kinds);
console.log('differ otherwise:', diff);
for (const f of A) {
  const a = fs.readFileSync(S + '/after/' + f, 'utf8');
  const x = ext(f);
  if (x === '.js.map') continue;
  for (const [m] of a.matchAll(/--_[\w-]+/g)) {
    const k = x + ' ' + m;
    names.set(k, (names.get(k) ?? new Set()).add(f));
  }
  for (const [m] of a.matchAll(/(?<![\w-])--[a-z]{1,2}(?![\w-])/g)) {
    const k = x + ' SHORT ' + m;
    names.set(k, (names.get(k) ?? new Set()).add(f));
  }
}
console.log(
  'source names / short names left outside source maps (comments included):',
);
for (const [k, v] of names) console.log('  ', k, [...v].slice(0, 3).join(', '));
const after = fs.readFileSync(
  S + '/after/core/styles/elevation/elevation.runtime.js',
  'utf8',
);
console.log(after.slice(0, 400));
