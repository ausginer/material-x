// Bundles material-x's `complete` module as size-limit-preset-rolldown does and prints Brotli bytes.
import { createRequire } from 'node:module';
import { brotliCompressSync, constants } from 'node:zlib';
import { writeFile } from 'node:fs/promises';
const [root, out] = process.argv.slice(2);
const { rolldown } = await import(
  createRequire(`${root}/package.json`).resolve('rolldown')
);
const bundle = await rolldown({
  input: [
    `${root}/packages/material-x/node_modules/.cache/size-limit/complete.js`,
  ],
  platform: 'neutral',
  cwd: `${root}/packages/material-x`,
});
const { output } = await bundle.generate({ format: 'es', minify: true });
const code = output
  .filter((c) => c.type === 'chunk')
  .map((c) => (c as { code: string }).code)
  .join('');
await writeFile(out, code);
const br = brotliCompressSync(Buffer.from(code), {
  params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
}).length;
console.log(out, 'min', code.length, 'br', br);
