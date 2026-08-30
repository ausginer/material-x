/* eslint-disable import-x/no-relative-packages -- the clean pathspecs are a repo script's, and the guard below is only honest against the real one. */
/**
 * M-3's assertions. `bench/size/measure.ts` declares each composition — its
 * imports, its budget, and the modules its graph must and must not contain —
 * and this runs the declaration in CI.
 *
 * Four properties, and the first two are **separate on purpose**:
 *
 * 1. **The module graph each composition declared.** Absent modules and present
 *    ones. This is the tree-shaking claim and the half a byte count cannot
 *    express: a module can be pulled in, shaken down to almost nothing, and
 *    show up as a small delta that reads like success (03 §Tree-shaking). It is
 *    an invariant, so it is enforced continuously.
 * 2. **The budget each composition declared.** A number that moves with every
 *    correctness fix while the runtime is unfinished — muted here, enforced by
 *    `just size`. See the block above the describe for why muting is the right
 *    treatment and loosening is not.
 * 3. **Determinism.** The pipeline produces byte-identical output for identical
 *    input, which is what lets M-3 report single numbers with no repetition or
 *    statistical policy. Asserted rather than assumed.
 * 4. **Baseline fidelity.** The non-composed baseline is only a baseline while
 *    it builds the same slot record `assemble()` does. It is hand-written, so
 *    it drifts unless something checks.
 */
import { spawn } from 'node:child_process';
import { readdir, stat } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  packageFilesToCleanPathspecs,
  readPackageFiles,
} from '../../../../.scripts/package-files.ts';
import {
  budgetViolations,
  controlViolations,
  COMBINED,
  COMPOSITIONS,
  FREE_DRAG_PART,
  graphViolations,
  measure,
  type Measurement,
  packageModules,
  SORTABLE_PART,
  unionViolations,
} from '../../bench/size/measure.ts';
import type { DOMRealm } from '../../src/kernel/realm.ts';
import { assemble } from '../../src/sortable/assemble.ts';
import { mergeFragments } from '../../src/sortable/config.ts';
import { ReorderResolution } from '../../src/sortable/domain.ts';
import type { FeatureContext } from '../../src/sortable/feature.ts';
import { landing } from '../../src/sortable/landing.ts';
import { layoutAnimation } from '../../src/sortable/layout-animation.ts';
import { y } from '../../src/sortable/y.ts';

const ROOT = resolve(import.meta.dirname, '../..');
const MINUTE = 60_000;

function build(): Promise<void> {
  return new Promise((done, fail) => {
    const child = spawn('npx', ['tsdown', '--config', 'tsdown.config.ts'], {
      cwd: ROOT,
    });
    let output = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      output += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      output += chunk;
    });
    child.on('error', fail);
    child.on('close', (code) => {
      if (code === 0) {
        done();
        return;
      }

      fail(new Error(`tsdown exited with ${code}\n${output}`));
    });
  });
}

const measured = new Map<string, Measurement>();

/**
 * When the build below started. Every generated file must be newer than this;
 * see the orphaned-output row.
 */
let builtAt = 0;

beforeAll(async () => {
  // The fixtures import **built** output — that is the point, since a consumer
  // never sees `src/`. Building here rather than relying on a prior `just
  // build` keeps the suite self-contained, the same way the packed-consumer
  // fixture does.
  builtAt = Date.now();
  await build();

  for (const composition of COMPOSITIONS) {
    // oxlint-disable-next-line no-await-in-loop
    measured.set(composition.name, await measure(composition));
  }
}, 2 * MINUTE);

describe('the declared module graphs', () => {
  for (const composition of COMPOSITIONS) {
    it(`should pull exactly the modules ${composition.name} declares`, () => {
      // One assertion per composition rather than one per module: a failure
      // should name the composition and every way its graph broke, not the
      // first.
      expect([
        composition.name,
        ...graphViolations(measured.get(composition.name)!),
      ]).toEqual([composition.name]);
    });
  }

  it('should pull the union of both single-behavior graphs and nothing else', () => {
    // **M-3′'s topology test** (D-95 (b)): an identity over graphs rather than
    // a byte threshold, because _near the sum_ and _near the difference_ are
    // not conditions a byte count can be scored against. A module both
    // behaviors need that resolved twice would show up here as an entry the
    // combined graph has and neither single graph does.
    expect([
      COMBINED,
      ...unionViolations(measured.get(COMBINED)!, [
        measured.get(SORTABLE_PART)!,
        measured.get(FREE_DRAG_PART)!,
      ]),
    ]).toEqual([COMBINED]);
  });

  it('should share the kernel between the behaviors rather than pairing two copies', () => {
    // The identity above holds vacuously if the two behaviors share nothing,
    // so the sharing itself is asserted: the combined graph must be strictly
    // smaller than the two graphs laid end to end, and the difference is the
    // modules both reach.
    const sortable = packageModules(measured.get(SORTABLE_PART)!);
    const freeDrag = packageModules(measured.get(FREE_DRAG_PART)!);
    const shared = sortable.filter((module) => freeDrag.includes(module));

    expect(shared.length).toBeGreaterThan(0);
    expect(packageModules(measured.get(COMBINED)!)).toHaveLength(
      sortable.length + freeDrag.length - shared.length,
    );
  });

  it('should measure a graph built from nothing but this build', async () => {
    // **The instrument's own integrity** (F-157). Every declaration above
    // scores a graph against what its composition said it would pull, and two
    // of the fifteen rows — the baselines — declare no topology at all. A
    // module nobody knew had survived is not something a declaration can name.
    //
    // The failure is a build output outliving its entrypoint. The bundler
    // overwrites what it emits and removes nothing, so a module that stops
    // being emitted leaves its `.js` on disk, still importable by relative
    // path. A fixture reaching into the built tree then keeps building against
    // the deleted shape and keeps reporting a number, and the number prices a
    // runtime the library does not ship — which is what baseline A did for
    // four commits after D-149 deleted `createSortableRuntime`.
    //
    // Scored by age rather than by name, because naming the modules that may
    // appear is the declaration this row exists to be independent of. The
    // pathspecs are `files.json`'s own, so this and `just clean-build` cannot
    // disagree about what counts as generated. A second of slack absorbs
    // filesystem timestamp granularity and nothing else: a survivor is a build
    // older than this one, not a build a millisecond older.
    const generated = packageFilesToCleanPathspecs(
      await readPackageFiles(ROOT),
    );
    const stale: string[] = [];

    for (const pathspec of generated) {
      const target = join(ROOT, pathspec);
      // oxlint-disable-next-line no-await-in-loop
      const found = await stat(target).catch(() => null);

      if (!found) {
        continue;
      }

      const files = found.isDirectory()
        ? // oxlint-disable-next-line no-await-in-loop
          (await readdir(target, { recursive: true })).map((entry) =>
            join(target, entry),
          )
        : [target];

      for (const file of files) {
        // oxlint-disable-next-line no-await-in-loop
        const entry = await stat(file);

        if (entry.isFile() && entry.mtimeMs + 1000 < builtAt) {
          stale.push(relative(ROOT, file));
        }
      }
    }

    expect(stale).toEqual([]);
  });

  it('should ship no dev-assertion module at all', () => {
    // The M-3 carried decision, as a property rather than a byte count: with
    // `__DEV__` folded to `false` the guarded blocks are dead code, and
    // `kernel/dev.js` stops being emitted or reached entirely.
    const { modules } = measured.get('complete')!;

    expect(modules.filter((module) => module.includes('dev.js'))).toEqual([]);
  });
});

/**
 * **Muted until the runtime is finalized**, and skipped rather than deleted or
 * loosened.
 *
 * The rule the budgets are administered under (`bench/size/measure.ts`, the
 * `budget` field) is that a size budget never defers a correctness fix — the
 * budget re-bases and the fix lands. While a revision is in flight that makes
 * an *enforced* budget a red row that always has the same answer: re-base it.
 * A check whose failure is never a decision stops being read, and it takes the
 * graph assertions above down with it, since a red file is a red file.
 *
 * Loosening the numbers instead would have been worse: a budget with slack
 * invented to fit is no longer a measurement, and the slack is invisible at the
 * point someone later reads the number as one.
 *
 * So the numbers stay exact and stay measured — `just size` prints and enforces
 * every one of them, and `DRAG2_SIZE_BUDGETS=1` turns these rows back on here.
 * **Unmute at finalization**, which is the same event that re-bases them.
 */
const ENFORCE_BUDGETS = process.env['DRAG2_SIZE_BUDGETS'] === '1';

describe.skipIf(!ENFORCE_BUDGETS)('the declared budgets', () => {
  for (const composition of COMPOSITIONS) {
    it(`should keep ${composition.name} within its budget`, () => {
      expect([
        composition.name,
        ...budgetViolations(measured.get(composition.name)!),
      ]).toEqual([composition.name]);
    });
  }
});

/**
 * **The control rows, and they are enforced whether budgets are muted or not.**
 *
 * A budget is a moving number while the runtime is being written, which is why
 * the block above can be muted. A control is the opposite kind of claim: it
 * names rows a change to the behavior under edit cannot reach, and its whole
 * value is that it holds while the budgets are in flux. Green ceilings alone
 * could not see bytes moving *between* rows (F-208); an exact figure on a row
 * declared unreachable can.
 */
describe('the declared controls', () => {
  for (const composition of COMPOSITIONS.filter(
    ({ control }) => control !== undefined,
  )) {
    it(`should not move ${composition.name} at all`, () => {
      expect([
        composition.name,
        ...controlViolations(measured.get(composition.name)!),
      ]).toEqual([composition.name]);
    });
  }
});

describe('the measurement pipeline', () => {
  it(
    'should produce identical bytes for identical input',
    async () => {
      const first = COMPOSITIONS[0]!;
      const again = await measure(first);

      expect(again.brotli).toBe(measured.get(first.name)!.brotli);
      expect(again.minified).toBe(measured.get(first.name)!.minified);
    },
    MINUTE,
  );
});

describe('the non-composed baseline', () => {
  it('should fill exactly the slots the assembler fills', async () => {
    // Fidelity, not equality of values: the baseline is only a baseline while
    // it fills exactly the slots `assemble()` fills. A slot added to the
    // assembler and not to the baseline would make the comparison measure two
    // different runtimes and read as a composition saving.
    // The factories never dereference the realm or the root at construction —
    // `placeholder()` reads `realm.document` inside its factory, not around it —
    // so empty stand-ins are enough to reach the slot record.
    const realm: DOMRealm = Object.create(null) as DOMRealm;
    const root: HTMLElement = Object.create(null) as HTMLElement;
    const context: FeatureContext = { realm, root, report: (): void => {} };
    const composed = assemble(
      mergeFragments(
        {
          items: (): readonly HTMLElement[] => [],
          onReorder: () => ReorderResolution.accept(),
          handle: () => null,
          visual: (item: HTMLElement) => item,
          placeholder: () => Object.create(null) as HTMLElement,
          axis: y(),
        },
        [landing(), layoutAnimation()],
      ),
      context,
    );
    // Imported here rather than at the top: it reaches built output, which
    // does not exist until `beforeAll` has run.
    const { buildSlots } = await import('../../bench/size/noncomposed.js');
    const byHand = buildSlots(context, {
      items: (): readonly HTMLElement[] => [],
      onReorder: () => ReorderResolution.accept(),
      grip: () => null,
      box: (item) => item,
    });

    expect([...Object.keys(byHand)].sort()).toEqual(
      [...Object.keys(composed)].sort(),
    );
  });
});
