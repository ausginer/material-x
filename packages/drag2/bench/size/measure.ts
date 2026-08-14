/**
 * The M-3 measurement, whole: compositions, bytes, budgets, module graphs.
 *
 * This is the *specification* of what is measured as much as the tool that
 * measures it, so everything 05 §Measurements owed calls a reproducibility
 * precondition is a value in this file rather than a flag somewhere:
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
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
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
   * Brotli-compressed bytes. Set from the first measurement (2026-08-02) with
   * ~0.3 kB of headroom — deliberately tight, because the point of a budget
   * here is to notice a module appearing in a graph, and 0.3 kB is roughly one
   * such module.
   *
   * **Re-based 2026-08-07, Phase 16.** D-33 cost 70 B and D-32 cost ~300 B
   * across *every* composition, including minimal: keyboard sorting is a
   * `BehaviorSpec` member, not an optional feature, so a consumer cannot
   * tree-shake away the second input mode. That is a deliberate accessibility
   * position rather than an oversight — see `.plan/plan.md` Phase 16 — and the
   * budgets say so by moving together.
   *
   * **Re-based again 2026-08-07, Phase 17.** Extracting the packed rect index
   * into a module both axis features share costs the list composition **60 B**
   * — a module boundary under `unbundle`, and one record read where a closure
   * variable used to be. It is recorded rather than absorbed: the alternative
   * was two copies of a geometry cache that must stay in step, where a
   * divergence is a silent correctness bug and not a style one. The 2-D *rule*
   * itself costs the list consumer nothing, which is the constraint the shape
   * decision was made under.
   *
   * **Re-based again 2026-08-08, Checkpoint D review 5 (Phase 21, pulled
   * forward).** The rule this re-base establishes is in `.plan/plan.md` §Phase
   * 21: *a size budget is never a reason to defer a fix for a floor breach; if
   * the fix does not fit, the budget re-bases and the fix lands. What a budget
   * may defer is defence in depth.* The C5 closure pass landed **nine** I-36
   * floor fixes — C5-01's animation-subscription barrier, C5-02's placeholder
   * mechanics, and seven more the stretch sweep found in `placeholder.ts` and
   * `spec.ts`. Mid-pass they took `complete` **1 B over** its 11,040 budget,
   * and the budget re-based rather than the fix shrinking; brotli then gave
   * some of it back as the repeated `rt.closed` guards started sharing a
   * dictionary, so the landed cost is **+91 B** on `complete` against 106 B of
   * headroom. The re-base stays: 15 B is not a margin the next correctness fix
   * should be planning against, and taking the byte count out of the terminal
   * safety argument is the point of pulling it forward. Landed per-composition
   * cost: minimal **+83 B**, minimal (xy) **+77 B**, + layoutAnimation
   * **+90 B**, + landing **+82 B**, complete **+91 B**, baseline A **+97 B**;
   * baseline B is the shipped package and did not move. Every budget is now
   * its measurement plus ~150 B, the headroom the Phase 17 re-base left, and
   * still under one module's worth.
   */
  budget: number;
  /**
   * Modules that must **not** appear in the bundled graph. Absence is the whole
   * tree-shaking claim (03 §Tree-shaking) and a byte count cannot express it: a
   * module can be pulled in, shaken down to almost nothing, and show up as a
   * small delta that reads like success.
   */
  absent?: readonly string[];
  /** Modules that must appear — so the absence checks cannot pass vacuously. */
  present?: readonly string[];
}>;

/**
 * **Two, not four** (D-56). `sortable/placeholder.js` and `sortable/handle.js`
 * are gone, along with `sortable/callbacks.js`, because a fragment factory that
 * installs nothing measures nothing: under D-45 all three had become identity
 * wrappers around a config slot the consumer can write directly.
 *
 * That is the falsifiable half of D-56 — the deletions should move **zero
 * bytes**, since the modules never carried runtime machinery to begin with —
 * and the budgets below are what would catch it if they did.
 */
const OPTIONAL = [
  'sortable/landing.js',
  'sortable/layout-animation.js',
] as const;

/**
 * The **unselected axis**, which is not optional in the same sense: exactly one
 * axis feature is installed, so the other is always absent. It is listed
 * separately because "the composition did not reach the sibling rule" is the
 * claim that decided the 2-D shape (Phase 17) — a parameterized single feature
 * would have made every list consumer carry the grid metric.
 */
const withoutAxis = (kept: 'sortable/y.js' | 'sortable/xy.js'): string =>
  kept === 'sortable/y.js' ? 'sortable/xy.js' : 'sortable/y.js';

const without = (...kept: readonly string[]): readonly string[] =>
  OPTIONAL.filter((module) => !kept.includes(module));

export const COMPOSITIONS: readonly Composition[] = [
  {
    name: 'minimal',
    imports: {
      'sortable.js': '{ sortable }',
      'sortable/y.js': '{ y }',
    },
    budget: 10_340,
    absent: [...without(), withoutAxis('sortable/y.js')],
  },
  {
    // The same composition on the other axis. It reopens what "minimal" means,
    // which 05 §What would reopen this names as an M-3 trigger, so it is
    // measured as a peer rather than assumed to equal the y one.
    name: 'minimal (xy)',
    imports: {
      'sortable.js': '{ sortable }',
      'sortable/xy.js': '{ xy }',
    },
    budget: 10_380,
    absent: [...without(), withoutAxis('sortable/xy.js')],
    present: ['sortable/rect-index.js'],
  },
  {
    name: 'minimal + layoutAnimation',
    imports: {
      'sortable.js': '{ sortable }',
      'sortable/y.js': '{ y }',
      'sortable/layout-animation.js': '{ layoutAnimation }',
    },
    budget: 10_790,
    absent: [
      ...without('sortable/layout-animation.js'),
      withoutAxis('sortable/y.js'),
    ],
    present: ['sortable/layout-animation.js'],
  },
  {
    name: 'minimal + landing',
    imports: {
      'sortable.js': '{ sortable }',
      'sortable/y.js': '{ y }',
      'sortable/landing.js': '{ landing }',
    },
    budget: 10_620,
    absent: [...without('sortable/landing.js'), withoutAxis('sortable/y.js')],
    present: ['sortable/landing.js'],
  },
  {
    name: 'complete',
    imports: {
      'sortable.js': '{ sortable }',
      'sortable/y.js': '{ y }',
      'sortable/landing.js': '{ landing }',
      'sortable/layout-animation.js': '{ layoutAnimation }',
    },
    budget: 11_200,
    absent: [withoutAxis('sortable/y.js')],
    present: OPTIONAL,
  },
  {
    // Answers *what does composition cost*, and nothing else.
    name: 'baseline A - feature-matched, non-composed',
    entry: 'bench/size/noncomposed.js',
    budget: 10_900,
  },
  {
    // Answers *what does migrating cost*, and nothing else. Never substituted
    // for baseline A: it is not feature-equivalent to anything here.
    name: 'baseline B - shipped @ydinjs/drag sortable.js',
    entry: 'bench/size/shipped.js',
    budget: 7100,
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

export async function measure(composition: Composition): Promise<Measurement> {
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
      const { output } = await bundle.generate({ format: 'es', minify: true });
      const chunks = output.filter((chunk) => chunk.type === 'chunk');
      const code = chunks.map((chunk) => chunk.code).join('');
      const modules = new Set<string>();

      for (const chunk of chunks) {
        for (const id of Object.keys(chunk.modules) as readonly string[]) {
          modules.add(id.startsWith(ROOT) ? id.slice(ROOT.length + 1) : id);
        }
      }

      const bytes = new TextEncoder().encode(code);

      return {
        composition,
        minified: bytes.byteLength,
        brotli: brotliCompressSync(bytes).byteLength,
        modules: [...modules].sort(),
      };
    } finally {
      await bundle.close();
    }
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
}

export async function measureAll(): Promise<Measurement[]> {
  const measured: Measurement[] = [];

  // Sequential rather than `Promise.all`: the numbers are deterministic either
  // way, but a serial run keeps peak memory flat and the log readable.
  for (const composition of COMPOSITIONS) {
    // oxlint-disable-next-line no-await-in-loop
    measured.push(await measure(composition));
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

  for (const module of composition.present ?? []) {
    if (!modules.includes(module)) {
      found.push(`does not pull ${module}, which it installs`);
    }
  }

  return found;
}

/**
 * Both halves, for the CLI. `just size` reports and enforces everything — it is
 * run deliberately, by someone who wants the numbers — which is where the
 * budgets keep living while the suite has them muted.
 */
export function violations(measurement: Measurement): readonly string[] {
  return [...budgetViolations(measurement), ...graphViolations(measurement)];
}

if (import.meta.main) {
  const kb = (bytes: number): string => `${(bytes / 1000).toFixed(2)} kB`;

  let failed = false;

  for (const measurement of await measureAll()) {
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

  if (failed) {
    process.exitCode = 1;
  }
}
