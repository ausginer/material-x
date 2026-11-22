/**
 * The size rows of `@ydinjs/signals`, measured by size-limit with
 * `size-limit-preset-rolldown` in Brotli bytes.
 *
 * Each row bundles one generated module that re-exports the features the row
 * names, so a row is the tree-shaken slice a consumer importing those features
 * ships. The preset's `import` option would do the same and is unreachable
 * (see the preset's source), so the modules are written here.
 *
 * The rows have no limit: a package sets them at its first release.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { SizeLimitConfig } from 'size-limit';

const fixtureDir = new URL('node_modules/.cache/size-limit/', import.meta.url);
const index = fileURLToPath(new URL('index.js', import.meta.url));
const family = fileURLToPath(new URL('family.js', import.meta.url));

const ROWS: ReadonlyArray<readonly [name: string, source: string]> = [
  ['signal', `export { signal } from ${JSON.stringify(index)};\n`],
  [
    'signal+computed',
    `export { signal, computed } from ${JSON.stringify(index)};\n`,
  ],
  [
    'core',
    `export { signal, computed, effect, batch } from ${JSON.stringify(index)};\n`,
  ],
  [
    'core+family',
    `export { signal, computed, effect, batch } from ${JSON.stringify(index)};\nexport { family } from ${JSON.stringify(family)};\n`,
  ],
];

await mkdir(fixtureDir, { recursive: true });

const config: SizeLimitConfig = await Promise.all(
  ROWS.map(async ([name, source]) => {
    const fixture = new URL(`${name}.js`, fixtureDir);
    await writeFile(fixture, source);
    return { name, path: fileURLToPath(fixture) };
  }),
);

export default config;
