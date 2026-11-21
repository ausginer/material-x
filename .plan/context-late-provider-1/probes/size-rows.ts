// Scratch probe: the modules that each size row's bundle contains. It bundles
// each built entry as size-limit-preset-rolldown does (rolldown, platform
// neutral, minified ESM), and prints the chunks' Brotli bytes at quality 11,
// summed per chunk as @size-limit/file does, and the chunks' modules relative
// to the repository root. Run from packages/material-x after its build:
//
//   node ../../.plan/context-late-provider-1/probes/size-rows.ts <entry>...
//
// An entry is a `files.json` runtime path, or `complete` for the module that
// `.size-limit.ts` generates.
import { realpath } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { constants, brotliCompressSync } from 'node:zlib';
import { rolldown } from 'rolldown';

const root = resolve(import.meta.dirname, '../../..');
const complete = resolve('node_modules/.cache/size-limit/complete.js');

for (const entry of process.argv.slice(2)) {
  const input = entry === 'complete' ? complete : resolve(`${entry}.js`);
  // oxlint-disable-next-line no-await-in-loop
  const bundle = await rolldown({ input, platform: 'neutral' });
  // oxlint-disable-next-line no-await-in-loop
  const { output } = await bundle.generate({ format: 'es', minify: true });
  // oxlint-disable-next-line no-await-in-loop
  await bundle.close();

  const modules: string[] = [];
  let brotli = 0;

  for (const chunk of output) {
    if (chunk.type === 'chunk') {
      brotli += brotliCompressSync(chunk.code, {
        params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
      }).length;

      for (const id of Object.keys(chunk.modules)) {
        // oxlint-disable-next-line no-await-in-loop
        modules.push(relative(root, await realpath(id).catch(() => id)));
      }
    }
  }

  const reaches = modules.filter((id) =>
    /^packages\/(?:drag|box-quad)\//u.test(id),
  );
  console.log(
    `${entry}: ${brotli} B brotli, ${modules.length} modules, ${reaches.length} from drag or box-quad`,
  );

  for (const id of modules) {
    console.log(`  ${id}`);
  }
}
