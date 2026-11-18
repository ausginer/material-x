/**
 * The size rows of `@ydinjs/material-x`, measured by size-limit with
 * `size-limit-preset-rolldown` in Brotli bytes.
 *
 * There is one row for each entry in `files.json`'s `runtime` list, named by
 * the entry's path, and one row named `complete`. The rows are built from
 * `files.json`, so a runtime entry always has a row, and an entry whose built
 * file does not exist makes size-limit fail. `complete` bundles one generated
 * module that imports every runtime entry: the single graph that a consumer's
 * bundler builds for the whole library. It is never a row that lists several
 * files, because size-limit would then sum separate chunks that no consumer
 * ships.
 *
 * The rows have no limit yet. The boundary for their limits is the first
 * publication of `@ydinjs/material-x` to a registry, which the owner performs.
 * Before that publication, a unit sets each row's limit to its reading after
 * the release's last change, with no slack, and runs the witness that a row can
 * fail: one row's limit set one byte below its reading makes `just size` exit
 * non-zero and name that row. The architect states the rule that governs the
 * limits after the release; from then on, a reading over a limit is a decision.
 * The owner may order the limits sooner. Releasing without them, or giving them
 * up, is also his act, and either one amends this rule (`repo:RD-24`).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { SizeLimitConfig } from 'size-limit';
import files from './files.json' with { type: 'json' };

const completeDir = new URL('node_modules/.cache/size-limit/', import.meta.url);
const completeModule = new URL('complete.js', completeDir);

await mkdir(completeDir, { recursive: true });
await writeFile(
  completeModule,
  files.runtime
    .map(
      (entry) =>
        `import ${JSON.stringify(fileURLToPath(new URL(`${entry}.js`, import.meta.url)))};\n`,
    )
    .join(''),
);

const config: SizeLimitConfig = [
  ...files.runtime.map((entry) => ({ name: entry, path: `${entry}.js` })),
  { name: 'complete', path: fileURLToPath(completeModule) },
];

export default config;
