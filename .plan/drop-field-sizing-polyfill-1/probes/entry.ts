// Bundles one built material-x entry as size-limit-preset-rolldown does and prints minified and Brotli bytes.
import { createRequire } from 'node:module';
import { brotliCompressSync, constants } from 'node:zlib';
const [root, entry] = process.argv.slice(2);
const { rolldown } = await import(
  createRequire(`${root}/package.json`).resolve('rolldown')
);
const bundle = await rolldown({
  input: [`${root}/packages/material-x/${entry}.js`],
  platform: 'neutral',
});
const { output } = await bundle.generate({ format: 'es', minify: true });
const code = output
  .filter((c: { type: string }) => c.type === 'chunk')
  .map((c: { code: string }) => c.code)
  .join('');
console.log(
  entry,
  'min',
  code.length,
  'br',
  brotliCompressSync(Buffer.from(code), {
    params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
  }).length,
);
