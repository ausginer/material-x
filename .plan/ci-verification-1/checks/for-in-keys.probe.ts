/**
 * For `vite-traits-plugin`'s walk: parses every `.ts` file under
 * `packages/*\/src` with `oxc-parser`, as the plugin does, and compares `for..in`
 * keys with `Object.keys` at every object of every tree. Run from
 * `packages/vite-traits-plugin`, whose `oxc-parser` it loads.
 */
import { readFile } from 'node:fs/promises';
import { glob } from 'node:fs/promises';
import { parseSync } from 'oxc-parser';

let files = 0;
let objects = 0;
let differing = 0;

for await (const path of glob('../*/src/**/*.ts')) {
  files += 1;

  const { program } = parseSync(path, await readFile(path, 'utf8'));
  const stack: unknown[] = [program];

  while (stack.length > 0) {
    const current = stack.pop();

    if (!current || typeof current !== 'object') {
      continue;
    }

    objects += 1;

    const inKeys: string[] = [];

    // oxlint-disable-next-line no-restricted-syntax -- the comparison is the probe
    for (const key in current) {
      inKeys.push(key);
    }

    const ownKeys = Object.keys(current);

    if (inKeys.join('\u0000') !== ownKeys.join('\u0000')) {
      differing += 1;
    }

    for (const key of ownKeys) {
      stack.push((current as Record<string, unknown>)[key]);
    }
  }
}

console.log(
  `${files} files, ${objects} objects, ${differing} with for..in keys other than Object.keys`,
);
