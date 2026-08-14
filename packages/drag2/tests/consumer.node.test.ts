/**
 * The pack/extract consumer fixture.
 *
 * Every other suite imports `src/` directly, so nothing else in this package
 * can see what a consumer actually receives: the `exports` map, the emitted
 * declarations, and whether the tarball contains the files those two promise.
 * This builds, packs and extracts the real package, then imports and compiles
 * against the extracted copy from outside the workspace.
 *
 * It is deliberately the slowest test here. It is also the only one that would
 * catch a subpath whose `default` condition points at a file the build never
 * emitted, or an internal SPI type becoming reachable through a public entry.
 */
import { spawn } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

/**
 * Runs a command to completion, rejecting with the captured output on a
 * non-zero exit — which is what makes the consumer's `tsc` run a usable
 * assertion rather than a bare boolean.
 */
function run(
  command: string,
  args: readonly string[],
  cwd: string,
): Promise<Readonly<{ stdout: string }>> {
  return new Promise((done, fail) => {
    const child = spawn(command, args, { cwd });
    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.on('error', fail);
    child.on('close', (code) => {
      if (code === 0) {
        done({ stdout });
        return;
      }

      fail(new Error(`${command} exited with ${code}\n${stdout}${stderr}`));
    });
  });
}

/** Code-unit order, so the expected lists below read the way they sort. */
const byName = (a: string, b: string): number => {
  if (a === b) {
    return 0;
  }

  return a < b ? -1 : 1;
};

const ROOT = resolve(import.meta.dirname, '..');
const REPO = resolve(ROOT, '../..');
const MINUTE = 60_000;

/**
 * Subpaths declared in the export topology from phase 0 whose module is still a
 * stub, so the build has no runtime code to emit for them. **Empty since 8b**:
 * every declared subpath now ships runtime code. It stays as a named list rather
 * than being deleted, because a future subpath declared ahead of its
 * implementation is exactly the case this guards.
 */
const PENDING: readonly string[] = [];

const CONSUMER = `import {
  DraggableError,
  type DOMRealm,
  type DraggableErrorCode,
  type Point,
} from '@ydinjs/drag2/drag.js';
import {
  draggable,
  FAILURE_ACTIVATION,
  FAILURE_TERMINAL_CALLBACK,
  type BehaviorFactory,
  type FailureStage,
} from '@ydinjs/drag2/kernel.js';
import {
  AT_CONSUMER,
  AT_PROPOSAL,
  ReorderResolution,
  sortable,
  type AcceptedReorderResolution,
  type CancelStage,
  type CollectionSnapshot,
  type DragErrorContext,
  type OnReorder,
  type PlaceholderContext,
  type PlaceholderFactory,
  type SortableConfig,
  type RejectedReorderResolution,
  type ReorderProposal,
  type ReorderRequest,
  type ReorderTransactionResult,
  type SortableController,
} from '@ydinjs/drag2/sortable.js';
import { y } from '@ydinjs/drag2/sortable/y.js';
import {
  landing,
  type LandingOptions,
} from '@ydinjs/drag2/sortable/landing.js';
// **The three seam types re-homed** (D-63, D-61): they stopped being consumer
// vocabulary when \`landing({ run })\` went, and stayed authoring vocabulary.
import type {
  LandingContext,
  LandingHandle,
  LandingStart,
} from '@ydinjs/drag2/sortable/feature.js';
import {
  layoutAnimation,
  type LayoutAnimationOptions,
} from '@ydinjs/drag2/sortable/layout-animation.js';

// ---------------------------------------------------------------------------
// The intended surface, exercised rather than merely imported.
// ---------------------------------------------------------------------------

declare const root: HTMLElement;
declare const items: readonly HTMLElement[];

const list: SortableController = sortable(
  root,
  y(),
  {
    items: () => items,
    onReorder: (request: ReorderRequest) => {
      void request.from;
      void request.to;
      void request.item;
      return ReorderResolution.accept();
    },
    // **One terminal, four arms** (D-62). \`onFinish\`/\`onCancel\` and the two
    // partition types that existed to type them — \`SortableFinishResult\`,
    // \`SortableCancelResult\` — are gone, so this is also the case that proves
    // a consumer can tell the arms apart with nothing but the discriminant
    // (F-41).
    onEnd: (result: ReorderTransactionResult): void => {
      if (result.type === 'accepted') {
        const proposal: ReorderProposal = result.proposal;
        // The proposal exposes the snapshot it was built against, so the type
        // of that field has to be nameable too.
        const snapshot: CollectionSnapshot = proposal.snapshot;

        void proposal.request.version;
        void snapshot.items.length;
        void snapshot.version;
      }

      if (result.type === 'canceled') {
        const stage: CancelStage = result.stage;

        void (stage === AT_PROPOSAL || stage === AT_CONSUMER);
      }
    },
    onError: (error: DraggableError, context: DragErrorContext): void => {
      // **D-64.** The ordinary consumer branches on a coarse fault class and
      // never sees a pipeline stage: \`context\` is the sortable half alone.
      const code: DraggableErrorCode = error.code;
      const domain: ReorderTransactionResult | null = context.domain;

      void (code === 'consumer');
      void (error instanceof DraggableError);
      void domain?.type;
    },
    // **D-65**: the callback itself, not \`create\` plus a class name. Nameable,
    // so a consumer can hoist the factory out of the object literal.
    placeholder: ((context: PlaceholderContext) => {
      void context.rect.height;
      return document.createElement('div');
    }) satisfies PlaceholderFactory,
    handle: (item: HTMLElement) => item.firstElementChild as HTMLElement,
    visual: (item: HTMLElement) => item,
    threshold: 4,
  },
  landing({ duration: 120, easing: 'ease-out' }),
  layoutAnimation({ duration: 90 }),
);

// **D-44**: payload-free. The collection is a pull source, so this says
// \`re-read what you already have\` rather than handing over a new array.
list.invalidate();
list.cancel('reason');
list.destroy();

// A custom runner is authorable from the **middle tier** alone (D-63): the
// consumer surface no longer takes one, and the seam a third-party installer
// fills is reachable without importing anything else.
const run: LandingStart = (
  context: LandingContext,
  done: () => void,
): LandingHandle => {
  const realm: DOMRealm = context.realm;
  const from: Point = context.from;

  void realm.window;
  void context.compose(from.x, from.y);
  done();
  return { destroy: (): void => {} };
};

// Both members of the \`ReorderResolution\` union are nameable, so a consumer can
// give a helper a return type narrower than the union.
declare const accepted: AcceptedReorderResolution;
declare const rejected: RejectedReorderResolution;

void [accepted.type, rejected.type];

declare const behavior: BehaviorFactory<SortableController, object>;
declare const onReorder: OnReorder;
// **D-45**: the config schema replaces \`SortableCallbacks\` and
// \`PlaceholderOptions\`, and a \`Partial\` of it is exactly what a fragment is —
// so a consumer can give a preset helper a return type.
declare const preset: Partial<SortableConfig>;
declare const landingOptions: LandingOptions;
declare const layoutOptions: LayoutAnimationOptions;

void [run, behavior, onReorder, preset, landingOptions, layoutOptions];

// Inference through the *packed* declarations, with no explicit type argument.
const inferred = draggable(root, behavior);

inferred.destroy();

// ---------------------------------------------------------------------------
// Opacity: neither branded value is constructible or callable.
// ---------------------------------------------------------------------------

// D-55: a behavior *is* the install function now, so the two opacity rows that
// stood here have no subject. What is still checked is that a bare literal does
// not satisfy the factory's return type.
// @ts-expect-error: a factory must return both halves of the handshake
const forgedBehavior: BehaviorFactory<SortableController, object> = () => ({});
// D-45: an installer is no longer opaque — it is a plain function published at
// the middle tier — so the two brand rows that stood here have no subject
// either. What survives is that an unknown slot is not a config: the merge
// walks the schema, so a misspelled key has to be a *compile* error to be
// diagnosable at all.
// @ts-expect-error: \`onReorded\` is not a slot
const forgedFragment: Partial<SortableConfig> = { onReorded: () => {} };
// D-55: there is no branded behavior type at all now, so the opacity check has
// no subject. What replaces it is the reachability check below — the SPI is
// published at \`kernel.js\` and still unreachable from \`drag.js\`.
// @ts-expect-error: \`Behavior\` is withdrawn (D-55)
type Part = import('@ydinjs/drag2/kernel.js').Behavior<SortableController>;

void [forgedBehavior, forgedFragment];

// ---------------------------------------------------------------------------
// Every internal SPI name is unreachable. Each line must error; an
// \`@ts-expect-error\` that stops erroring is itself a compile failure, so this
// list cannot rot into a no-op.
// ---------------------------------------------------------------------------

// @ts-expect-error: the install function type is internal
type A1 = import('@ydinjs/drag2/drag.js').BehaviorFactory<SortableController, object>;
// @ts-expect-error: the behavior SPI is internal
type A2 = import('@ydinjs/drag2/drag.js').BehaviorSpec<object>;
// @ts-expect-error: the install result is internal
type A3 = import('@ydinjs/drag2/drag.js').BehaviorInstall<SortableController, object>;
// @ts-expect-error: the host is internal
type A4 = import('@ydinjs/drag2/drag.js').KernelHost;
// @ts-expect-error: the seam transition is internal
type A5 = import('@ydinjs/drag2/drag.js').Transition<object>;
// @ts-expect-error: the activation scope is internal
type A6 = import('@ydinjs/drag2/drag.js').ActivationScope;
// @ts-expect-error: the settlement scope is internal
type A7 = import('@ydinjs/drag2/drag.js').SettlementScope;
// @ts-expect-error: the settlement input is internal
type A8 = import('@ydinjs/drag2/drag.js').SettlementInput;
// @ts-expect-error: the resolution command is internal
type A9 = import('@ydinjs/drag2/drag.js').ResolutionCommand;
// @ts-expect-error: the seam rejection is internal
type A10 = import('@ydinjs/drag2/drag.js').SeamRejection;
// @ts-expect-error: the lift mode constants are internal
const A11 = import('@ydinjs/drag2/drag.js').then((m) => m.LIFT_FLAT);
// @ts-expect-error: the slot record is internal
type B1 = import('@ydinjs/drag2/sortable.js').SortableSlots;
// @ts-expect-error: the contribution shape is internal
type B2 = import('@ydinjs/drag2/sortable.js').SortableContribution;
// @ts-expect-error: the geometry capability is internal
type B3 = import('@ydinjs/drag2/sortable.js').InsertionGeometry;
// @ts-expect-error: the feature context is internal
type B4 = import('@ydinjs/drag2/sortable.js').FeatureContext;
// @ts-expect-error: the displacement view is internal
type B5 = import('@ydinjs/drag2/sortable.js').DisplacementView;
// @ts-expect-error: the insertion is internal
type B7 = import('@ydinjs/drag2/sortable.js').Insertion;
// @ts-expect-error: the outcome constants are internal
const B8 = import('@ydinjs/drag2/sortable.js').then((m) => m.OUTCOME_ACCEPTED);
// @ts-expect-error: the recovery constants are internal
const B9 = import('@ydinjs/drag2/sortable.js').then((m) => m.RECOVERY_HOME);

// The four names Checkpoint D (D5) decided **not** to carry over. Each is a
// deliberate omission with its migration loss stated in the parity ledger
// (§2.1, §7), and without these lines those decisions have no executable
// guard: re-adding one would be a silent surface change.
// @ts-expect-error: dissolved into \`LandingOptions\`/\`LayoutAnimationOptions\` (D5)
type D1 = import('@ydinjs/drag2/sortable.js').AnimationTiming;
// @ts-expect-error: dropped; the pair survives inside \`PlaceholderContext\` (D5)
type D2 = import('@ydinjs/drag2/sortable.js').DragSubject;
// @ts-expect-error: structurally inlined into \`OnReorder\`'s second parameter (D5)
type D3 = import('@ydinjs/drag2/sortable.js').ResolutionContext;
// @ts-expect-error: dissolved into \`CanceledReorderResult\`'s \`reason\`/\`stage\` (D5)
type D4 = import('@ydinjs/drag2/sortable.js').CancellationReason;
// \`AnimationTiming\` is the one of the four whose plausible re-entry point is
// **not** \`sortable.js\`: it dissolved into two option types that live on their
// own entries, so a re-add would land there. Guarded on both, which is what
// makes the ledger's claim about it executable rather than aspirational
// (C3-04). The other three have no such second home — each is a name only
// \`sortable.js\` ever exported.
// @ts-expect-error: dissolved into \`LandingOptions\` (D5)
type D5a = import('@ydinjs/drag2/sortable/landing.js').AnimationTiming;
// @ts-expect-error: dissolved into \`LayoutAnimationOptions\` (D5)
type D5b = import('@ydinjs/drag2/sortable/layout-animation.js').AnimationTiming;

// Deep imports are not declared in \`exports\`, so the module graph itself is
// closed — not merely the names each entry chooses to re-export.
// @ts-expect-error: the kernel is not a declared subpath
type C1 = import('@ydinjs/drag2/kernel/spec.js').KernelHost;
// @ts-expect-error: source is not a declared subpath
type C2 = import('@ydinjs/drag2/src/drag.ts').Point;
// The slot views are still internal. The **feature authoring module is not**
// (D-61): \`sortable/feature.js\` is a declared subpath now — the middle tier
// where an installer's types live — so this line must *resolve*, which is the
// opposite of what it asserted before.
type C3 = import('@ydinjs/drag2/sortable/feature.js').SortableInstaller;
// @ts-expect-error: the slot views are not a declared subpath
type C4 = import('@ydinjs/drag2/sortable/slots.js').DisplacementView;

void [A11, B8, B9];
declare const unusedTypes: [A1, A2, A3, A4, A5, A6, A7, A8, A9, A10, B1, B2, B3, B4, B5, B7, C1, C2, C3, C4, D1, D2, D3, D4, D5a, D5b, Part];
void unusedTypes;
`;

const TSCONFIG = JSON.stringify({
  compilerOptions: {
    strict: true,
    module: 'nodenext',
    moduleResolution: 'nodenext',
    target: 'esnext',
    lib: ['esnext', 'dom'],
    types: [],
    noEmit: true,
    // Deliberately on: the point is to typecheck the packed declaration graph,
    // not to trust that it resolves.
    skipLibCheck: false,
  },
  include: ['consumer.ts'],
});

type Packed = Readonly<{
  /** The extracted package root. */
  dir: string;
  /** The consumer project, outside the workspace, resolving the extracted copy. */
  consumer: string;
  /** `exports` as published, minus `./package.json`. */
  subpaths: ReadonlyMap<string, Readonly<{ types: string; default?: string }>>;
}>;

let packed: Packed;

const exists = async (path: string): Promise<boolean> => {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
};

/** Every packed file whose extension `suffix` matches, as absolute paths. */
async function packedFiles(
  dir: string,
  suffix: string,
): Promise<readonly string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(suffix))
    .map((entry) => join(entry.parentPath, entry.name));
}

beforeAll(async () => {
  const dir = await mkdtemp(join(tmpdir(), 'drag2-consumer-'));

  await run('npx', ['tsdown', '--config', 'tsdown.config.ts'], ROOT);

  const { stdout } = await run(
    'npm',
    ['pack', '--pack-destination', dir, '--silent'],
    ROOT,
  );

  await run(
    'tar',
    ['-xzf', join(dir, stdout.trim().split('\n').at(-1)!), '-C', dir],
    ROOT,
  );

  const extracted = join(dir, 'package');
  const consumer = join(dir, 'consumer');
  // One scope directory above both the extracted package and the consumer, so
  // node's upward lookup finds it from either. The extracted copy needs it too:
  // `kernel/presentation.js` imports `@ydinjs/box-quad` at runtime, which is
  // the kind of dependency edge a tarball can only be proven to satisfy from
  // outside the workspace.
  const scope = join(dir, 'node_modules', '@ydinjs');

  await mkdir(scope, { recursive: true });
  await mkdir(consumer, { recursive: true });
  // The consumer resolves the extracted tarball, never `src/` — a deep import
  // the `exports` map does not declare has to fail here the way it would for a
  // real consumer.
  await symlink(extracted, join(scope, 'drag2'));
  await symlink(join(REPO, 'packages', 'box-quad'), join(scope, 'box-quad'));
  await writeFile(join(consumer, 'consumer.ts'), CONSUMER);
  await writeFile(join(consumer, 'tsconfig.json'), TSCONFIG);

  const manifest = JSON.parse(
    await readFile(join(extracted, 'package.json'), 'utf8'),
  ) as {
    exports: Record<
      string,
      string | Readonly<{ types: string; default?: string }>
    >;
  };
  const subpaths = new Map<
    string,
    Readonly<{ types: string; default?: string }>
  >();

  for (const [key, value] of Object.entries(manifest.exports)) {
    if (typeof value !== 'string') {
      subpaths.set(key, value);
    }
  }

  packed = { dir: extracted, consumer, subpaths };
}, 4 * MINUTE);

describe('the packed package', () => {
  it('should ship a runtime module for every landed subpath', async () => {
    // Runtime-imported, not merely stat-ed: a module that exists but cannot
    // resolve its own imports is exactly the B-01 failure this suite exists for.
    const landed = [...packed.subpaths].filter(
      ([key, value]) => !PENDING.includes(key) && value.default !== undefined,
    );

    expect(landed.length).toBeGreaterThan(0);

    const imported = await Promise.all(
      landed.map(([, value]) => import(join(packed.dir, value.default!))),
    );

    for (const each of imported) {
      expect(each).toBeTypeOf('object');
    }
  });

  it('should expose sortable.js as a runtime module', async () => {
    // Named on its own because it is the entry the contract gives a runtime
    // export to (`ReorderResolution`) while every other sortable subpath is a
    // feature. A type-only entry emits no `.js`, and the `default` condition
    // would then point at nothing.
    const entry: Readonly<{
      ReorderResolution: Readonly<{ accept(): unknown }>;
    }> = await import(join(packed.dir, './sortable.js'));

    // Acceptance declares nothing (D-41): the readiness protocol the
    // `presentation` flag belonged to is deleted, so the arm is the tag alone.
    expect(entry.ReorderResolution.accept()).toEqual({ type: 'accepted' });
  });

  it('should leave exactly the unimplemented feature subpaths without runtime code', async () => {
    const missing: string[] = [];

    for (const [key, value] of packed.subpaths) {
      if (value.default === undefined) {
        // A **type-only** subpath (D-61), not a pending one: it declares no
        // `default` condition at all, so there is no file it is promising and
        // failing to ship. `PENDING` is for the opposite case — a `default`
        // that points at a module the build has not written yet.
        continue;
      }

      // oxlint-disable-next-line no-await-in-loop
      if (!(await exists(join(packed.dir, value.default)))) {
        missing.push(key);
      }
    }

    expect(missing.toSorted()).toEqual(PENDING);
  });

  it('should resolve the types target of every declared subpath', async () => {
    const missing: string[] = [];

    for (const [key, value] of packed.subpaths) {
      // oxlint-disable-next-line no-await-in-loop
      if (!(await exists(join(packed.dir, value.types)))) {
        missing.push(key);
      }
    }

    expect(missing).toEqual([]);
  });

  it('should expose exactly the intended runtime surface, per subpath', async () => {
    // The frozen table from contract 03, asserted as an **equality**: a new
    // export is as much a failure here as a missing one, which is the whole
    // point of freezing a surface. Types are erased at runtime and are checked
    // by the consumer compile instead.
    const expected: Readonly<Record<string, readonly string[]>> = {
      './drag.js': ['DraggableError'],
      './kernel.js': [
        'FAILURE_ACTIVATION',
        'FAILURE_ADMISSION',
        'FAILURE_INSERTION',
        'FAILURE_INVALIDATION',
        'FAILURE_LANDING_CREATE',
        'FAILURE_LANDING_INTERRUPTED',
        'FAILURE_LANDING_TARGET',
        'FAILURE_PLACEHOLDER_MOVE',
        'FAILURE_RELEASE',
        'FAILURE_RENDERER_WRITE',
        'FAILURE_REORDER_RESOLUTION',
        'FAILURE_SCHEDULED_FRAME',
        'FAILURE_TERMINAL_CALLBACK',
        'draggable',
      ],
      './sortable.js': [
        'AT_CONSUMER',
        'AT_PROPOSAL',
        'ReorderResolution',
        'sortable',
      ],
      './sortable/y.js': ['y'],
      './sortable/xy.js': ['xy'],
      './sortable/landing.js': ['landing'],
      './sortable/layout-animation.js': ['layoutAnimation'],
    };

    /**
     * **`./sortable/feature.js` is deliberately absent from this table** and
     * from the map it is compared against (D-61). The middle tier has zero
     * runtime exports, so the build emits no `.js` for it and its export entry
     * carries `types` with **no `default` condition** — there is nothing to
     * import and nothing whose names could be listed. That is the honest
     * measurement statement for the entry: unlike the three subpaths D-56
     * deleted for measuring nothing, this one is not pretending to measure
     * anything. Its declarations are covered by the packed-declaration row
     * above and by the consumer compile, which is where an erased surface can
     * be checked at all.
     */
    const runtimeSubpaths = [...packed.subpaths].filter(
      ([, value]) => value.default !== undefined,
    );

    expect(runtimeSubpaths.map(([key]) => key).toSorted(byName)).toEqual(
      Object.keys(expected).toSorted(byName),
    );
    expect([...packed.subpaths.keys()]).toContain('./sortable/feature.js');

    const actual: Record<string, readonly string[]> = {};

    await Promise.all(
      runtimeSubpaths.map(async ([key, value]) => {
        const module: object = await import(join(packed.dir, value.default!));
        const names: readonly string[] = Object.keys(module);

        actual[key] = names.toSorted(byName);
      }),
    );

    expect(actual).toEqual(expected);
  });

  it('should pack every declaration its declarations reference', async () => {
    const files = await packedFiles(packed.dir, '.d.ts');
    const sources = await Promise.all(
      files.map((file) => readFile(file, 'utf8')),
    );
    const dangling: string[] = [];

    for (const [index, source] of sources.entries()) {
      for (const match of source.matchAll(/from\s*"(\.[^"]*)"/gu)) {
        // A declaration references `./x.js`; the file that has to be packed
        // alongside it is `./x.d.ts`.
        const target = resolve(
          dirname(files[index]!),
          match[1]!.replace(/\.js$/u, '.d.ts'),
        );

        // oxlint-disable-next-line no-await-in-loop
        if (!(await exists(target))) {
          dangling.push(`${files[index]!} -> ${match[1]!}`);
        }
      }
    }

    expect(dangling).toEqual([]);
  });

  it('should pack every sourcemap its modules point at', async () => {
    // `files` ships whole directories for `kernel/` and `sortable/`, which
    // carries their maps along, but names the root entries file by file — so a
    // root map is the one artefact the allowlist can silently drop.
    const files = await packedFiles(packed.dir, '.js');
    const sources = await Promise.all(
      files.map((file) => readFile(file, 'utf8')),
    );
    const dangling: string[] = [];

    for (const [index, source] of sources.entries()) {
      const match = /\/\/# sourceMappingURL=(\S+)/u.exec(source);

      if (match === null) {
        continue;
      }

      // oxlint-disable-next-line no-await-in-loop
      if (!(await exists(resolve(dirname(files[index]!), match[1]!)))) {
        dangling.push(`${files[index]!} -> ${match[1]!}`);
      }
    }

    expect(dangling).toEqual([]);
  });

  it('should declare no subpath into the kernel directory', () => {
    // **Narrowed by D-48, not withdrawn.** `./kernel.js` is now a declared
    // entry — the kernel tier is published, because a behavior author needs
    // `draggable()` and the classification vocabulary. What stays unaddressable
    // is the `kernel/` *directory*: it is shipped, because the entrypoints
    // import it at runtime, but no export key reaches inside it, so the seam
    // modules are still not importable by path.
    expect(
      [...packed.subpaths.keys()].filter((key) => key.startsWith('./kernel/')),
    ).toEqual([]);
  });

  it(
    'should compile a consumer against the packed declarations',
    async () => {
      // The fixture carries the opacity checks as `@ts-expect-error` lines, so a
      // clean exit proves both directions at once: the public imports resolve and
      // typecheck, and neither `Behavior`'s frame part nor `BehaviorFactory` is
      // reachable through a public entry.
      await expect(
        run(
          join(REPO, 'node_modules', '.bin', 'tsc'),
          ['--noEmit', '-p', 'tsconfig.json'],
          packed.consumer,
        ),
      ).resolves.toBeDefined();
    },
    2 * MINUTE,
  );
});
