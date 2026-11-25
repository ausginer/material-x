// How much `complete` moves by private names and entry order alone, beside the
// difference that a change makes. Each tree is a clone at a commit, with
// `.scripts/size-reading.ts` run in it, which builds it.
//
// node complete-noise.mjs <directory of trees> <base> <head> [<base> <head> ...]
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { brotliCompressSync, gzipSync } from 'node:zlib';

const NAME_RUNS = 200;
const ORDER_RUNS = 60;
const PREFIX = '--mx-';
const [dirArgument, ...pairs] = process.argv.slice(2);
const dir = resolve(dirArgument);
const refs = [...new Set(pairs)];
const { rolldown } = await import(
  createRequire(join(dir, refs[0], 'package.json')).resolve('rolldown')
);

const brotli = (text) => brotliCompressSync(text).length;
const gzip = (text) => gzipSync(text, { level: 9 }).length;
const raw = (text) => Buffer.byteLength(text);

// mulberry32: the same seed gives the base and the head the same choice.
function random(seed) {
  let state = seed;

  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(list, seed) {
  const next = random(seed);
  const result = [...list];

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

// The bundle of size-limit's `complete` row.
async function bundle(ref, seed) {
  const root = join(dir, ref, 'packages/material-x');
  const { runtime } = JSON.parse(readFileSync(join(root, 'files.json')));
  const entries = seed === undefined ? runtime : shuffle(runtime, seed);
  const temp = mkdtempSync(join(root, 'node_modules/.cache/noise-'));
  const input = join(temp, 'complete.js');
  writeFileSync(
    input,
    entries
      .map((entry) => `import ${JSON.stringify(join(root, `${entry}.js`))};\n`)
      .join(''),
  );
  const build = await rolldown({ input: [input], platform: 'neutral' });
  const { output } = await build.generate({ format: 'es', minify: true });
  await build.close();
  rmSync(temp, { recursive: true });

  return output.map((chunk) => chunk.code).join('');
}

function summary(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1);
  const at = (part) => sorted[Math.floor(values.length * part)];

  return `mean ${mean.toFixed(1)}, sd ${Math.sqrt(variance).toFixed(1)}, min ${sorted[0]}, 5% ${at(0.05)}, median ${at(0.5)}, 95% ${at(0.95)}, max ${sorted.at(-1)}`;
}

const code = new Map();
const names = new Map();

for (const ref of refs) {
  code.set(ref, await bundle(ref));
  names.set(
    ref,
    JSON.parse(
      readFileSync(
        join(dir, ref, 'node_modules/.cache/css/css-private-props.json'),
      ),
    ),
  );
}

// A property that is in both trees gets the same name in both.
const properties = [
  ...new Set(refs.flatMap((ref) => Object.keys(names.get(ref)))),
];
const slots = [
  ...new Set(
    refs.flatMap((ref) =>
      Object.values(names.get(ref)).map((name) => name.slice(PREFIX.length)),
    ),
  ),
];

function rename(ref, seed) {
  const order = shuffle(slots, seed);
  const own = names.get(ref);
  const map = new Map(
    properties
      .map((property, i) => [own[property], `${PREFIX}${order[i]}`])
      .filter(([name]) => name !== undefined),
  );

  return code
    .get(ref)
    .replaceAll(/--mx-[a-z]+(?![\w-])/gu, (name) => map.get(name) ?? name);
}

const byName = new Map();
const byOrder = new Map();

for (const ref of refs) {
  byName.set(
    ref,
    Array.from({ length: NAME_RUNS }, (_, i) => brotli(rename(ref, i + 1))),
  );
  const sizes = [];

  for (let i = 1; i <= ORDER_RUNS; i += 1) {
    sizes.push(brotli(await bundle(ref, i)));
  }

  byOrder.set(ref, sizes);
  const text = code.get(ref);
  console.log(
    `${ref}: minified ${raw(text)}, Brotli ${brotli(text)}, gzip ${gzip(text)}, ${Object.keys(names.get(ref)).length} private names, ${slots.length} slots for ${properties.length} properties`,
  );
  console.log(`  ${NAME_RUNS} name assignments: ${summary(byName.get(ref))}`);
  console.log(`  ${ORDER_RUNS} entry orders: ${summary(byOrder.get(ref))}`);
}

for (let i = 0; i < pairs.length; i += 2) {
  const [base, head] = [pairs[i], pairs[i + 1]];
  const difference = (measure) =>
    measure(code.get(head)) - measure(code.get(base));
  const paired = (runs) =>
    summary(runs.get(head).map((size, k) => size - runs.get(base)[k]));
  console.log(
    `\n${base} to ${head}: minified ${difference(raw)}, Brotli ${difference(brotli)}, gzip ${difference(gzip)}`,
  );
  console.log(`  Brotli, one name assignment for both: ${paired(byName)}`);
  console.log(`  Brotli, one entry order for both: ${paired(byOrder)}`);
}
