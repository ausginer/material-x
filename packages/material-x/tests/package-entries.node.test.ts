import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseAst } from 'rolldown/parseAst';
import { describe, expect, it } from 'vitest';
import files from '../files.json' with { type: 'json' };

const ROOT = resolve(import.meta.dirname, '..');
const DRAG = '@ydinjs/drag';

/** The specifiers of a module's static imports and re-exports. */
async function staticImports(file: string): Promise<readonly string[]> {
  const program = parseAst(
    await readFile(file, 'utf8'),
    { sourceType: 'module' },
    file,
  );
  const specifiers: string[] = [];

  for (const node of program.body) {
    if (
      (node.type === 'ImportDeclaration' ||
        node.type === 'ExportAllDeclaration' ||
        node.type === 'ExportNamedDeclaration') &&
      node.source
    ) {
      specifiers.push(node.source.value);
    }
  }

  return specifiers;
}

/**
 * Whether the built entry reaches `@ydinjs/drag` through its static imports.
 * It follows relative imports and the `@ydinjs` packages' published files, and
 * no other package, since only `@ydinjs` packages can lead to drag.
 */
async function reachesDrag(entry: string): Promise<boolean> {
  const seen = new Set<string>();
  const pending = [resolve(ROOT, `${entry}.js`)];

  for (let file = pending.pop(); file; file = pending.pop()) {
    if (seen.has(file)) {
      continue;
    }

    seen.add(file);

    // oxlint-disable-next-line no-await-in-loop -- one module at a time
    for (const specifier of await staticImports(file)) {
      if (specifier === DRAG || specifier.startsWith(`${DRAG}/`)) {
        return true;
      }

      if (specifier.startsWith('.')) {
        pending.push(resolve(dirname(file), specifier));
      } else if (specifier.startsWith('@ydinjs/')) {
        pending.push(fileURLToPath(import.meta.resolve(specifier)));
      }
    }
  }

  return false;
}

describe('runtime entries', () => {
  it.each(files.runtime.filter((entry) => entry !== 'list/sortable-list'))(
    'should not reach @ydinjs/drag from %s',
    async (entry) => {
      expect(await reachesDrag(entry)).toBe(false);
    },
  );

  it('should reach @ydinjs/drag from list/sortable-list', async () => {
    expect(await reachesDrag('list/sortable-list')).toBe(true);
  });
});
