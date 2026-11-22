/**
 * Compares two PNGs pixel by pixel: the number of pixels that differ, the
 * largest difference in any channel, and the bounding box of the differing
 * pixels. `node png-compare.ts <a.png> <b.png>`.
 */
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const [a, b] = process.argv
  .slice(2)
  .map((path) => PNG.sync.read(readFileSync(path!)));

if (a!.width !== b!.width || a!.height !== b!.height) {
  console.log(
    `size differs: ${a!.width}x${a!.height} vs ${b!.width}x${b!.height}`,
  );
  process.exit(0);
}

let pixels = 0;
let max = 0;
let [x0, y0, x1, y1] = [Infinity, Infinity, -1, -1];

for (let y = 0; y < a!.height; y++) {
  for (let x = 0; x < a!.width; x++) {
    const i = (y * a!.width + x) * 4;
    let d = 0;
    for (let c = 0; c < 4; c++) {
      d = Math.max(d, Math.abs(a!.data[i + c]! - b!.data[i + c]!));
    }
    if (d > 0) {
      pixels++;
      max = Math.max(max, d);
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  }
}

console.log(
  pixels === 0
    ? 'equal'
    : `${pixels} of ${a!.width * a!.height} pixels differ, max channel difference ${max}, within x ${x0}..${x1}, y ${y0}..${y1}`,
);
