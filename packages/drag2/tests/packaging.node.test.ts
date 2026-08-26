/* eslint-disable import-x/no-relative-packages -- the clean derivation is a repo script, and asserting against the real one is the point (D-111). */
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
import {
  packageFilesToCleanPathspecs,
  type PackageFiles,
} from '../../../.scripts/package-files.ts';
import { findOrphanDeclarations } from '../prune-declarations.ts';

const ROOT = resolve(import.meta.dirname, '..');

/** Every emitted declaration, which is what a consumer's editor opens. */
async function declarations(dir: string): Promise<readonly string[]> {
  const entries = (await readdir(dir, { withFileTypes: true })).filter(
    (entry) => entry.name !== 'node_modules' && entry.name !== 'src',
  );
  const found = await Promise.all(
    entries.map(async (entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        return entry.name.startsWith('.') ? [] : await declarations(path);
      }
      return entry.name.endsWith('.d.ts') ? [path] : [];
    }),
  );

  return found.flat().sort();
}
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

/** Every `.ts` under `src/`, which is the graph the parser above walks. */
async function sources(dir: string): Promise<readonly string[]> {
  const found = await Promise.all(
    (await readdir(dir, { withFileTypes: true })).map(async (entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        return await sources(path);
      }
      return entry.name.endsWith('.ts') ? [path] : [];
    }),
  );

  return found.flat().sort();
}

describe('the module-graph parser', () => {
  it('should understand every import form the source actually uses', async () => {
    // **D-115 (a), M-05 since Checkpoint B.** `relativeSpecifiers` is one
    // regex and cannot see a side-effect import, a double-quoted specifier or
    // a dynamic `import()`. It is correct today, and correct only because the
    // source happens to use exactly one form — which nothing asserted. Three
    // assertions rest on it: ship-list coverage, optional-module isolation,
    // and, since D-111, clean-build pathspec coverage. `import './register.ts';`
    // would silently drop a whole subtree from `reachableFrom()` and all three
    // would stay green.
    //
    // A gate that cannot be trusted is worse than an absent one, because an
    // absent gate is visible in a coverage reading and a fail-open gate
    // reports success. So the premise is asserted rather than assumed: the
    // first import form the parser cannot read fails here, loudly, instead of
    // quietly shrinking the graph everything else is measured against.
    const unreadable: string[] = [];
    let statements = 0;
    const files = await sources(SRC);
    const read = await Promise.all(files.map((file) => readFile(file, 'utf8')));
    for (const [index, file] of files.entries()) {
      const source = read[index]!;
      const site = relative(ROOT, file);
      // Every specifier, however written, against the one form the parser
      // reads. A difference is a form it cannot see.
      const all = [
        ...source.matchAll(/\b(?:from|import)\s*\(?\s*(['"])([^'"]+)\1/gu),
      ];
      statements += all.length;
      const relatives = all
        .filter(([, , specifier]) => specifier!.startsWith('.'))
        .map(([, , specifier]) => specifier!);
      const parsed = relativeSpecifiers(source);
      for (const specifier of relatives) {
        if (!parsed.includes(specifier)) {
          unreadable.push(`${site} :: ${specifier}`);
        }
      }
      if (/\bimport\s*\(/u.test(source)) {
        unreadable.push(`${site} :: dynamic import()`);
      }
    }

    expect(unreadable).toEqual([]);
    // Non-vacuity: the scan really read the graph rather than an empty tree.
    expect(statements).toBeGreaterThan(100);
  });
});

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
    const reachable = await reachableFrom(['drag', 'sortable', 'sortable/y']);
    const forbidden = [
      'sortable/landing.ts',
      'sortable/layout-animation.ts',
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
    const reachable = await reachableFrom(['drag', 'sortable', 'sortable/xy']);
    const reached = [...reachable].map((file) => relative(SRC, file));

    expect(reached).toContain('sortable/rect-index.ts');
    expect(reached).not.toContain('sortable/y.ts');
  });

  it('should keep the two behaviors out of each other', async () => {
    // **B-1**, asserted over the graph rather than over bundle bytes, and in
    // **both** directions — which is what makes it an exclusivity claim rather
    // than a one-way absence. It is the executable form of the question
    // Checkpoint E is convened to ask: a consumer of one behavior must not be
    // able to reach the other's modules, however the bundler feels about it.
    const free = [...(await reachableFrom(['drag', 'free-drag']))].map((file) =>
      relative(SRC, file),
    );
    const sortable = [
      ...(await reachableFrom(['drag', 'sortable', 'sortable/y'])),
    ].map((file) => relative(SRC, file));

    expect(free.filter((file) => file.startsWith('sortable/'))).toEqual([]);
    expect(sortable.filter((file) => file.startsWith('free-drag/'))).toEqual(
      [],
    );
    // Not vacuous: each really does reach its own tier.
    expect(free).toContain('free-drag/spec.ts');
    expect(sortable).toContain('sortable/spec.ts');
  });

  it('should keep an unconstrained free drag out of the clamp', async () => {
    // **B-2**, the same instrument and the same both-directions form the two
    // axis features already use. A consumer wanting an unconstrained drag
    // carries **no bounds code** — no rect resolver, no clamp arithmetic —
    // which is the test `plan.md` §Phase 18 set for the composition model and
    // the whole reason `bounds` is a capability installer rather than a config
    // key (D-70).
    const minimal = [...(await reachableFrom(['drag', 'free-drag']))].map(
      (file) => relative(SRC, file),
    );

    expect(minimal).not.toContain('free-drag/bounds.ts');
    expect(minimal).not.toContain('shared/landing-runner.ts');

    const bounded = [
      ...(await reachableFrom(['drag', 'free-drag', 'free-drag/bounds'])),
    ].map((file) => relative(SRC, file));

    expect(bounded).toContain('free-drag/bounds.ts');
  });

  it('should share the landing runner between the two behaviors', async () => {
    // The other half of F-64's "one declaration, two publications": the runner
    // is behavior-neutral, so **both** landing entries reach the same internal
    // module and neither reaches the other behavior to get there.
    const free = [...(await reachableFrom(['free-drag/landing']))].map((file) =>
      relative(SRC, file),
    );
    const sortable = [...(await reachableFrom(['sortable/landing']))].map(
      (file) => relative(SRC, file),
    );

    expect(free).toContain('shared/landing-runner.ts');
    expect(sortable).toContain('shared/landing-runner.ts');
    expect(free.filter((file) => file.startsWith('sortable/'))).toEqual([]);
    expect(sortable.filter((file) => file.startsWith('free-drag/'))).toEqual(
      [],
    );
  });

  it('should publish the two shared declarations from one module each', async () => {
    // **B-7, as identity rather than as shape.** `expectTypeOf` compares
    // structures, and two independently declared types with the same members
    // would satisfy it — which is exactly the coincidence F-64 says must not be
    // mistaken for a shared vocabulary. What makes them the *same declaration*
    // is that each middle tier re-exports it from one internal module, so that
    // is what this reads. A future editor who re-declares either side to "avoid
    // a shared file" fails here.
    const [sortableFeature, freeDragFeature, sortableLanding, freeDragLanding] =
      await Promise.all(
        [
          'sortable/feature.ts',
          'free-drag/feature.ts',
          'sortable/landing.ts',
          'free-drag/landing.ts',
        ].map((file) => readFile(join(SRC, file), 'utf8')),
      );

    for (const source of [sortableFeature, freeDragFeature]) {
      expect(source).toMatch(
        /export type \{[^}]*FeatureContext[^}]*\} from '\.\.\/shared\/composition\.ts'/su,
      );
    }

    for (const source of [sortableLanding, freeDragLanding]) {
      expect(source).toMatch(
        /export type \{[^}]*LandingOptions[^}]*\} from '\.\.\/shared\/landing-runner\.ts'/su,
      );
    }
  });

  it('should keep the geometry package out of every behavior', async () => {
    // **D-85's source-level half** (E-01). The kernel measures the box space
    // once, in `acquireLift`, and hands the four coefficients down on
    // `ActivationScope`. Free drag used to take its own `coordinates()`
    // traversal — with four private copies of box-quad's index constants — and
    // that read ran *after* acquisition had already moved the visual.
    //
    // Asserted on the source rather than through the import graph, because
    // `@ydinjs/box-quad` is a bare specifier and `reachableFrom` follows only
    // relative ones. The claim is narrow and exact: no behavior module reaches
    // the traversal, and no behavior module carries a `Box` index of its own.
    const files = ['free-drag', 'sortable'];
    const offenders: string[] = [];

    for (const directory of files) {
      const dir = join(SRC, directory);
      // The two directories are read in sequence; each directory's own files
      // are read in parallel below.
      // oxlint-disable-next-line no-await-in-loop
      const names = await readdir(dir);
      // oxlint-disable-next-line no-await-in-loop
      const sources = await Promise.all(
        names.map((name) => readFile(join(dir, name), 'utf8')),
      );

      for (const [index, source] of sources.entries()) {
        if (/from '@ydinjs\/box-quad'|BOX_ANCESTOR_/u.test(source)) {
          offenders.push(`${directory}/${names[index]!}`);
        }
      }
    }

    expect(offenders).toEqual([]);
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

  it('should clean every path it ships', async () => {
    // **F-79, and it had already fired** (D-111). `clean-build` derives its
    // pathspecs from `files.json`, adding a *directory* pathspec only when an
    // entrypoint contains a `/` — so `sortable/` and `free-drag/` were cleaned
    // because entries name them, while `kernel/` (42 files) and `shared/` (4)
    // were shipped by `files` and never cleaned at all. A module deleted from
    // `src/kernel/` therefore left its `.js`, `.js.map` and `.d.ts` on disk
    // **inside the allowlist**, and the next `npm pack` published them.
    //
    // The proof is not hypothetical: a root `landing-runner.js` and its map sat
    // in this package, orphaned when the source moved to `src/shared/`, with the
    // old path still in the map's `sources`. They missed the tarball only
    // because that one file happened to fall outside the allowlist.
    //
    // Asserted against the pathspec derivation rather than by running `git
    // clean`, which is the difference between holding the property and
    // inspecting whatever the working tree happens to contain: this fails on a
    // tree that was never built.
    const { files } = (await readJSON('package.json')) as {
      files: readonly string[];
    };
    const declared = JSON.parse(
      await readFile(join(ROOT, 'files.json'), 'utf8'),
    ) as PackageFiles;
    const pathspecs = new Set(packageFilesToCleanPathspecs(declared));
    const covered = (entry: string): boolean => {
      // A file inside a directory the clean covers is covered with it.
      const [top] = entry.split('/');

      return pathspecs.has(entry) || pathspecs.has(top!);
    };

    expect(files.filter((entry) => !covered(entry))).toEqual([]);
    // Not vacuous: the derivation really does produce pathspecs, so a future
    // `files.json` shape that silently yielded none cannot pass this row.
    expect(pathspecs.size).toBeGreaterThan(files.length);
  });

  it('should publish no doc block that documents nothing', async () => {
    // **D-113.** `sortable/feature.d.ts` shipped two consecutive blocks on
    // `SortableInstaller`: only the second was the effective JSDoc, and the
    // first told the third-party installer author D-61 created that the type is
    // _internal and unstable, and unexported from the package_ — directly above
    // the sentence publishing it. An orphaned block is prose with no subject,
    // so no compiler, no TypeDoc run and no reviewer diffing declarations can
    // ever tell it that it is wrong. It is invisible by construction, and it is
    // copied into the artifact a consumer installs.
    //
    // **No orphan is legitimate any more.** One used to be: a block opening by
    // naming something deleted — `~~SortableCallbacks~~` _is deleted_ — was the
    // retirement marker applied to a declaration rather than to a reference,
    // and its subject being gone was its whole point. D-135 removed the class:
    // a retirement note is the record's voice, it is not something a consumer
    // outside this repository can act on, and the row below forbids `~~` in a
    // published declaration outright. So the exemption is deleted rather than
    // left standing over an empty population.
    //
    // **Three escapes were closed 2026-08-22 (MNT-02), and one of them by
    // deleting the rule rather than tightening it.** A single-line `/** … */`
    // set the block start and was then overwritten by the next `/**`, so 71 of
    // the 200 emitted blocks were never classified at all. The marked exemption
    // fired on `~~` anywhere in the block, which exempts nine live blocks —
    // including `SortableInstaller`'s own surviving JSDoc, so the very block
    // D-113 was created for would have exempted itself if it were orphaned
    // again; it now reads the block's first line, which is its subject. And a
    // **module header** used to be exempt by position, first-block-of-a-region:
    // that is textually indistinguishable from an orphan injected there, so the
    // exemption is removed and the two headers are `//` comments in source
    // instead — D-113's own repair to `kernel/spec.ts`, applied to the same
    // shape.
    const orphans: string[] = [];
    const emitted = await declarations(ROOT);
    const read = await Promise.all(
      emitted.map((file) => readFile(file, 'utf8')),
    );
    let blocks = 0;
    for (const [ordinal, file] of emitted.entries()) {
      const lines = read[ordinal]!.split('\n');
      let start = -1;
      for (const [index, line] of lines.entries()) {
        const text = line.trim();
        if (text.startsWith('/**')) {
          start = index;
          // A one-line block opens and closes here, and is classified here.
          if (!text.endsWith('*/')) {
            continue;
          }
        } else if (text !== '*/' || start < 0) {
          continue;
        }
        blocks += 1;
        let next = index + 1;
        while (next < lines.length && lines[next]!.trim() === '') {
          next += 1;
        }
        if (lines[next]?.trim().startsWith('/**') ?? true) {
          orphans.push(`${relative(ROOT, file)}:${start + 1}`);
        }
        start = -1;
      }
    }

    expect(orphans).toEqual([]);
    // **Non-vacuity, and it is the reason MNT-01 was a finding** (D-115). The
    // emitted tree is untracked, so a fresh clone before `just build` has none
    // of it and this row read one file and passed. Both floors sit under what
    // the built tree carries.
    expect(emitted.length).toBeGreaterThan(25);
    expect(blocks).toBeGreaterThan(100);
  });

  it('should publish no declaration carrying an internal reference', async () => {
    // A JSDoc block on a declaration that survives the prune is consumer
    // documentation: it is fetched at every install, rendered on hover and
    // published by TypeDoc. A reader outside this repository can act on none of
    // the forms below, so none of them may reach a `.d.ts` (D-135).
    //
    // Asserted rather than swept once, because the property regresses with no
    // other failing test: the next JSDoc edit reintroduces a decision number
    // and every other row here still passes.
    const FORBIDDEN: ReadonlyArray<readonly [string, RegExp]> = [
      ['decision, finding or probe number', /\b(?:D|F|I|E|Q|M|K|B|MNT)-\d+/u],
      ['section citation', /§/u],
      ['contract document', /\bcontract \d/iu],
      ['size policy citation', /CODE_OF_SIZE/u],
      ['record path', /\.plan\//u],
      ['phase number', /\bphase \d/iu],
      ['date', /\b20\d{2}-\d{2}-\d{2}\b/u],
      ['strikethrough', /~~/u],
    ];
    // `bench/` holds declarations emitted for the size harness's own fixtures.
    // They are build output of an instrument and reach no tarball, so the
    // published set is what remains once they are dropped.
    const emitted = (await declarations(ROOT)).filter(
      (file) => !relative(ROOT, file).startsWith('bench/'),
    );
    const read = await Promise.all(
      emitted.map((file) => readFile(file, 'utf8')),
    );
    const offences: string[] = [];

    for (const [ordinal, file] of emitted.entries()) {
      for (const [index, line] of read[ordinal]!.split('\n').entries()) {
        for (const [what, pattern] of FORBIDDEN) {
          if (pattern.test(line)) {
            offences.push(`${relative(ROOT, file)}:${index + 1} ${what}`);
          }
        }
      }
    }

    expect(offences).toEqual([]);
    // Non-vacuity: the emitted tree is untracked, so a fresh clone before
    // `just build` has none of it and this row would read nothing and pass.
    expect(emitted.length).toBeGreaterThan(25);
    expect(read.join('').length).toBeGreaterThan(20_000);
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
