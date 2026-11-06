/** The export map, `files.json` and the contract's public surface agree. */
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

type Manifest = Readonly<{
  runtime: readonly string[];
  exports: Readonly<Record<string, unknown>>;
  private: boolean;
}>;

const read = async (name: string): Promise<Manifest> =>
  JSON.parse(
    await readFile(new URL(`../${name}`, import.meta.url), 'utf8'),
  ) as Manifest;

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

    expect(new Set(Object.keys(manifest.exports))).toEqual(
      new Set([...ENTRIES.map((entry) => `./${entry}.js`), './package.json']),
    );
  });

  it('should stay private', async () => {
    const manifest = await read('package.json');

    expect(manifest.private).toBe(true);
  });
});
