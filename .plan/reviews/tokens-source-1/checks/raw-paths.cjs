// Prints every key path in the raw tables, arrays collapsed to [], with a
// count, and never a value. A key that isn't an identifier-like word
// (an id, a path, a number) is collapsed to <key>.
const fs = require('fs'),
  path = require('path');
const dir = process.argv[2];
const paths = new Map();
const word = /^[A-Za-z_][A-Za-z0-9_]{0,40}$/u;
const walk = (v, p) => {
  if (Array.isArray(v)) {
    for (const x of v) walk(x, p + '[]');
    return;
  }
  if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v))
      walk(x, `${p}.${word.test(k) ? k : '<key>'}`);
    return;
  }
  paths.set(p, (paths.get(p) ?? 0) + 1);
};
for (const f of fs.readdirSync(dir))
  walk(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')), 'T');
for (const [p, n] of [...paths].sort()) console.log(n, p);
