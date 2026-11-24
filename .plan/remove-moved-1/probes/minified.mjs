// The minified and Brotli bytes of each core and material-x size row, bundled
// as size-limit-preset-rolldown bundles it, from the built packages. "Before"
// puts the deleted method back into the built core/element.js. Build first, and
// run from the repository's root: node .plan/remove-moved-1/probes/minified.mjs
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { brotliCompressSync } from 'node:zlib';

const require = createRequire(resolve('package.json'));
const { rolldown } = await import(pathToFileURL(require.resolve('rolldown')));
const { runtime } = JSON.parse(
  await readFile('packages/material-x/files.json', 'utf8'),
);
const element = resolve('packages/core/element.js');
const anchor = 'formAssociatedCallback()';
const method = `movedCallback() {
    forEachMaybePromise(this.#controllers, (controller) => controller.moved?.());
  }
  `;

async function measure(input, isBefore) {
  let insertions = 0;
  const bundle = await rolldown({
    input: 'entry',
    platform: 'neutral',
    plugins: [
      {
        name: 'probe',
        resolveId: (id) => (id === 'entry' ? '\0entry' : null),
        load: (id) =>
          id === '\0entry'
            ? input
                .map((file) => `export * from ${JSON.stringify(file)};`)
                .join('\n')
            : null,
        transform(code, id) {
          if (!isBefore || id !== element) return null;
          const parts = code.split(anchor);
          if (parts.length !== 2) throw new Error('anchor');
          insertions += 1;
          return parts.join(method + anchor);
        },
      },
    ],
  });
  const { output } = await bundle.generate({ format: 'es', minify: true });
  await bundle.close();
  const code = output.map((chunk) => chunk.code ?? '').join('');
  return [Buffer.byteLength(code), brotliCompressSync(code).length, insertions];
}

const entries = runtime.map((entry) =>
  resolve(`packages/material-x/${entry}.js`),
);
const rows = [
  ['core element', [element]],
  ...runtime.map((entry, i) => [entry, [entries[i]]]),
  ['complete', entries],
];
console.log(
  'row | minified before | after | change | Brotli before | after | change | insertions',
);
for (const [name, input] of rows) {
  const [m0, b0, n] = await measure(input, true);
  const [m1, b1] = await measure(input, false);
  console.log([name, m0, m1, m1 - m0, b0, b1, b1 - b0, n].join(' | '));
}
