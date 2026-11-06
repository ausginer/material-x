/** The export map, `files.json` and the contract's public surface agree. */
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const read = async (name: string): Promise<any> =>
  JSON.parse(await readFile(new URL(`../${name}`, import.meta.url), 'utf8'));

const ENTRIES = [
  'draggable',
  'lift',
  'fault',
  'sortable',
  'sortable/y',
  'sortable/xy',
  'sortable/landing',
  'sortable/layout-animation',
  'free-drag',
  'free-drag/bounds',
  'free-drag/landing',
];

describe('the public surface', () => {
  it('should list the contract entries in files.json', async () => {
    const files = await read('files.json');

    expect(files.runtime).toEqual(ENTRIES);
  });

  it('should export exactly those entries', async () => {
    const manifest = await read('package.json');

    expect([...Object.keys(manifest.exports)].sort()).toEqual(
      [...ENTRIES.map((entry) => `./${entry}.js`), './package.json'].sort(),
    );
  });

  it('should stay private', async () => {
    const manifest = await read('package.json');

    expect(manifest.private).toBe(true);
  });
});
