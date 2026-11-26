// Compares two runs of boxes.mjs: rects that differ, and the pixels of each screenshot.
// Run from the repository root: node .plan/icon-middle-1/probes/compare.mjs <before> <after>
import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
const { PNG } = createRequire(`${process.cwd()}/package.json`)('pngjs');
const [a, b] = process.argv.slice(2);
const ra = JSON.parse(await readFile(`${a}/rects.json`, 'utf8'));
const rb = JSON.parse(await readFile(`${b}/rects.json`, 'utf8'));
console.log(`# ${ra.chromium} / ${rb.chromium}`);
for (const k of Object.keys(ra).filter((k) => k !== 'chromium')) {
  const [x, y] = [JSON.stringify(ra[k]), JSON.stringify(rb[k])];
  console.log(`rects ${k}: ${x === y ? 'same' : `before ${x}\n  after ${y}`}`);
}
for (const f of (await readdir(a)).filter((f) => f.endsWith('.png')).sort()) {
  const [p, q] = [
    PNG.sync.read(await readFile(`${a}/${f}`)),
    PNG.sync.read(await readFile(`${b}/${f}`)),
  ];
  if (p.width !== q.width || p.height !== q.height) {
    console.log(
      `pixels ${f}: size ${p.width}x${p.height} -> ${q.width}x${q.height}`,
    );
    continue;
  }
  let n = 0;
  for (let i = 0; i < p.data.length; i += 4)
    if (p.data.readUInt32BE(i) !== q.data.readUInt32BE(i)) n += 1;
  console.log(`pixels ${f}: ${n === 0 ? 'same' : `${n} differ`}`);
}
