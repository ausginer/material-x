/**
 * The kernel tier's published vocabulary, as a boundary rather than as a list
 * (D-68).
 *
 * `exports.node.test.ts` asserts *what* `kernel.js` exports and
 * `consumer.node.test.ts` compiles a behavior against it. What neither can see
 * is the **direction** of the boundary: whether the first-party sortable is
 * reaching into `src/kernel/` for something a third-party behavior could not
 * reach at all. That is the question F-59 answers badly — the tier published no
 * value, so every behavior but this package's own was unwritable — and the
 * assertion below is what stops it recurring silently: a new `../kernel/*`
 * import in `src/sortable/` is either published vocabulary, or one of the
 * groups 02 §What stays internal enumerates, or a failure.
 *
 * Source-level on purpose. The property is about **specifiers**, and a runtime
 * or type-level check cannot see one: an import that a bundler inlines and a
 * type that erases both leave nothing to assert against.
 *
 * **And a specifier is not the only way across** (D-101). `__DEV__` is an
 * ambient this package's build defines, so a module can reach the dev-build
 * concept with no import at all — invisible to everything above. D-101 decided
 * that reaching it *directly* is correct, because the flag is package
 * vocabulary rather than kernel vocabulary; what that decision then owes is a
 * rule, and §The `__DEV__` binding is the rule made executable. Without it the
 * next author re-litigates the boundary by reaching for a kernel-tier `DEV`,
 * and this file cannot tell the difference between a tier that declined the
 * import and a tier that never considered it.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as drag from '../../src/drag.ts';
import * as kernel from '../../src/kernel.ts';
import * as sortable from '../../src/sortable.ts';

const SRC = resolve(import.meta.dirname, '../../src');
const PACKAGE = resolve(import.meta.dirname, '../..');

/**
 * Every name `src/kernel.ts` and `src/drag.ts` publish — values by reflection,
 * types by declaration. The type half is written out because types erase and
 * this file runs in Node: there is nothing to reflect over.
 *
 * **The value half self-maintains and the type half does not** (review 2, B-6).
 * A type removed from `kernel.ts` but left here would silently keep permitting
 * a `../kernel/*` import of it from `src/sortable/` — the boundary this file
 * exists to hold — so the list is checked *against the entries* by the last
 * test below, and is authoritative in neither direction on its own.
 */
const PUBLISHED_TYPES: readonly string[] = [
  // kernel.js — the closure of `BehaviorFactory` (D-68, class A)
  'ActionTransition',
  'ActivationScope',
  'AdmissionSubject',
  'BehaviorConfig',
  'BehaviorContext',
  'BehaviorFactory',
  'BehaviorInstall',
  // Published rather than internal, and the move is D-35's (C5-01). 02 §What
  // stays internal's test is whether the kernel *hands one to a behavior*; the
  // kernel hands this one to every behavior twice, as `ActivationScope.lift`
  // and as `moved`'s second argument. `VisualLiftSession` stays published
  // because this alias's definition names it.
  'BehaviorLiftSession',
  'BehaviorSpec',
  'CancelOrigin',
  'CancelStage',
  'CommandAdmission',
  'Disposer',
  'Draft',
  'FailureStage',
  'Frame',
  'FramePartOf',
  // The scope's own closure (D-85), and the sortable reaches it for the same
  // reason free drag does: a behavior reporting a local delta is handed the
  // projection rather than measuring one.
  'InheritedSpace',
  'KernelFrame',
  'LandingTail',
  'LiftMode',
  'LifetimeScope',
  'OffsetBox',
  'OperationIdentity',
  'Phase',
  'PreparedSettlement',
  'ReleaseTransition',
  'ResolutionCommand',
  'SettlementInput',
  'SettlementTransition',
  'Transition',
  'VisualLiftSession',
  // drag.js — shared vocabulary, belonging to neither tier (D-64, D-132).
  // ~~`DraggableErrorCode`~~ deleted with the coarse code; `FailureStage` is
  // published from both roots and is already listed with the kernel's types
  // above, so it needs no second entry here.
  'DOMRealm',
  'Point',
];

/**
 * What 02 §What stays internal lists, with the substitute it names. The
 * first-party behavior may use these; a third-party one is expected to reach
 * for the substitute instead, which is why each group is enumerated rather
 * than the whole of `src/kernel/` being waved through.
 */
const INTERNAL: Readonly<Record<string, readonly string[]>> = {
  'the seam driver': [
    'SeamOutcome',
    'SeamContext',
    'SeamDriver',
    'ArmOutcome',
    'SEAM_COMMITTED',
    'SEAM_DISCARDED',
    'SEAM_EFFECT_FAILED',
    'SEAM_INVALIDATED',
    'SEAM_PREPARE_FAILED',
  ],
  'the full lifetime': [
    'Lifetime',
    'createLifetime',
    'createOperationLifetimes',
    'OperationLifetimes',
  ],
  'the frame helpers': ['frame', 'KERNEL_FRAME_KEYS'],
  // **The channel and the unwind rule** (D-130). `Notify` is the channel as
  // seen by a module that does not own it, and `createUnwind` builds the guard
  // over it. Neither is published: a behavior reaches the consumer through its
  // own callbacks slot and never through these, which is the same
  // discriminating rule the rest of this table applies — *the kernel never
  // hands one to a behavior and never accepts one from it*.
  'the one channel': ['Notify', 'createUnwind', 'Unwind'],
  'lift acquisition': ['acquireLift', 'captureInlineStyles', 'acquireTopLayer'],
  'scheduling and invalidation': [
    'createInvalidator',
    'createFrameTask',
    'FrameTask',
    'Invalidator',
  ],
  'the ingress protocol': ['POINTER_DOWN', 'KEY_DOWN'],
  'the input policy': ['pathOwnsInteraction'],
  // **The reusable coordinate buffer** (D-144). It is `Writable<Point>` and
  // nothing more, so a third-party behavior's substitute is the shape written
  // out — the alias exists so that `type-fest` is named in a module the
  // declaration prune removes, and publishing it would put a `devDependency`
  // into the tarball's type surface (F-122).
  'the point cache': ['PointCache'],
  // The phase *constants* are published; `NO_STAMP` and the internal frame
  // plumbing are not.
  'kernel-private frame state': ['NO_STAMP'],
  // `DraggableError` is a runtime value on `drag.js`; the sortable imports the
  // class from its declaration site, which is the same declaration.
  // ~~`toDraggableError`~~ deleted at D-132 with the mapping it applied.
  'the shared error class': ['DraggableError'],
};

const INTERNAL_NAMES = new Set(Object.values(INTERNAL).flat());
const PUBLISHED_NAMES = new Set([
  ...Object.keys(kernel),
  ...Object.keys(drag),
  ...PUBLISHED_TYPES,
]);

type Import = Readonly<{
  file: string;
  module: string;
  names: readonly string[];
}>;

/** `import … from '../kernel/x.ts'` in one file, names flattened. */
function kernelImports(file: string, source: string): readonly Import[] {
  const found: Import[] = [];
  const pattern =
    /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+'(\.\.\/kernel\/[^']+)'/gu;

  for (const match of source.matchAll(pattern)) {
    const names = match[1]!
      .split(',')
      .map((entry) => entry.replace(/\btype\b/u, '').trim())
      // `a as b` imports the declaration `a`.
      .map((entry) => entry.split(/\s+as\s+/u)[0]!.trim())
      .filter((entry) => entry.length > 0);

    found.push({ file, module: match[2]!, names });
  }

  return found;
}

async function sortableImports(): Promise<readonly Import[]> {
  const dir = join(SRC, 'sortable');
  const files = (await readdir(dir)).filter((name) => name.endsWith('.ts'));
  const sources = await Promise.all(
    files.map((name) => readFile(join(dir, name), 'utf8')),
  );

  return files.flatMap((name, index) =>
    kernelImports(`sortable/${name}`, sources[index]!),
  );
}

/** One module's source with its block comments removed, so prose cannot match. */
async function exportedSource(file: string): Promise<string> {
  const source = await readFile(join(SRC, file), 'utf8');

  return source.replaceAll(/\/\*[\s\S]*?\*\//gu, '');
}

describe('the kernel tier boundary', () => {
  it('should reach nothing from the behavior that is neither published nor a named internal', async () => {
    const stray: string[] = [];

    for (const entry of await sortableImports()) {
      for (const name of entry.names) {
        if (!PUBLISHED_NAMES.has(name) && !INTERNAL_NAMES.has(name)) {
          stray.push(`${entry.file}: ${name} (from ${entry.module})`);
        }
      }
    }

    // A failure here is a **decision**, not a lint: either the name belongs in
    // the published vocabulary — in which case a third-party behavior needs it
    // too — or it belongs in one of 02's internal groups with a substitute
    // stated. Adding it to `INTERNAL` without that sentence is how the tier
    // silently widens back.
    expect(stray).toEqual([]);
  });

  it('should declare the doubly-declared seam type exactly once', async () => {
    // **F-61.** `ActionTransition` and ~~`SeamRejection`~~ were declared in
    // `kernel/seams.ts` *and* `kernel/spec.ts`, structurally identical and
    // independently maintained. Harmless while both were internal; publishing
    // one of each makes it the identity hazard 03 §The export topology exists
    // to prevent — a consumer's compiler resolves the published declaration
    // while the driver consumes the other.
    //
    // **One of the two is gone with the transport it carried** (D-152), and
    // the row keeps the other rather than being deleted: the hazard is a
    // property of re-exporting across the two modules, which `ActionTransition`
    // still does.
    const dir = join(SRC, 'kernel');
    const files = (await readdir(dir)).filter((name) => name.endsWith('.ts'));
    const declarations: Record<string, string[]> = {
      ActionTransition: [],
    };

    const sources = await Promise.all(
      files.map((name) => readFile(join(dir, name), 'utf8')),
    );

    files.forEach((name, index) => {
      for (const symbol of Object.keys(declarations)) {
        if (sources[index]!.includes(`export type ${symbol}`)) {
          declarations[symbol]!.push(name);
        }
      }
    });

    expect(declarations).toEqual({ ActionTransition: ['seams.ts'] });
  });

  it('should keep the re-homed cancel stages as one declaration on two entries', () => {
    // D-68 re-homes `AT_*`/`CancelStage` to the kernel tier — a behavior
    // **writes** one into D-66's fallback — while `sortable.js` keeps
    // publishing them, because a `CanceledReorderResult` carries one and an
    // ordinary consumer must discriminate it. Identity, not mere presence: two
    // entries, one declaration, so neither tier reaches the other for it.
    expect(sortable.AT_PROPOSAL).toBe(kernel.AT_PROPOSAL);
    expect(sortable.AT_CONSUMER).toBe(kernel.AT_CONSUMER);
  });

  it('should re-export the middle tier’s landing seam types from the kernel’s own modules', async () => {
    // The type half of the same property, and it has to be source-level: the
    // re-homed names erase, so nothing survives to `toBe`. What is asserted is
    // that `sortable/feature.js` **re-exports** them rather than declaring its
    // own — the direction D-68 corrects, since `BehaviorSpec.landingTail` is
    // kernel SPI and a kernel-tier author reaching the sortable for
    // `LandingTail` would be importing a behavior in order to author a
    // different one.
    const source = await readFile(join(SRC, 'sortable/feature.ts'), 'utf8');

    for (const name of ['LandingTail', 'Disposer', 'InheritedSpace']) {
      expect([name, source.includes(`export type ${name} =`)]).toEqual([
        name,
        false,
      ]);
      expect([name, source.includes(name)]).toEqual([name, true]);
    }

    expect(source).toContain("from '../kernel/spec.ts'");
    expect(source).toContain("from '../kernel/lifetimes.ts'");
  });

  it('should list only types the entries still export', async () => {
    // **B-6, closed rather than annotated.** The exposure is one-directional: a
    // stale name here widens the allow-list, and nothing else in the suite
    // notices, because `exports.node.test.ts` reflects over *values* and the
    // per-entry TypeDoc run only sees names that are still reachable.
    //
    // Matched against the export statements with comments stripped, since every
    // one of these names also appears in the prose above its export.
    const entries =
      (await exportedSource('kernel.ts')) + (await exportedSource('drag.ts'));
    const stale = PUBLISHED_TYPES.filter((name) => !entries.includes(name));

    expect(stale).toEqual([]);
  });
});

/**
 * `__DEV__` reads across `src/`, one entry per module that mentions it.
 *
 * **This is a text match, not a parse, and the limits are stated rather than
 * implied** (P06-04). Both comment styles are stripped — block first, then line
 * — so the prose stating the rule, including this file's own, cannot satisfy or
 * violate it. Nothing else is: a **string literal** containing the token counts
 * as a read, and a binding fenced by string literals holding comment delimiters
 * is invisible. Both are accepted. A gate that could not be fooled by a
 * deliberately contrived file would need a TypeScript parser here, which is a
 * much larger dependency than the rule is worth — and the failure mode of the
 * text match is a **false positive**, which fails loudly and is fixed by
 * rewording, rather than a false negative that ships.
 *
 * **Two scope limits, also stated** (P06-03). Only `src/**` is walked, so
 * `bench/` and `tests/` are outside the rule — deliberately, since the rule is
 * about the shipped tiers. And only `.ts` files: there are no `.tsx` in this
 * package, and a first one would arrive with a decision of its own.
 *
 * `src/globals.d.ts` is excluded by exact path rather than by basename: it is
 * what makes the ambient nameable at package scope and is the one file whose
 * job is to mention it, which is not a licence for a `globals.d.ts` anywhere
 * else in the tree.
 */
async function devReaders(): Promise<ReadonlyArray<readonly [string, number]>> {
  const found: Array<readonly [string, number]> = [];

  const walk = async (directory: string): Promise<void> => {
    const entries = await readdir(directory, { withFileTypes: true });

    await Promise.all(
      entries.map(async (entry) => {
        const path = join(directory, entry.name);

        if (entry.isDirectory()) {
          return await walk(path);
        }

        if (!entry.name.endsWith('.ts') || path === join(SRC, 'globals.d.ts')) {
          return;
        }

        const source = await readFile(path, 'utf8');
        // Block comments first, then line comments: a `//` inside a block
        // comment is gone before it can eat the rest of its line, which is the
        // ordering that mis-strips the fewest real files. See the note above
        // for what this deliberately does not handle.
        const code = source
          .replaceAll(/\/\*[\s\S]*?\*\//gu, '')
          .replaceAll(/\/\/[^\n]*/gu, '');
        const reads = code.match(/__DEV__/gu)?.length ?? 0;

        if (reads > 0) {
          found.push([relative(SRC, path).replaceAll('\\', '/'), reads]);
        }
      }),
    );
  };

  await walk(SRC);

  return found.toSorted(([a], [b]) => a.localeCompare(b));
}

/**
 * The files a home claim can be written in: this package's source, tests and
 * benchmarks, plus its root's own files — where the build define lives, and
 * where one of the two wrong answers was written.
 *
 * **The root is read flat**, because recursing from it would sweep the dated
 * record in `.plan/`, which states what was true when it was written.
 */
async function homeClaimScope(): Promise<readonly string[]> {
  const walk = async (
    directory: string,
    flat: boolean,
  ): Promise<readonly string[]> => {
    const entries = await readdir(directory, { withFileTypes: true });
    const found = await Promise.all(
      entries.map(async (entry) => {
        const path = join(directory, entry.name);

        if (entry.isDirectory()) {
          return entry.name === 'node_modules' ||
            entry.name.startsWith('.') ||
            flat
            ? []
            : await walk(path, false);
        }

        // Emitted declarations copy `src/`'s prose, which is already in scope.
        return /\.(?:ts|md)$/u.test(entry.name) && !entry.name.endsWith('.d.ts')
          ? [path]
          : [];
      }),
    );

    return found.flat();
  };

  const roots: ReadonlyArray<readonly [string, boolean]> = [
    [SRC, false],
    [join(PACKAGE, 'tests'), false],
    [join(PACKAGE, 'bench'), false],
    [PACKAGE, true],
  ];
  const walked = await Promise.all(
    roots.map(async ([root, flat]) =>
      (await stat(root)).isDirectory() ? await walk(root, flat) : [],
    ),
  );

  // `src/globals.d.ts` is the one `.d.ts` that is authored rather than emitted,
  // and it carried one of the two wrong answers.
  return [...walked.flat(), join(SRC, 'globals.d.ts')].toSorted();
}

/**
 * The tier a module belongs to: the **top-level directory under `src/`**, or
 * `.` for the entries at the root.
 *
 * **Not `dirname`** (P06-03). A tier is `kernel`, `sortable`, `free-drag`,
 * `shared` — the units 02 §What stays internal draws its boundary between — and
 * under `dirname` a second binding one directory deeper — in a hypothetical
 * `sub` folder under `sortable` — would sit in a tier of its own and satisfy a
 * rule it plainly breaks.
 */
const tierOf = (file: string): string => file.split('/')[0] ?? '.';

describe('the `__DEV__` binding', () => {
  // **D-101, made executable.** The decision is that `__DEV__` is *package*
  // vocabulary, so a behavior-tier module binds it directly rather than
  // importing a kernel-tier binding — which would be a behavior-tier reach
  // into `kernel/` that 02 §What stays internal says must not exist. That is
  // only a boundary if the shape it permits is bounded, and these three rows
  // are the bound: one binding per tier, bound once, and only in the tiers that
  // are supposed to have one.
  //
  // The trigger they encode is the one D-101 named: a second dev assertion in a
  // second module of a tier fails the first row, and the fix is that tier's own
  // `dev.ts` — still importing nothing from `kernel/`.
  //
  // **The kernel is no longer on the list** (D-108). Its author-facing checks
  // are production checks and ~~`src/kernel/dev.ts`~~ is retired, so the
  // package now has exactly one binding, in the one tier with per-frame dev
  // work. (~~Four~~ **two** since D-128 deleted the frame pair; the rule is
  // about where a binding lives, not how many checks it would have gated.) The third row is what holds that: the kernel re-acquiring a binding
  // fails it, which is the re-litigation this rule exists to catch.
  //
  // **Each row can fail on its own** (P06-03), which is what makes three of
  // them worth having: the third is a list of *tiers* rather than of files, so
  // a second binding inside `sortable/` fails the first row while leaving the
  // third green, and moving the binding to another `sortable/` module fails
  // neither — correctly, since the rule is about tiers and not about filenames.

  it('should bind the flag in at most one module per tier', async () => {
    const perTier = new Map<string, string[]>();

    for (const [file] of await devReaders()) {
      const tier = tierOf(file);

      perTier.set(tier, [...(perTier.get(tier) ?? []), file]);
    }

    const doubled = [...perTier]
      .filter(([, files]) => files.length > 1)
      .map(([tier, files]) => `${tier}: ${files.join(', ')}`);

    expect(doubled).toEqual([]);
  });

  it('should read the ambient exactly once in each module that binds it', async () => {
    // A module that mentions `__DEV__` twice is guarding a branch with the
    // ambient rather than with its binding, which is the shape that makes the
    // rule above unenforceable — the binding stops being the tier's single
    // definition of "dev" and becomes one of several reads.
    const repeated = (await devReaders()).filter(([, reads]) => reads > 1);

    expect(repeated).toEqual([]);
  });

  it('should keep the tiers that bind it to the declared set', async () => {
    // The positive half, and the reason the two negatives are not enough: they
    // are both satisfied by a tree in which nothing binds it at all, and by one
    // in which a *new* tier quietly acquires an assertion. This row is the list
    // the reviewer reads — **of tiers**, because that is the unit the rule is
    // stated in, and pinning filenames here would make the first row
    // unfailable.
    const tiers = [
      ...new Set((await devReaders()).map(([file]) => tierOf(file))),
    ];

    expect(tiers).toEqual(['sortable']);
  });

  it('should bind the flag in exactly one module', async () => {
    // The three rows above bound the *shape* — at most one per tier, read once,
    // in a declared tier — and every one of them is satisfied by a tree that
    // binds it nowhere. This is the count itself, and it is what the rule below
    // needs before it can name a file.
    expect((await devReaders()).map(([file]) => file)).toEqual([
      'sortable/rect-index.ts',
    ]);
  });

  it('should name that module wherever prose names the binding’s home', async () => {
    // **The invariant that has now failed twice with two different wrong
    // answers**, and the reason it is an assertion rather than a review item:
    // both wrong answers named a file that **exists**, so nothing that resolves
    // paths on disk can see either.
    //
    // **It is mechanical, not semantic.** No attempt is made to decide whether
    // a sentence is *about* the binding. The rule is positional: a prose
    // paragraph that mentions the ambient may name the module that declares it
    // and the module that binds it, and no other module of this source tree. A
    // paragraph naming `tsdown.config.ts`, `.scripts/vite-config.ts` or a test
    // file is untouched, because those are not modules of `src/`.
    //
    // A struck path is a deliberate reference to something retired, which is
    // the same convention `tests/references.node.test.ts` counts.
    const bound = (await devReaders()).map(([file]) => `src/${file}`);
    const allowed = new Set(['src/globals.d.ts', ...bound]);
    // The tiers are read off the tree rather than listed, so a new one joins
    // the rule by existing.
    const tiers = (await readdir(SRC, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    const module = new RegExp(
      `^(?:src/)?(?:${tiers.join('|')})/[\\w./-]+\\.ts$|^src/[\\w./-]+\\.ts$`,
      'u',
    );
    const wrong: string[] = [];
    const files = await homeClaimScope();
    // One batch rather than one read per file: the scope is the whole package
    // and every file is read whatever the previous one said.
    const sources = await Promise.all(
      files.map((file) => readFile(file, 'utf8')),
    );

    for (const [ordinal, file] of files.entries()) {
      const source = sources[ordinal]!;
      const markdown = file.endsWith('.md');
      let paragraph: string[] = [];
      let opened = 0;
      const close = (): void => {
        const text = paragraph.join(' ');

        if (paragraph.length > 0 && text.includes('__DEV__')) {
          for (const [, struck, path] of text.matchAll(
            /(~~)?`([^`]+)`(?:~~)?/gu,
          )) {
            const named = path!.startsWith('src/') ? path! : `src/${path!}`;

            if (
              struck === undefined &&
              module.test(path!) &&
              !allowed.has(named)
            ) {
              wrong.push(
                `${relative(PACKAGE, file)}:${opened} :: \`${path!}\``,
              );
            }
          }
        }

        paragraph = [];
      };

      for (const [index, raw] of source.split('\n').entries()) {
        const prose = markdown
          ? raw
          : /^\s*(?:\/\*\*|\*\/|\*|\/\/)\s?(.*)$/u.exec(raw)?.[1];

        // **The unit differs by file kind, and each is the natural one.** In
        // markdown a blank line separates two statements. Inside a comment
        // block it does not — a doc block is one statement about one thing,
        // and both wrong answers put the ambient in one of its paragraphs and
        // the file name in another. So a comment run closes on the first line
        // that is not a comment, and a markdown paragraph on the first blank.
        if (prose === undefined || (markdown && prose.trim() === '')) {
          close();
          continue;
        }

        if (paragraph.length === 0) {
          opened = index + 1;
        }

        paragraph.push(prose.trim());
      }

      close();
    }

    expect(wrong).toEqual([]);
  });
});
