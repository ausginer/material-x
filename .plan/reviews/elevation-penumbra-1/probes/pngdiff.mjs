// Pixel diff of two PNGs: count, bounding box, and a sample of differing pixels.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(process.argv[2] + '/');
const { PNG } = require('pngjs');
const [a, b] = [process.argv[3], process.argv[4]].map((f) =>
  PNG.sync.read(readFileSync(f)),
);
console.log(`size a ${a.width}x${a.height} b ${b.width}x${b.height}`);
let n = 0,
  minX = 1e9,
  minY = 1e9,
  maxX = -1,
  maxY = -1,
  maxD = 0;
const sample = [];
for (let y = 0; y < Math.min(a.height, b.height); y++)
  for (let x = 0; x < Math.min(a.width, b.width); x++) {
    const i = (y * a.width + x) * 4,
      j = (y * b.width + x) * 4;
    const d = [0, 1, 2, 3].map((k) => Math.abs(a.data[i + k] - b.data[j + k]));
    const m = Math.max(...d);
    if (m) {
      n++;
      maxD = Math.max(maxD, m);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      if (sample.length < 12)
        sample.push(
          `(${x},${y}) a=${[...a.data.slice(i, i + 4)]} b=${[...b.data.slice(j, j + 4)]}`,
        );
    }
  }
console.log(
  `differing ${n} px, max channel delta ${maxD}, bbox x ${minX}-${maxX} y ${minY}-${maxY}`,
);
console.log(sample.join('\n'));
