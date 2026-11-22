/* oxlint-disable no-await-in-loop, no-console -- a measurement script: serial, and it prints its readings */
/**
 * Reads the Brotli size of `@ydinjs/signals` and of the two baselines,
 * `@preact/signals-core` and `alien-signals`, each in a module that imports the
 * same features, through the preset that measures the package's rows. The
 * figures are readings for comparison, not rows: run `just build` first, since
 * the `@ydinjs/signals` fixtures read the build.
 *
 * `node bench/size-baselines.ts`
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sizeLimit from 'size-limit';
import preset from 'size-limit-preset-rolldown';

const fixtureDir = new URL(
  '../node_modules/.cache/size-baselines/',
  import.meta.url,
);
const index = JSON.stringify(
  fileURLToPath(new URL('../index.js', import.meta.url)),
);

const FIXTURES: ReadonlyArray<readonly [name: string, source: string]> = [
  ['@ydinjs/signals: signal', `export { signal } from ${index};`],
  [
    '@ydinjs/signals: signal, computed, effect, batch',
    `export { signal, computed, effect, batch } from ${index};`,
  ],
  [
    '@preact/signals-core: signal',
    `export { signal } from '@preact/signals-core';`,
  ],
  [
    '@preact/signals-core: signal, computed, effect, batch',
    `export { signal, computed, effect, batch } from '@preact/signals-core';`,
  ],
  ['alien-signals: signal', `export { signal } from 'alien-signals';`],
  [
    'alien-signals: signal, computed, effect, startBatch, endBatch',
    `export { signal, computed, effect, startBatch, endBatch } from 'alien-signals';`,
  ],
];

await mkdir(fixtureDir, { recursive: true });

for (const [index, [name, source]] of FIXTURES.entries()) {
  const fixture = fileURLToPath(new URL(`fixture-${index}.js`, fixtureDir));
  await writeFile(fixture, `${source}\n`);
  // The preset declares the subset of size-limit's plugin shape it uses.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const plugins = [preset] as unknown as Parameters<typeof sizeLimit>[0];
  // The checks run one after another, as size-limit runs a config's rows.
  const [{ size }] = (await sizeLimit(plugins, [fixture])) as [
    { size: number },
  ];
  console.log(`${name}: ${size} B`);
}
