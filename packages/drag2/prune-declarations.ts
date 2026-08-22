/**
 * The two post-emit passes over the declaration output: **pruning** the files no
 * declared entry can reach, and **stripping** the declaration-map references
 * nothing emits.
 *
 * `unbundle: true` emits one `.d.ts` per source module, but a module's *types*
 * are only published if some public declaration names them. Four kernel modules
 * — `frames`, `lifetimes`, `presentation`, `seams` — are reached at runtime and
 * by nothing in the type graph, so their declarations shipped as 6.5 kB of
 * unreachable internal SPI: not a boundary hole (phase 9's criterion is
 * *reachability*, and nothing reaches them) but dead weight in the tarball with
 * every internal type name in it.
 *
 * Deferred from phase 9 to phase 11 and done here. Deliberately narrow: it
 * walks `from '...'` specifiers out of the declared entry declarations, keeps
 * the transitive closure, and removes only `.d.ts` files outside it. A runtime
 * module is never touched — those are reachable by definition, since the entry
 * `.js` files import them.
 */
import { readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, normalize, relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname);
const SKIP = new Set([
  'node_modules',
  'src',
  'tests',
  'bench',
  '.coverage',
  '.docs',
]);

async function declarationsUnder(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);

      if (entry.isDirectory()) {
        return SKIP.has(entry.name) || entry.name.startsWith('.')
          ? []
          : await declarationsUnder(path);
      }

      return entry.name.endsWith('.d.ts') ? [path] : [];
    }),
  );

  return nested.flat();
}

/** The transitive closure of `from '...'` specifiers, starting at the entries. */
async function reachable(entries: readonly string[]): Promise<Set<string>> {
  const seen = new Set<string>();
  let wave = entries.map((entry) => join(ROOT, entry));

  while (wave.length > 0) {
    const fresh: string[] = [];

    for (const file of wave) {
      if (!seen.has(file)) {
        seen.add(file);
        fresh.push(file);
      }
    }

    // One level per round, each level's reads in parallel.
    // oxlint-disable-next-line no-await-in-loop
    const sources = await Promise.all(
      fresh.map(async (file) => {
        try {
          return await readFile(file, 'utf8');
        } catch {
          return ''; // a declared entry with no declaration yet
        }
      }),
    );

    wave = fresh.flatMap((file, index) =>
      [...sources[index]!.matchAll(/from\s*["'](\.[^"']*)["']/gu)].map(
        (match) =>
          normalize(join(dirname(file), match[1] ?? '')).replace(
            /\.js$/u,
            '.d.ts',
          ),
      ),
    );
  }

  return seen;
}

/** The emitted declarations no declared entry can reach. Read-only. */
export async function findOrphanDeclarations(
  entries: readonly string[],
): Promise<readonly string[]> {
  const [kept, all] = await Promise.all([
    reachable(entries),
    declarationsUnder(ROOT),
  ]);

  // A fail-safe, because the failure mode is silent and destructive: the first
  // version matched only single-quoted specifiers, the emitted declarations use
  // double quotes, so the closure was just the entries and everything else
  // looked unreachable. A build reaching only its own entries is a broken walk,
  // not a package with no shared types.
  if (kept.size <= entries.length && all.length > entries.length) {
    throw new Error(
      `prune-declarations: the reachability walk found no shared declarations ` +
        `(${kept.size} reached, ${all.length} emitted). Refusing to delete.`,
    );
  }

  return all
    .filter((file) => !kept.has(file))
    .map((file) => relative(ROOT, file));
}

export async function pruneDeclarations(
  entries: readonly string[],
): Promise<readonly string[]> {
  const orphans = await findOrphanDeclarations(entries);

  await Promise.all(
    orphans.flatMap((file) => [
      rm(join(ROOT, file), { force: true }),
      rm(join(ROOT, `${file}.map`), { force: true }),
    ]),
  );

  return orphans;
}

/**
 * The `//# sourceMappingURL=….d.ts.map` comment `rolldown-plugin-dts` writes
 * into every emitted declaration.
 *
 * Anchored to the end of the file, and matched only when it names a `.d.ts.map`
 * — a `.js.map` reference in a declaration would be a different defect and this
 * must not silently absorb it.
 */
const DECLARATION_MAP_REFERENCE =
  /\n?\/\/# sourceMappingURL=[^\n]*\.d\.ts\.map\s*$/u;

/**
 * The emitted declarations that reference a declaration map which does not
 * exist. Read-only.
 *
 * **The reference is written and the chunk never is** (D-111). tsdown runs the
 * JS and the declaration emit as one rolldown build over one `sourcemap`
 * option, so `sourcemap: true` — which this package wants, for the `.js.map`
 * `sourcesContent` — makes the dts plugin append the comment while no
 * `.d.ts.map` is produced for it. All 31 references therefore dangled *in the
 * tarball*: a published artifact naming a file it does not ship.
 */
export async function findDanglingDeclarationMapReferences(): Promise<
  readonly string[]
> {
  const declarations = await declarationsUnder(ROOT);
  const sources = await Promise.all(
    declarations.map((file) => readFile(file, 'utf8')),
  );

  return declarations
    .filter((_, index) => DECLARATION_MAP_REFERENCE.test(sources[index]!))
    .map((file) => relative(ROOT, file));
}

/** Removes those references. Returns the files it rewrote. */
export async function stripDeclarationMapReferences(): Promise<
  readonly string[]
> {
  const declarations = await declarationsUnder(ROOT);
  const sources = await Promise.all(
    declarations.map((file) => readFile(file, 'utf8')),
  );
  const stripped: string[] = [];

  await Promise.all(
    declarations.map(async (file, index) => {
      const source = sources[index]!;

      if (!DECLARATION_MAP_REFERENCE.test(source)) {
        return;
      }

      stripped.push(relative(ROOT, file));

      await writeFile(
        file,
        `${source.replace(DECLARATION_MAP_REFERENCE, '')}\n`,
      );
    }),
  );

  return stripped;
}
