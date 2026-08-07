/**
 * The published tarball has to contain everything the emitted entrypoints
 * import. `files` is a hand-maintained allowlist and the build mirrors `src/`,
 * so the two drift silently: the emitted `drag.js` imported `./kernel/kernel.js`
 * while `kernel/` was not shipped at all, which no test could see because every
 * other suite imports `src/` directly.
 *
 * This walks the real import graph from the declared runtime entrypoints and
 * asserts `files` covers every directory the build will emit into. It reads
 * source, not build output, so it needs no build step.
 */
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findOrphanDeclarations } from '../prune-declarations.ts';

const ROOT = resolve(import.meta.dirname, '..');
const SRC = join(ROOT, 'src');

const readJSON = async (path: string): Promise<Record<string, unknown>> =>
  JSON.parse(await readFile(join(ROOT, path), 'utf8')) as Record<
    string,
    unknown
  >;

/** Every relative specifier a module imports or re-exports. */
function relativeSpecifiers(source: string): readonly string[] {
  return [...source.matchAll(/from\s*'(\.[^']*)'/gu)].map((match) => match[1]!);
}

/** Transitively collects every `src`-relative module an entrypoint reaches. */
async function reachableFrom(entries: readonly string[]): Promise<Set<string>> {
  const seen = new Set<string>();
  // Breadth-first, one wave per level, so each level's reads run in parallel.
  let wave = entries.map((entry) => join(SRC, `${entry}.ts`));

  while (wave.length > 0) {
    const fresh = [...new Set(wave)].filter((file) => !seen.has(file));

    for (const file of fresh) {
      seen.add(file);
    }

    // The wave *is* the parallel batch the rule asks for; the levels are
    // sequential because level N+1 is not known until level N has been read.
    // oxlint-disable-next-line no-await-in-loop
    const sources = await Promise.all(
      fresh.map((file) => readFile(file, 'utf8')),
    );

    wave = fresh.flatMap((file, index) =>
      relativeSpecifiers(sources[index]!).map((specifier) =>
        resolve(dirname(file), specifier),
      ),
    );
  }

  return seen;
}

describe('the published file list', () => {
  it('should cover every directory the runtime entrypoints emit into', async () => {
    const { runtime } = (await readJSON('files.json')) as {
      runtime: readonly string[];
    };
    const { files } = (await readJSON('package.json')) as {
      files: readonly string[];
    };
    const shipped = new Set(files);
    const missing = new Set<string>();

    for (const file of await reachableFrom(runtime)) {
      // `src/kernel/kernel.ts` emits to `kernel/kernel.js`, so the top-level
      // segment of the src-relative path is the shipped directory. A module at
      // the root of `src` emits beside the entrypoints and is covered by its
      // own explicit entry.
      const parts = relative(SRC, file).split('/');

      if (parts.length > 1 && !shipped.has(parts[0]!)) {
        missing.add(parts[0]!);
      }
    }

    expect([...missing]).toEqual([]);
  });

  it('should keep the minimal composition out of every optional feature', async () => {
    // The measurement claim the export topology exists for: the minimal
    // fixture's import graph *physically* cannot reach unselected geometry or
    // optional work, independent of any bundler's tree-shaking heuristics.
    const reachable = await reachableFrom([
      'drag',
      'sortable',
      'sortable/y',
      'sortable/callbacks',
    ]);
    const forbidden = [
      'sortable/handle.ts',
      'sortable/landing.ts',
      'sortable/layout-animation.ts',
      'sortable/placeholder.ts',
      // The sibling axis. `y()` and `xy()` share `rect-index.ts` and nothing
      // else, so selecting one must not reach the other's rule — which is the
      // whole reason the 2-D capability is a second subpath and not a
      // parameter on one.
      'sortable/xy.ts',
    ];
    const reached = [...reachable].map((file) => relative(SRC, file));

    expect(reached.filter((file) => forbidden.includes(file))).toEqual([]);
  });

  it('should keep the two-dimensional composition out of the y axis', async () => {
    // The mirror of the row above, and the one that makes the pair an
    // *exclusivity* claim rather than a one-way absence: a grid consumer must
    // not carry the list rule either.
    const reachable = await reachableFrom([
      'drag',
      'sortable',
      'sortable/xy',
      'sortable/callbacks',
    ]);
    const reached = [...reachable].map((file) => relative(SRC, file));

    expect(reached).toContain('sortable/rect-index.ts');
    expect(reached).not.toContain('sortable/y.ts');
  });

  it('should not ship a directory nothing emits into', async () => {
    // The reverse drift: an allowlist entry that no longer names anything.
    const { files } = (await readJSON('package.json')) as {
      files: readonly string[];
    };
    const directories = new Set(
      (await readdir(SRC, { withFileTypes: true }))
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name),
    );
    const stale = files.filter(
      (entry) => !entry.includes('.') && !directories.has(entry),
    );

    expect(stale).toEqual([]);
  });

  it('should publish no declaration the entries cannot reach', async () => {
    // `unbundle` emits one declaration per source module, and four kernel
    // modules had no public type naming them — unreachable rather than exposed,
    // but still 6.5 kB of internal SPI in the tarball. `tsdown.config.ts`
    // prunes them after the emit; this is what stops the next such module from
    // shipping unnoticed.
    const entries = (await readJSON('files.json'))['runtime'] as string[];
    const orphans = await findOrphanDeclarations(
      entries.map((entry) => `${entry}.d.ts`),
    );

    expect(orphans).toEqual([]);
  });
});
