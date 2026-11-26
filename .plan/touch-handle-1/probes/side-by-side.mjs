// Writes each named screenshot of two runs of boxes.mjs side by side, before on the left, scaled 3x.
// Run from the repository root: node .plan/touch-handle-1/probes/side-by-side.mjs <before> <after> <out-dir> <name>...
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const { PNG } = createRequire(`${process.cwd()}/package.json`)('pngjs');
const [before, after, out, ...names] = process.argv.slice(2);
await mkdir(out, { recursive: true });
const SCALE = 3;
const GAP = 4;
for (const name of names) {
  const a = PNG.sync.read(await readFile(`${before}/${name}.png`));
  const b = PNG.sync.read(await readFile(`${after}/${name}.png`));
  const width = (a.width + GAP + b.width) * SCALE;
  const height = Math.max(a.height, b.height) * SCALE;
  const image = new PNG({ width, height });
  image.data.fill(255);
  const put = (source, left) => {
    for (let y = 0; y < source.height * SCALE; y += 1) {
      for (let x = 0; x < source.width * SCALE; x += 1) {
        const from =
          (Math.floor(y / SCALE) * source.width + Math.floor(x / SCALE)) * 4;
        source.data.copy(
          image.data,
          (y * width + left + x) * 4,
          from,
          from + 4,
        );
      }
    }
  };
  put(a, 0);
  put(b, (a.width + GAP) * SCALE);
  await writeFile(`${out}/${name}.png`, PNG.sync.write(image));
}
