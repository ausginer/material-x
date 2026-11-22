// Differing pixels of two PNGs, bucketed by 56 px item row starting at y=24.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(process.argv[2] + '/');
const { PNG } = require('pngjs');
const [a, b] = [process.argv[3], process.argv[4]].map((f) =>
  PNG.sync.read(readFileSync(f)),
);
const rows = {};
for (let y = 0; y < a.height; y++)
  for (let x = 0; x < a.width; x++) {
    const i = (y * a.width + x) * 4;
    if ([0, 1, 2, 3].some((k) => a.data[i + k] !== b.data[i + k])) {
      const r = Math.floor((y - 24) / 56);
      rows[r] = (rows[r] ?? 0) + 1;
    }
  }
console.log(JSON.stringify(rows));
