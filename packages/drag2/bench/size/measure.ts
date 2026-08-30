/**
 * The size measurement, whole: compositions, bytes, budgets, module graphs.
 *
 * This is the *specification* of what is measured as much as the tool that
 * measures it, so everything 05 §Measurements — landed 2026-08-02 calls a
 * reproducibility precondition is a value in this file rather than a flag
 * somewhere:
 *
 * - **Bundler**: Rolldown, the version in the workspace lockfile.
 * - **Target/platform**: `neutral`, ESM out, no polyfills.
 * - **Minifier**: Rolldown's built-in (`minify: true`).
 * - **Compression**: Brotli via `node:zlib` at default quality.
 * - **Aliases**: none.
 * - **Repetition**: none, and none is needed — the pipeline is deterministic,
 *   which `tests/bench/size.node.test.ts` asserts rather than assumes.
 *
 * **Why this is not `size-limit`** is written up in
 * `.agents/docs/measure/brief.md`, along with what a repository-wide
 * replacement would have to do. The short version: a composition is a set of
 * named imports *and* a set of modules that must be absent, and only the first
 * half is a byte count. Splitting the halves across two tools means declaring
 * each composition twice, in two formats, and the more interesting half is the
 * one that is not a number.
 *
 * Run: `just size` (fails on a budget breach), or `node bench/size/measure.ts`.
 *
 * ## Looking at what was measured
 *
 * `--files` writes each composition's bundled output under `.measured/`, and
 * `--unminified` writes a readable twin beside it — real identifiers, one
 * statement per line — for reading rather than for counting. Either flag turns
 * writing on; `--unminified` implies `--files`.
 *
 * ```
 * npm run size -- --files --unminified
 * npx just size --files --unminified
 * node bench/size/measure.ts --files
 * ```
 *
 * **No flag changes a reported number, and that is the point.** The figures
 * above are a specification with budgets and landed records attached to them,
 * so the measured generate is always the minified one and the unminified twin
 * is a **second, separate** generate whose bytes are never read. A flag that
 * could move a budget would make every recorded figure a question about how
 * the harness was invoked.
 */
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { brotliCompressSync } from 'node:zlib';
import { rolldown } from 'rolldown';

const ROOT = resolve(import.meta.dirname, '../..');

export type Composition = Readonly<{
  name: string;
  /**
   * The exact named imports a consumer writes, keyed by public subpath. This
   * *is* the fixture: what Rolldown pulls is what a consumer's bundler pulls,
   * and there is no wrapper module whose own body inflates the number.
   */
  imports?: Readonly<Record<string, string>>;
  /** A checked-in module instead, for what a set of imports cannot express. */
  entry?: string;
  /**
   * The composition's Brotli ceiling, in bytes: the minified bundle
   * compressed at `node:zlib`'s default quality, which is the reported figure
   * everywhere in this file.
   *
   * **Set at the landed measurement plus ~150 B**, which is about one module.
   * The margin is sized to notice *a module appearing in a graph* and is
   * deliberately too small to absorb a feature. It is not a performance
   * allowance, and it may never be spent to avoid landing a correctness fix.
   *
   * **A budget re-bases rather than a fix shrinking**, and the rule reads in
   * both directions: a change that lands above its ceiling raises it, and a
   * change that leaves a row several times its margin under lowers it,
   * because a budget that loose stops noticing the module it exists to
   * notice. What re-bases nothing is movement inside the noise band — rows no
   * edit reached have reported −1 to +3 B, and single edits have moved
   * compressed figures ±25 B in both directions at once, so a swing of that
   * size is not a signal.
   *
   * **The byte half does not carry the module claim, and cannot.** A module's
   * marginal cost is what Brotli charges for it *given everything else in the
   * graph*: the smallest module here has measured 149, 154 and 157 B to enter
   * one, across passes that changed message text and nothing else. It crossed
   * the headroom in both directions without a module moving, so no headroom
   * this instrument could carry makes the byte half a sufficient test. The
   * claim is carried by the graph declarations below — `absent`,
   * `absentPrefixes`, `present`, `only`. The budget catches growth; the graph
   * declarations catch a module.
   *
   * **Twelve of the fourteen rows declare some combination of the four, and
   * the two baselines declare no topology at all**, so on those two the byte
   * budget is the only instrument. Baseline A is where that has consequence:
   * it reaches thirty modules through relative paths into the built package,
   * so a module can enter it unobserved. It is tolerated rather than repaired
   * because it is a checked-in fixture whose whole job is to price
   * composition against `complete`, which does declare. **The repair is not a
   * wider budget** — 150 B is calibrated against the failure it catches, and
   * loosening an exact instrument to prop up a redundant one is the wrong
   * direction.
   *
   * Two rows are administered differently and say so on their own comments:
   * the vocabulary root, whose ceiling is bracketed by a reproducible
   * injection because it is the sole detector for its class, and baseline B,
   * an external control this package does not build. Every re-base is dated
   * and reasoned in
   * [`budget-rebases.md`](../../.plan/measurements/budget-rebases.md).
   */
  budget: number;
  /**
   * **The exact Brotli figure this row must reproduce**, when it is a row no
   * change to the behaviors above it may reach.
   *
   * **A ceiling cannot see a transfer, and that is what this is for.** Fourteen
   * budgets can all be green while bytes move *between* rows — a feature
   * getting cheaper for the compositions that use it and dearer for the ones
   * that do not is under budget on both sides, so nothing reports it. §18 names
   * the instrument that would: a row whose expected behaviour is declared
   * before the pass, and whose *not moving* is the result.
   *
   * So a control is exact rather than bounded. The rows that carry it are the
   * ones no sortable-side or free-drag-side edit can reach from the other side
   * — plus the two that carry no behavior at all — and a single byte of
   * movement on one is a finding rather than slack being spent. Re-basing one
   * means a change deliberately reached it, and is dated and reasoned in
   * [`budget-rebases.md`](../../.plan/measurements/budget-rebases.md) like any
   * other.
   *
   * Omitted on a row a pass is expected to move, which is every row that
   * carries the behavior under change.
   */
  control?: number;
  /**
   * Modules that must **not** appear in the bundled graph. Absence is the whole
   * tree-shaking claim (03 §Tree-shaking) and a byte count cannot express it: a
   * module can be pulled in, shaken down to almost nothing, and show up as a
   * small delta that reads like success.
   */
  absent?: readonly string[];
  /**
   * Whole **subtrees** that must not appear, by package-relative prefix.
   *
   * This is the cross-behavior claim, which `absent` cannot express: a
   * free-drag composition pulls **no** `sortable/` module and vice versa, and
   * enumerating today's module list would pass vacuously the moment either
   * behavior gains a file. A prefix keeps the claim total over a growing
   * tree.
   */
  absentPrefixes?: readonly string[];
  /** Modules that must appear — so the absence checks cannot pass vacuously. */
  present?: readonly string[];
  /**
   * The bundled graph, **exactly** — every module that may appear, and no
   * other. Passing it also satisfies the `present` half, so a composition
   * declaring `only` declares nothing else.
   *
   * For an invariant of the form _`drag.js` reaches `kernel/errors.js` and
   * nothing else_ — a claim `absent` cannot make and `absentPrefixes` cannot
   * make either, because the one module that must appear lives inside the one
   * subtree that must not. Enumerating today's absences would answer a total
   * claim with a list that grows stale the moment `kernel/` gains a file,
   * which is the same vacuity `absentPrefixes` exists to prevent.
   *
   * **Reserved for roots whose whole point is what they do not reach.** A
   * feature composition should not use it: pinning fifteen module names would
   * turn every legitimate refactor into a harness failure, and the claim there
   * is about specific machinery rather than about the size of the graph.
   */
  only?: readonly string[];
}>;

/**
 * The sortable's optional features: a composition that does not install one
 * must not pull it.
 *
 * **Two, and the placeholder, handle and callback slots are not among them.**
 * Those are config the consumer writes directly, so there is no module for a
 * composition to pull or shake and nothing for a row to measure.
 */
const OPTIONAL = [
  'sortable/landing.js',
  'sortable/layout-animation.js',
] as const;

/**
 * Free drag's optional features, and the same rule: a composition that does not
 * install one must not pull it.
 *
 * `free-drag/landing.js` shares `shared/landing-runner.js` with the
 * sortable's, which is the one non-kernel module both behaviors reach — and
 * therefore the most interesting single entry in the union identity
 * {@link unionViolations} asserts, since a shared module outside `kernel/` is
 * exactly where a second resolution would be least expected.
 */
const FREE_DRAG_OPTIONAL = [
  'free-drag/bounds.js',
  'free-drag/landing.js',
] as const;

const withoutFreeDrag = (...kept: readonly string[]): readonly string[] =>
  FREE_DRAG_OPTIONAL.filter((module) => !kept.includes(module));

/** The names the union identity is asserted over — see {@link unionViolations}. */
export const COMBINED = 'both behaviors';
export const SORTABLE_PART = 'complete';
export const FREE_DRAG_PART = 'free drag complete';

/**
 * The **unselected axis**, which is not optional in the same sense: exactly one
 * axis feature is installed, so the other is always absent. It is listed
 * separately because "the composition did not reach the sibling rule" is the
 * claim the two-feature shape rests on: a single parameterized feature would
 * make every list consumer carry the grid metric.
 */
const withoutAxis = (kept: 'sortable/y.js' | 'sortable/xy.js'): string =>
  kept === 'sortable/y.js' ? 'sortable/xy.js' : 'sortable/y.js';

/**
 * **The linear shift rule, and it is `y()`'s alone.** It is `y()`-only *by
 * contract* — `xy()` wraps, so the displacement is neither scalar nor uniform
 * and that axis measures instead — so an `xy()` composition reaching this
 * module would be carrying a rule it can never execute.
 *
 * A peer of {@link withoutAxis} rather than folded into it, because it is a
 * different claim: the unselected axis is absent because exactly one installs,
 * and this is absent because a feature's private rule may not travel in the
 * shared cache the two axes are deliberately built to share. Folding it into
 * that cache costs a minimal `xy()` composition 288 B.
 */
const P06 = 'sortable/linear-shift.js';

const without = (...kept: readonly string[]): readonly string[] =>
  OPTIONAL.filter((module) => !kept.includes(module));

export const COMPOSITIONS: readonly Composition[] = [
  {
    name: 'minimal',
    imports: {
      'sortable.js': '{ sortable }',
      'sortable/y.js': '{ y }',
    },
    budget: 9994,
    absent: [...without(), withoutAxis('sortable/y.js')],
    absentPrefixes: ['free-drag/'],
    present: [P06],
  },
  {
    // The same composition on the other axis. It reopens what "minimal"
    // means, which 05 §Measurements — landed 2026-08-02 names as a trigger to
    // re-measure, so it is measured as a peer rather than assumed to equal the
    // y one.
    name: 'minimal (xy)',
    imports: {
      'sortable.js': '{ sortable }',
      'sortable/xy.js': '{ xy }',
    },
    budget: 9854,
    absent: [...without(), withoutAxis('sortable/xy.js'), P06],
    absentPrefixes: ['free-drag/'],
    // **Both halves of the sharing rule in one row.** The dimension-neutral
    // cache is
    // reached — that is the shared-by-design part, and it is why `xy()` is
    // measured as a peer rather than assumed to equal the `y()` one — and the
    // `y()`-only optimization on top of it is not.
    present: ['sortable/rect-index.js'],
  },
  {
    name: 'minimal + layoutAnimation',
    imports: {
      'sortable.js': '{ sortable }',
      'sortable/y.js': '{ y }',
      'sortable/layout-animation.js': '{ layoutAnimation }',
    },
    budget: 10_346,
    absent: [
      ...without('sortable/layout-animation.js'),
      withoutAxis('sortable/y.js'),
    ],
    absentPrefixes: ['free-drag/'],
    present: ['sortable/layout-animation.js', P06],
  },
  {
    name: 'minimal + landing',
    imports: {
      'sortable.js': '{ sortable }',
      'sortable/y.js': '{ y }',
      'sortable/landing.js': '{ landing }',
    },
    budget: 10_256,
    absent: [...without('sortable/landing.js'), withoutAxis('sortable/y.js')],
    absentPrefixes: ['free-drag/'],
    present: ['sortable/landing.js', P06],
  },
  {
    name: SORTABLE_PART,
    imports: {
      'sortable.js': '{ sortable }',
      'sortable/y.js': '{ y }',
      'sortable/landing.js': '{ landing }',
      'sortable/layout-animation.js': '{ layoutAnimation }',
    },
    budget: 10_589,
    absent: [withoutAxis('sortable/y.js')],
    absentPrefixes: ['free-drag/'],
    present: [...OPTIONAL, P06],
  },
  {
    // **The free-drag half of the surface.** Declared as peers of the
    // sortable rows rather than as a variant of them: the two behaviors share
    // the kernel and nothing else, which is a claim about both graphs.
    name: 'free drag minimal',
    imports: {
      'free-drag.js': '{ freeDrag }',
    },
    budget: 8253,
    control: 7750,
    absent: [...withoutFreeDrag()],
    absentPrefixes: ['sortable/'],
    present: ['free-drag.js', 'kernel/kernel.js'],
  },
  {
    name: 'free drag + bounds',
    imports: {
      'free-drag.js': '{ freeDrag }',
      'free-drag/bounds.js': '{ bounds }',
    },
    budget: 8409,
    control: 7897,
    absent: [...withoutFreeDrag('free-drag/bounds.js')],
    absentPrefixes: ['sortable/'],
    present: ['free-drag/bounds.js'],
  },
  {
    name: 'free drag + landing',
    imports: {
      'free-drag.js': '{ freeDrag }',
      'free-drag/landing.js': '{ landing }',
    },
    budget: 8519,
    control: 8017,
    absent: [...withoutFreeDrag('free-drag/landing.js')],
    absentPrefixes: ['sortable/'],
    present: ['free-drag/landing.js', 'shared/landing-runner.js'],
  },
  {
    name: FREE_DRAG_PART,
    imports: {
      'free-drag.js': '{ freeDrag }',
      'free-drag/bounds.js': '{ bounds }',
      'free-drag/landing.js': '{ landing }',
    },
    budget: 8674,
    control: 8151,
    absentPrefixes: ['sortable/'],
    present: FREE_DRAG_OPTIONAL,
  },
  {
    // **The largest surface there is.** One page, both behaviors, every optional
    // feature — the largest surface a consumer can compose, and the only
    // configuration in which the kernel is reached by two behaviors at once.
    //
    // The two `landing` exports are aliased because their names collide, which
    // is what a consumer importing both writes too. Aliasing costs a few bytes
    // in the re-export and changes no module in the graph, which is the half
    // this row is measured for.
    name: COMBINED,
    imports: {
      'sortable.js': '{ sortable }',
      'sortable/y.js': '{ y }',
      'sortable/landing.js': '{ landing as sortableLanding }',
      'sortable/layout-animation.js': '{ layoutAnimation }',
      'free-drag.js': '{ freeDrag }',
      'free-drag/bounds.js': '{ bounds }',
      'free-drag/landing.js': '{ landing as freeDragLanding }',
    },
    budget: 11_962,
    absent: [withoutAxis('sortable/y.js')],
    present: [
      ...OPTIONAL,
      ...FREE_DRAG_OPTIONAL,
      'shared/landing-runner.js',
      P06,
    ],
  },
  {
    /**
     * **A consumer who wants `err instanceof DraggableError` and nothing else
     * pays one module**, and it takes both halves of this row to say so. 03
     * §The export topology asks for the export claim to be checked against
     * something other than the table it was derived from; this is that check.
     *
     * | Half | Claim | Blind to |
     * | --- | --- | --- |
     * | `only` | the root bundles to one module | anything arriving *inside* that module |
     * | `budget` | that one module stays the size of two classes | nothing — it is the residual detector |
     *
     * **The budget is the sole detector for its class.** The packed
     * `kernel/errors.js` carries a **bare** `import "./failures.js"`, because
     * `tsdown` inlines the `FAILURE_*` constants as literals — so machinery
     * arriving from `failures.ts` lands *inside* this module and moves no
     * module count at all. `only` cannot see it by construction, and
     * `tests/packaging.node.test.ts` cannot either: it walks the unshaken
     * *source* graph, deliberately independent of any bundler's heuristics,
     * and on that graph `drag.js` **does** reach `kernel/failures.js`. Only a
     * bundled-graph instrument holds this figure.
     *
     * **The regression class is anything that makes `drag.js`'s
     * `kernel/failures.js` re-export unshakeable, or gives `errors.ts` a
     * runtime need for a stage value.** The second shape is the calibrating
     * injection — import the twelve constants as values, then reference them
     * from the constructor:
     *
     * ```ts
     * // src/kernel/errors.ts
     * const KNOWN_STAGES: readonly FailureStage[] = [FAILURE_ADMISSION, …];
     * this.stage = stage !== null && KNOWN_STAGES.includes(stage) ? stage : null;
     * ```
     *
     * | | brotli | minified | shipped modules |
     * | --- | --- | --- | --- |
     * | landed | **159** | 344 | 1 |
     * | injected | **220** | 410 | **1 — unchanged** |
     * | reworded, same length | 181 | 342 | 1 |
     * | rewritten, +48 chars | 190 | 402 | 1 |
     *
     * **The graph half does not move, which is the whole finding.** A
     * plausible stage validation adds **+61 B** and zero modules, so only a
     * ceiling this row can breach observes it. 190 must pass and 220 must
     * fail, so the admissible window is 191–219 and **205** is its midpoint:
     * 46 B of headroom, breaching the injection by 15 B and clearing the most
     * generous rewrite by 15 B.
     *
     * **30-to-50 B of headroom, not the standing ~150 B.** That convention is
     * sized to roughly one module against 8–13 kB compositions; on a 159 B
     * root, one module's worth of slack is larger than the artifact and the
     * row would report success while the thing it exists to prevent happened.
     *
     * **The wording band is wider than it looks, and Brotli is why.** A
     * *same-length* rewording costs **+22 B compressed while saving 2 B
     * minified**: `destroyed` and `failure` are in Brotli's static dictionary
     * and `torn down` and `fault` are not, so on a 344 B input the
     * substitution is a compression loss with no source cost. The band is
     * measured rather than read off source length, which would put the
     * ceiling at 190 and fail on a rewording.
     *
     * A legitimate change to the two classes re-bases this number visibly,
     * under the same rule every other row is administered by.
     */
    name: 'vocabulary root - drag.js',
    // **Both classes.** Naming one would let the other shake out and quietly
    // stop measuring half the entry — the row would keep reporting the size of
    // one class for a vocabulary root that had grown.
    //
    // **Deliberately *not* the twelve stage constants.** Importing
    // them would fold their cost into this figure and destroy the row's one
    // claim: that a consumer who wants `err instanceof DraggableError` and
    // nothing else reaches one module. Their cost is a separate question, and
    // the answer — 0 B, 0 modules, because the re-export shakes — is only
    // observable while this row declines to import them.
    imports: { 'drag.js': '{ DraggableError, DraggableWarning }' },
    budget: 205,
    control: 142,
    only: ['kernel/errors.js'],
  },
  {
    /**
     * The kernel tier's own root, and the other half of the export claim.
     *
     * **It is what makes the row above a measurement rather than a
     * tautology.** A one-module vocabulary root is only evidence for the tier
     * split if the tier it declines to import is substantial, and this weighs
     * that tier at thirteen non-entry modules against the vocabulary root's
     * one.
     *
     * **The containment runs one way, which is the direction the split
     * claims.** This graph contains `kernel/errors.js`, because the kernel
     * constructs every public error and names both classes to do it, so the
     * vocabulary root's single module is a strict subset of this row's. The
     * property being measured is the direction that is not subsumption: an
     * ordinary consumer who wants `err instanceof DraggableError` reaches one
     * module and never this tier. A future edit that removed the class from
     * the kernel's graph would widen the gap and falsify nothing here; an edit
     * that put a behavior in it is what `absentPrefixes` catches.
     *
     * Declared with `present`/`absentPrefixes` rather than `only`: the claim
     * here is that the kernel floor reaches no behavior, not that its own
     * module list is frozen.
     */
    name: 'kernel root - kernel.js',
    imports: { 'kernel.js': '{ draggable }' },
    budget: 6309,
    control: 6063,
    present: ['kernel.js', 'kernel/kernel.js'],
    absentPrefixes: ['sortable/', 'free-drag/'],
  },
  {
    // Answers *what does composition cost*, and nothing else.
    name: 'baseline A - feature-matched, non-composed',
    entry: 'bench/size/noncomposed.js',
    budget: 10_405,
  },
  {
    // Answers *what does migrating cost*, and nothing else. Never substituted
    // for baseline A: it is not feature-equivalent to anything here.
    name: 'baseline B - shipped @ydinjs/drag sortable.js',
    entry: 'bench/size/shipped.js',
    budget: 7040,
    control: 6889,
  },
];

export type Measurement = Readonly<{
  composition: Composition;
  /** Minified bytes. */
  minified: number;
  /** Minified then Brotli-compressed bytes — the reported figure. */
  brotli: number;
  /** Every module id in the bundled graph, package-relative. */
  modules: readonly string[];
  /**
   * The synthetic entry an `imports` composition bundles, or `null` for an
   * `entry` one. It is a temp path that differs on every run, so the graph
   * identities below exclude it — it is the harness's own module and never a
   * consumer's.
   */
  entryId: string | null;
  /**
   * Module ids emitted into **more than one** chunk. Empty is the expected
   * state; a non-empty list is duplication in the literal sense, which is what
   * {@link unionViolations} is watching for from the other side.
   */
  duplicated: readonly string[];
}>;

/**
 * The virtual entry an import-map composition bundles. A re-export rather than
 * an import plus a use: it retains every named export for the graph without
 * adding a statement of its own to the measured bytes.
 */
function importEntry(imports: Readonly<Record<string, string>>): string {
  return Object.entries(imports)
    .map(
      ([path, names]) =>
        `export ${names} from ${JSON.stringify(join(ROOT, path))};`,
    )
    .join('\n');
}

/**
 * Where a run writes what it measured, and whether it also writes a readable
 * twin. Absent for an ordinary run, which writes nothing.
 */
export type Dump = Readonly<{
  /** The directory each composition gets a sub-directory of. */
  directory: string;
  /** Also emit an unminified generate, for reading rather than counting. */
  unminified: boolean;
}>;

/** A composition name as a directory name. */
const slug = (name: string): string =>
  name
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, '-')
    .replace(/^-|-$/gu, '');

/**
 * Writes one generate's chunks under `<composition>/<kind>/`.
 *
 * Per chunk rather than concatenated, because the chunks are what the bundler
 * produced; the measured figure is their concatenation, which matters only
 * where a composition emits more than one, and none currently does.
 */
async function writeChunks(
  target: string,
  kind: string,
  chunks: ReadonlyArray<Readonly<{ fileName: string; code: string }>>,
): Promise<void> {
  const directory = join(target, kind);

  await mkdir(directory, { recursive: true });
  await Promise.all(
    chunks.map((chunk) =>
      writeFile(join(directory, chunk.fileName), chunk.code, 'utf8'),
    ),
  );
}

export async function measure(
  composition: Composition,
  dump?: Dump,
): Promise<Measurement> {
  const directory = await mkdtemp(join(tmpdir(), 'drag2-m3-'));

  try {
    let input: string;

    if (composition.imports) {
      input = join(directory, 'entry.js');
      await writeFile(input, importEntry(composition.imports), 'utf8');
    } else {
      input = join(ROOT, composition.entry!);
    }

    const bundle = await rolldown({ input: [input], platform: 'neutral' });

    try {
      // **The measured generate, and the only one whose bytes are read.**
      const { output } = await bundle.generate({ format: 'es', minify: true });
      const chunks = output.filter((chunk) => chunk.type === 'chunk');
      const code = chunks.map((chunk) => chunk.code).join('');
      const counts = new Map<string, number>();

      for (const chunk of chunks) {
        for (const id of Object.keys(chunk.modules) as readonly string[]) {
          const relative = id.startsWith(ROOT) ? id.slice(ROOT.length + 1) : id;

          counts.set(relative, (counts.get(relative) ?? 0) + 1);
        }
      }

      const bytes = new TextEncoder().encode(code);

      if (dump !== undefined) {
        const target = join(dump.directory, slug(composition.name));

        // The synthetic entry is written too: it is the fixture the figure is
        // a measurement *of*, and it exists nowhere else once the run ends.
        if (composition.imports) {
          await mkdir(target, { recursive: true });
          await writeFile(
            join(target, 'entry.js'),
            importEntry(composition.imports),
            'utf8',
          );
        }

        await writeChunks(target, 'measured', chunks);

        if (dump.unminified) {
          const plain = await bundle.generate({ format: 'es', minify: false });

          await writeChunks(
            target,
            'unminified',
            plain.output.filter((chunk) => chunk.type === 'chunk'),
          );
        }
      }

      return {
        composition,
        minified: bytes.byteLength,
        brotli: brotliCompressSync(bytes).byteLength,
        modules: [...counts.keys()].sort(),
        entryId: composition.imports ? input : null,
        duplicated: [...counts]
          .filter(([, count]) => count > 1)
          .map(([id]) => id)
          .sort(),
      };
    } finally {
      await bundle.close();
    }
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
}

export async function measureAll(dump?: Dump): Promise<Measurement[]> {
  const measured: Measurement[] = [];

  // Sequential rather than `Promise.all`: the numbers are deterministic either
  // way, but a serial run keeps peak memory flat and the log readable.
  for (const composition of COMPOSITIONS) {
    // oxlint-disable-next-line no-await-in-loop
    measured.push(await measure(composition, dump));
  }

  return measured;
}

/**
 * The **byte** half of what a composition declares.
 *
 * Separate from {@link graphViolations} because the two halves have different
 * lifetimes. A budget is a moving number while the runtime is still being
 * written — every correctness fix moves it, and the standing rule is that a
 * budget re-bases rather than a fix shrinking (see `budget` above) — so an
 * enforced budget mid-revision reports the same thing every time and stops
 * being read. The graph half is an **invariant**: `landing` is either absent
 * from a composition that does not install it or the tree-shaking claim is
 * false, and that is as true at revision 2 as at 1.0.
 *
 * Fusing them meant muting one muted the other, which is the only reason this
 * is two functions.
 */
export function budgetViolations(measurement: Measurement): readonly string[] {
  const { composition, brotli } = measurement;

  return brotli > composition.budget
    ? [
        `over budget by ${brotli - composition.budget} B ` +
          `(${brotli} > ${composition.budget})`,
      ]
    : [];
}

/**
 * The **control** half: a row that should not have moved, and did not.
 *
 * Reported in both directions. A control getting *cheaper* is as much a finding
 * as one getting dearer — it means a change reached a graph it was declared
 * unable to reach, and the instrument's whole value is that it says so before
 * the number is read as a win.
 */
export function controlViolations(measurement: Measurement): readonly string[] {
  const { composition, brotli } = measurement;

  return composition.control !== undefined && brotli !== composition.control
    ? [
        `control moved by ${brotli - composition.control} B ` +
          `(${brotli}, declared ${composition.control})`,
      ]
    : [];
}

/**
 * A measurement's graph **as a consumer sees it**: the synthetic entry the
 * harness writes for an `imports` composition is dropped, because its id is a
 * temp path that differs on every run and it is not a module anyone ships.
 */
export function packageModules(measurement: Measurement): readonly string[] {
  return measurement.modules.filter((id) => id !== measurement.entryId);
}

/**
 * The **module graph** half: what a composition must and must not pull.
 *
 * This is the half a byte count cannot express (03 §Tree-shaking) and the half
 * that stays enforced while budgets are muted.
 */
export function graphViolations(measurement: Measurement): readonly string[] {
  const { composition, modules } = measurement;
  const found: string[] = [];

  for (const module of composition.absent ?? []) {
    if (modules.includes(module)) {
      found.push(`pulls ${module}, which it does not install`);
    }
  }

  for (const prefix of composition.absentPrefixes ?? []) {
    for (const module of modules) {
      if (module.startsWith(prefix)) {
        found.push(`pulls ${module}, from a subtree it must not reach`);
      }
    }
  }

  for (const module of composition.present ?? []) {
    if (!modules.includes(module)) {
      found.push(`does not pull ${module}, which it installs`);
    }
  }

  if (composition.only) {
    // Against the consumer-visible graph: the synthetic entry an `imports`
    // composition bundles is the harness's own module and is never shipped.
    const shipped = packageModules(measurement);

    for (const module of shipped) {
      if (!composition.only.includes(module)) {
        found.push(`pulls ${module}, and its graph is declared exactly`);
      }
    }

    for (const module of composition.only) {
      if (!shipped.includes(module)) {
        found.push(`does not pull ${module}, which its graph declares`);
      }
    }
  }

  for (const module of measurement.duplicated) {
    found.push(`emits ${module} into more than one chunk`);
  }

  return found;
}

/**
 * **The topology test, and it is an identity rather than a threshold.**
 *
 * The question is whether the `kernel.js` tier split still holds when one page
 * runs both behaviors. _Near the sum_ and _near the difference_ are not
 * conditions a byte count can be scored against, and a tolerance invented
 * after the run is a post-hoc rule. The observable is the
 * graph: **the combined composition must pull the union of the two
 * single-behavior graphs and nothing else**, so every module both behaviors
 * need resolves once.
 *
 * A module in the combined graph and in neither single graph is a module the
 * pairing introduced; a module in a single graph and missing from the combined
 * one means one behavior stopped reaching it. Both are topology changes, and
 * either reopens the export topology under 05 §Measurements. The byte
 * delta against the sum is then the **size** of a duplication rather than the
 * evidence for one, which is why it is telemetry.
 */
export function unionViolations(
  combined: Measurement,
  parts: readonly Measurement[],
): readonly string[] {
  const union = new Set(parts.flatMap((part) => packageModules(part)));
  const found: string[] = [];

  for (const module of packageModules(combined)) {
    if (!union.has(module)) {
      found.push(`pulls ${module}, which neither behavior pulls alone`);
    }
  }

  for (const module of union) {
    if (!packageModules(combined).includes(module)) {
      found.push(`does not pull ${module}, which a behavior pulls alone`);
    }
  }

  return found;
}

export type DeclarationWeight = Readonly<{
  files: number;
  bytes: number;
  comment: number;
}>;

/**
 * The published type surface, weighed the way a tarball carries it.
 *
 * Every other figure here is a *runtime* bundle, and a comment does not survive
 * minification — so the largest single class of published bytes this package
 * has is invisible to all of them. `prune-declarations.ts` cannot see it
 * either: it removes declaration files no entry can reach and never looks
 * inside the ones it keeps.
 *
 * **Reported and not budgeted.** A ceiling whose calibrating injection cannot
 * be re-run is not calibrated, and this figure has no measured
 * regression behind it. It is the number a later pass would need before it
 * could set one.
 */
export async function declarationWeight(): Promise<DeclarationWeight> {
  const SKIP = new Set(['node_modules', 'src', 'tests', 'bench']);
  const walk = async (directory: string): Promise<readonly string[]> => {
    const entries = await readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(
      entries.map(async (entry) => {
        const path = join(directory, entry.name);

        if (entry.isDirectory()) {
          return SKIP.has(entry.name) || entry.name.startsWith('.')
            ? []
            : await walk(path);
        }

        return entry.name.endsWith('.d.ts') ? [path] : [];
      }),
    );

    return nested.flat();
  };

  const files = await walk(ROOT);
  const sources = await Promise.all(
    files.map((file) => readFile(file, 'utf8')),
  );
  let bytes = 0;
  let comment = 0;

  for (const source of sources) {
    bytes += source.length;

    // Declarations are emitted, so the two comment forms are the only ones
    // present and neither can appear inside a string literal.
    for (const match of source.matchAll(/\/\*[\s\S]*?\*\//gu)) {
      comment += match[0].length;
    }

    for (const match of source.matchAll(/^[^\S\n]*\/\/[^\n]*$/gmu)) {
      comment += match[0].length;
    }
  }

  return { files: files.length, bytes, comment };
}

/**
 * Both halves, for the CLI. `just size` reports and enforces everything — it is
 * run deliberately, by someone who wants the numbers — which is where the
 * budgets keep living while the suite has them muted.
 */
export function violations(measurement: Measurement): readonly string[] {
  return [
    ...budgetViolations(measurement),
    ...controlViolations(measurement),
    ...graphViolations(measurement),
  ];
}

if (import.meta.main) {
  const kb = (bytes: number): string => `${(bytes / 1000).toFixed(2)} kB`;
  // Strict, so a misspelt flag stops the run rather than silently measuring
  // with the flag off — the two flags decide only what is *written*, but a run
  // that quietly wrote nothing is indistinguishable from one that had nothing
  // to write.
  const { values } = parseArgs({
    options: {
      files: { type: 'boolean', default: false },
      unminified: { type: 'boolean', default: false },
    },
  });
  const { unminified } = values;
  // `--unminified` is about *what is written*, so it implies writing.
  const writing = unminified || values.files;
  const OUT = join(ROOT, '.measured');

  if (writing) {
    // Cleared first: a stale composition directory from an earlier tree reads
    // as this run's output and there is nothing in the file to say otherwise.
    await rm(OUT, { force: true, recursive: true });
  }

  let failed = false;
  const all = await measureAll(
    writing ? { directory: OUT, unminified } : undefined,
  );
  const byName = new Map(all.map((one) => [one.composition.name, one]));

  for (const measurement of all) {
    const { composition, brotli, modules } = measurement;
    const found = violations(measurement);
    const slack = composition.budget - brotli;

    // oxlint-disable-next-line no-console
    console.log(
      `${composition.name.padEnd(44)} ${kb(brotli).padStart(9)} brotli` +
        `  (${String(modules.length).padStart(2)} modules,` +
        ` ${kb(slack)} under budget)`,
    );

    for (const violation of found) {
      failed = true;
      // oxlint-disable-next-line no-console
      console.error(`  ✗ ${composition.name} ${violation}`);
    }
  }

  const combined = byName.get(COMBINED);
  const parts = [byName.get(SORTABLE_PART), byName.get(FREE_DRAG_PART)];

  if (combined && parts.every((part) => part !== undefined)) {
    const found = unionViolations(combined, parts);
    const sum = parts.reduce((total, part) => total + part.brotli, 0);

    // oxlint-disable-next-line no-console
    console.log(
      `\n${COMBINED} graph: ${packageModules(combined).length} modules` +
        ` against a ${SORTABLE_PART} + ${FREE_DRAG_PART} union of` +
        ` ${new Set(parts.flatMap(packageModules)).size}` +
        `  (telemetry: ${kb(combined.brotli)} against a ${kb(sum)} sum)`,
    );

    for (const violation of found) {
      failed = true;
      // oxlint-disable-next-line no-console
      console.error(`  ✗ ${COMBINED} ${violation}`);
    }
  }

  const declarations = await declarationWeight();

  // oxlint-disable-next-line no-console
  console.log(
    `\npublished declarations: ${declarations.files} files,` +
      ` ${kb(declarations.bytes)}, of which ${kb(declarations.comment)} is` +
      ` comment (${Math.round(
        (declarations.comment / declarations.bytes) * 100,
      )} %)  (telemetry: not budgeted)`,
  );

  if (writing) {
    // oxlint-disable-next-line no-console
    console.log(
      `\nwrote ${all.length} compositions to ${relative(process.cwd(), OUT)}/` +
        `  (\`measured/\` is the bytes above` +
        `${unminified ? ', `unminified/` is the same bundle for reading' : ''})`,
    );
  }

  if (failed) {
    process.exitCode = 1;
  }
}
