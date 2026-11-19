import { readdir, readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { parseModule } from '../src/syntax.ts';

const COMPOSITION = new URL('../src/composition/', import.meta.url);

describe('the import boundary', () => {
  it('should keep every composition module out of attributes/', async () => {
    const reached: string[] = [];
    for (const file of await readdir(COMPOSITION)) {
      const url = new URL(file, COMPOSITION);
      // oxlint-disable-next-line no-await-in-loop
      const program = parseModule(url.pathname, await readFile(url, 'utf8'));
      for (const node of program.body) {
        if (
          node.type === 'ImportDeclaration' &&
          new URL(node.source.value, url).pathname.includes('/src/attributes/')
        ) {
          reached.push(`${file}: ${node.source.value}`);
        }
      }
    }

    expect(reached).toEqual([]);
  });
});
