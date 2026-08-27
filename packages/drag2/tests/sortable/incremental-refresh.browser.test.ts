/**
 * P-06 — the **verified** incremental refresh (D-100).
 *
 * The committed-move bracket rebuilds the whole candidate index, and M-4′
 * measured that rebuild at 80–97% of a bare committed move. P-06 replaces it,
 * inside the same eager window, with a span the feature *proposes* from the two
 * gaps and then *checks* against four reads — falling back to the full rebuild
 * on any refutation.
 *
 * **The load-bearing test in this file is the equivalence instrument's
 * falsifier.** Everything else pins a gate; the instrument is what makes the
 * fast path admissible at all, and an instrument that cannot fail is not
 * evidence. So it is driven into D-100's case 3 — a `transform` on a single
 * in-span row that is not a witness — and shown to reject the buffer the fast
 * path produced. The same fixture with the transform removed is the control.
 *
 * **How "which path ran" is observed**, and why it took a second attempt. A
 * full scan reads every candidate; the fast path reads at most four. A *refused*
 * fast path reads both — its witnesses, then the whole list — so any "more reads
 * than the list" test counts refusals as successes, which is precisely the
 * direction that would make the gate tests vacuous. The exact discriminator is
 * `reads < count`, and `Field.path` is the only thing that uses it.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type {
  CollectionSnapshot,
  Insertion,
} from '../../src/sortable/domain.ts';
import type {
  SortableFeatureContext,
  InsertionGeometry,
} from '../../src/sortable/feature.ts';
import { createRectIndex, STRIDE, TOP } from '../../src/sortable/rect-index.ts';
import {
  createVerifiedRefresh,
  RESYNC_INTERVAL,
  setRefreshVerification,
} from '../../src/sortable/verified-refresh.ts';
import { xy } from '../../src/sortable/xy.ts';
import { y } from '../../src/sortable/y.ts';

const ROW_HEIGHT = 40;
const COUNT = 12;

const ALIVE = (): boolean => true;

const cleanup: HTMLElement[] = [];

beforeEach(() => {
  setRefreshVerification(true);
});

afterEach(() => {
  setRefreshVerification(true);

  for (const element of cleanup.splice(0)) {
    element.remove();
  }
});

type CommitOptions = Readonly<{
  /** Overrides the gap handed to `measure`; `null` drops the reason signal. */
  insertion?: Insertion | null;
  getBox?: ((item: HTMLElement) => HTMLElement) | null;
  version?: number;
  live?(): boolean;
}>;

type Field = Readonly<{
  root: HTMLElement;
  /** The candidates, in destination-slot order. */
  rows: HTMLElement[];
  dragged: HTMLElement;
  placeholder: HTMLElement;
  geometry: InsertionGeometry;
  /** Layout reads taken on the candidates since the last `commit`/`reads()`. */
  reads(): number;
  /** Writes the placeholder into `gap`, exactly as the bracket's writer does. */
  moveTo(gap: number): void;
  /** One committed move: the DOM write, the invalidation, the eager measure. */
  commit(gap: number, options?: CommitOptions): number;
  /** Which path serviced one committed move. */
  path(gap: number, options?: CommitOptions): 'fast' | 'full';
  /**
   * Asserts the rule built on the current buffer answers exactly as a rule
   * built on a buffer that has only ever been fully scanned.
   *
   * The equivalence instrument already holds the *buffer* to a full scan. This
   * holds the only thing a consumer can observe — the gap `resolve` proposes —
   * to a second, independent `y()` over the same DOM, swept across every row.
   */
  agree(): void;
  invalidate(): void;
  resolve(pointerY: number, version?: number): Insertion | null;
  retire(): void;
}>;

/**
 * `COUNT` rows in a linear flow, plus a placeholder in the same flow standing
 * for the dragged row's removed footprint — the shape D-100's (S1)–(S3) are
 * stated for.
 *
 * The dragged item is created but never appended, so it is a member of the
 * collection and not of the flow, which is what the top-layer lift leaves
 * behind. `snapshot.items` is therefore `[dragged, ...rows]` and destination
 * slot `i` is `rows[i]`.
 */
function createField(installer: 'y' | 'xy' = 'y', count = COUNT): Field {
  const root = document.createElement('div');

  Object.assign(root.style, {
    width: '200px',
    position: 'absolute',
    top: '0px',
    left: '0px',
  });
  document.body.append(root);
  cleanup.push(root);

  const dragged = document.createElement('div');
  const placeholder = document.createElement('div');

  Object.assign(placeholder.style, {
    display: 'block',
    height: `${ROW_HEIGHT}px`,
  });

  const rows: HTMLElement[] = [];
  let reads = 0;

  /**
   * A per-element own property, which is exactly the consumer override I-36's
   * indirect-invocation clause is about — and the only way to see *which* rows
   * a refresh touched. Built outside the loop so the counter is closed over
   * once rather than per row.
   */
  const instrument = (row: HTMLElement): void => {
    const measure = row.getBoundingClientRect.bind(row);

    row.getBoundingClientRect = (): DOMRect => {
      reads += 1;
      return measure();
    };
  };

  for (let i = 0; i < count; i += 1) {
    const row = document.createElement('div');

    Object.assign(row.style, {
      display: 'block',
      width: '100px',
      height: `${ROW_HEIGHT}px`,
    });
    row.dataset['row'] = String(i);

    instrument(row);
    root.append(row);
    rows.push(row);
  }

  root.prepend(placeholder);

  const install = (): InsertionGeometry =>
    (installer === 'y' ? y() : xy())(null as unknown as SortableFeatureContext)
      .insertion;
  const geometry = install();
  // A second geometry over the same DOM, invalidated before every read so it
  // never does anything but a full scan. It is the reference the fast path's
  // answers are held to.
  const control = install();

  const snapshot = (version = 0): CollectionSnapshot => ({
    items: [dragged, ...rows],
    version,
  });

  const gapInsertion = (gap: number, version = 0): Insertion => ({
    version,
    index: gap,
    before: rows[gap - 1] ?? null,
    after: rows[gap] ?? null,
  });

  const field: Field = {
    root,
    rows,
    dragged,
    placeholder,
    geometry,

    reads(): number {
      const taken = reads;

      reads = 0;

      return taken;
    },

    moveTo(gap: number): void {
      const anchor = rows[gap];

      if (anchor === undefined) {
        root.append(placeholder);
      } else {
        anchor.before(placeholder);
      }
    },

    commit(gap, options = {}): number {
      field.moveTo(gap);
      geometry.invalidate();
      field.reads();

      const version = options.version ?? 0;

      geometry.measure!(
        { pointerX: 0, pointerY: 0, insertion: null, item: dragged },
        {
          snapshot: snapshot(version),
          placeholder,
          box: options.getBox ?? null,
          live: options.live ?? ALIVE,
          insertion:
            options.insertion === undefined
              ? gapInsertion(gap, version)
              : options.insertion,
        },
      );

      return field.reads();
    },

    path(gap, options): 'fast' | 'full' {
      // The instrument is switched off for the duration, and nowhere else in
      // this file: it performs the very full scan the count is trying to
      // detect. With it off the fast path reads at most its four witnesses and
      // every other outcome — including a refusal — reads at least the whole
      // list, so the comparison is exact rather than merely indicative.
      setRefreshVerification(false);

      try {
        return field.commit(gap, options) < rows.length ? 'fast' : 'full';
      } finally {
        setRefreshVerification(true);
      }
    },

    agree(): void {
      const view = (pointerY: number): Insertion | null =>
        geometry.resolve(
          { pointerX: 10, pointerY, insertion: null, item: dragged },
          {
            snapshot: snapshot(),
            placeholder,
            box: null,
            live: ALIVE,
            insertion: null,
          },
        );

      for (const row of rows) {
        const rect = row.getBoundingClientRect();
        const centre = (rect.top + rect.bottom) * 0.5;

        for (const pointerY of [centre - 6, centre, centre + 6]) {
          control.invalidate();

          const reference = control.resolve(
            { pointerX: 10, pointerY, insertion: null, item: dragged },
            {
              snapshot: snapshot(),
              placeholder,
              box: null,
              live: ALIVE,
              insertion: null,
            },
          );

          expect(view(pointerY)?.index ?? null).toBe(reference?.index ?? null);
        }
      }

      field.reads();
    },

    invalidate(): void {
      geometry.invalidate();
    },

    resolve(pointerY, version = 0): Insertion | null {
      return geometry.resolve(
        { pointerX: 10, pointerY, insertion: null, item: dragged },
        {
          snapshot: snapshot(version),
          placeholder,
          box: null,
          live: ALIVE,
          insertion: null,
        },
      );
    },

    retire(): void {
      geometry.retire();
    },
  };

  // The first committed move of an operation has no previous gap to propose a
  // span from, so it is always a full scan. Every test starts past it.
  field.commit(2);

  return field;
}

/**
 * The packed buffer itself, driven through the shipped wrapper rather than
 * through `y()`.
 *
 * D-103's third fixture has to say **how many rows** a surviving drift left
 * wrong, and that is a statement about the buffer. Read through `resolve` it
 * would be a statement about the gaps the rule happens to propose at the
 * pointer positions the test picked — a weaker claim, and one that could pass
 * on a buffer with two wrong rows if neither changed an answer. So this drives
 * `createVerifiedRefresh(createRectIndex())` over its own DOM and compares the
 * slots directly.
 */
type Cache = Readonly<{
  rows: HTMLElement[];
  /** One committed move; returns the layout reads it took. */
  commit(gap: number): number;
  /** What the last {@link commit} reported. */
  refreshed(): boolean;
  /** The slots whose packed geometry disagrees with a fresh scan of the DOM. */
  differing(): number[];
  /** Whether the cache is empty, which is what `retire()` leaves behind. */
  retired(): boolean;
  /**
   * Makes `rows[slot]` close the controller from **inside its own**
   * `getBoundingClientRect()` — the I-36 hazard in its exact shape, a consumer
   * override that tears down during a traversal the library is in the middle of.
   */
  kill(slot: number): void;
}>;

function createCache(count = COUNT): Cache {
  const root = document.createElement('div');

  Object.assign(root.style, {
    width: '200px',
    position: 'absolute',
    top: '0px',
    left: '0px',
  });
  document.body.append(root);
  cleanup.push(root);

  const dragged = document.createElement('div');
  const placeholder = document.createElement('div');

  Object.assign(placeholder.style, {
    display: 'block',
    height: `${ROW_HEIGHT}px`,
  });

  const rows: HTMLElement[] = [];
  let reads = 0;
  let closed = false;
  let outcome = false;

  const live = (): boolean => !closed;

  const instrument = (row: HTMLElement): void => {
    const measure = row.getBoundingClientRect.bind(row);

    row.getBoundingClientRect = (): DOMRect => {
      reads += 1;
      return measure();
    };
  };

  for (let i = 0; i < count; i += 1) {
    const row = document.createElement('div');

    Object.assign(row.style, {
      display: 'block',
      width: '100px',
      height: `${ROW_HEIGHT}px`,
    });
    instrument(row);
    root.append(row);
    rows.push(row);
  }

  root.prepend(placeholder);

  const index = createRectIndex();
  const cache = createVerifiedRefresh(index);
  const snapshot = (): CollectionSnapshot => ({
    items: [dragged, ...rows],
    version: 0,
  });

  const probe: Cache = {
    rows,

    commit(gap): number {
      const anchor = rows[gap];

      if (anchor === undefined) {
        root.append(placeholder);
      } else {
        anchor.before(placeholder);
      }

      cache.invalidate();
      reads = 0;
      outcome = cache.refresh(snapshot(), dragged, null, live, gap);

      return reads;
    },

    refreshed: () => outcome,

    retired: () => index.count === 0 && index.items.length === 0,

    kill(slot): void {
      const row = rows[slot]!;
      const measure = row.getBoundingClientRect.bind(row);

      // No counter here: `measure` is the already-instrumented override
      // installed at construction, so it counts this read itself.
      row.getBoundingClientRect = (): DOMRect => {
        closed = true;

        return measure();
      };
    },

    differing(): number[] {
      const wrong: number[] = [];

      for (const [slot, row] of rows.entries()) {
        const rect = row.getBoundingClientRect();

        if (index.values[slot * STRIDE + TOP] !== rect.top) {
          wrong.push(slot);
        }
      }

      return wrong;
    },
  };

  // The first committed move of an operation has no span to propose.
  probe.commit(2);

  return probe;
}

describe('the incremental insertion refresh', () => {
  describe('the equivalence instrument', () => {
    it('should reject a buffer the fast path got wrong', () => {
      // **D-100 case 3, and the whole reason `k` exists.** A `transform` moves
      // one row without changing the flow, so every witness the fast path reads
      // still agrees: `rows[2]` yields a genuine δ, `rows[6]`, `rows[11]` and
      // `rows[1]` are all exactly where the cache says. The hypothesis is
      // nonetheless false for `rows[3]`, and nothing but a full comparison can
      // see that.
      const field = createField();

      field.rows[3]!.style.transform = 'translateY(7px)';

      expect(() => field.commit(6)).toThrow(/disagreed with a full scan/u);
    });

    it('should accept the same move without the perturbation', () => {
      // The control. Without it the assertion above proves only that *something*
      // throws, which a permanently-failing instrument would also satisfy.
      const field = createField();

      expect(() => field.commit(6)).not.toThrow();
    });

    it('should name the slot it disagreed at', () => {
      const field = createField();

      field.rows[4]!.style.transform = 'translateY(-3px)';

      expect(() => field.commit(6)).toThrow(/slot 4/u);
    });

    it('should leave the cache correct after it reports', () => {
      // It heals before it throws, so a reported drag is classified rather than
      // left resolving against a buffer known to be wrong.
      const field = createField();

      field.rows[3]!.style.transform = 'translateY(7px)';
      expect(() => field.commit(6)).toThrow();

      field.agree();
    });
  });

  describe('the fast path', () => {
    it('should produce the same buffer as a full scan', () => {
      const field = createField();

      // The instrument asserted the *buffer* structurally inside `commit`;
      // `agree` asserts the rule built on it, which is the half a consumer can
      // observe.
      field.commit(6);
      field.agree();
    });

    it('should survive repeated moves', () => {
      // Each move's δ applies to its own span and the buffer holds absolute
      // viewport scalars rather than deltas, so nothing accumulates that a
      // later move reinterprets (D-100 §What was checked). The instrument
      // checks every one of these.
      const field = createField();
      const gaps = [5, 3, 7, 4, 8, 2, 6];

      for (const gap of gaps) {
        expect(() => field.commit(gap)).not.toThrow();
      }

      field.agree();
    });

    it('should read five rows rather than the whole list', () => {
      // The saving, stated structurally. The instrument is switched off for
      // this one assertion **because it performs the very full scan the count
      // is measuring** — and for no other test in this file.
      const field = createField();

      setRefreshVerification(false);

      // lo = 2, hi = 6: both in-span witnesses (rows 2 and 5), the
      // after-witness, the suffix witness and the before-witness — against
      // twelve for the rebuild this replaces.
      expect(field.commit(6)).toBe(5);
    });

    it('should read four rows when the span starts at the first slot', () => {
      const field = createField();

      setRefreshVerification(false);
      field.commit(0);

      // lo = 0, so there is no before-witness.
      expect(field.commit(5)).toBe(4);
    });

    it('should not read the second in-span witness for a one-row span', () => {
      // **The skip D-103 specifies**, and the reason the committed-move
      // workload M-4′ measures is unaffected by the guard: an oscillation
      // between adjacent slots has `hi − lo === 1`, where the two in-span
      // witnesses would be the same row and the blast radius is zero anyway.
      const field = createField();

      setRefreshVerification(false);

      // lo = 2, hi = 3: one in-span witness, after, suffix, before.
      expect(field.commit(3)).toBe(4);
    });
  });

  describe('a row that drifts under the span (D-103)', () => {
    // **The three fixtures that replace D-100's single "a row transformed
    // mid-drag".** The single one only ever perturbed a non-witness in-span
    // row, which is the *cheap* half of case 3: it leaves one row wrong and the
    // instrument catches it. The expensive half is a drift on the row the
    // measurement is taken from, where `δ` absorbs the offset and the whole
    // span goes with it — and that half was untested.
    //
    // A pure `translateY` is the perturbation throughout, because it is the one
    // shape that survives the four-quantity comparison: a horizontal move fails
    // the `left`/`right` equality and a size change fails the `bottom` test. It
    // is also the shape a running FLIP offset has, which is why contract 03
    // §Insertion geometry already names it.

    it('should refuse when the first in-span witness drifted', () => {
      // **This is the row that fails against a tree with only one in-span
      // witness**, where row 2 *is* the witness: `δ` comes back as the flow
      // shift plus 7 px, every other witness honestly agrees, and the fast path
      // applies the inflated `δ` to rows 2..5.
      const field = createField();

      field.rows[2]!.style.transform = 'translateY(7px)';

      expect(field.path(6)).toBe('full');
    });

    it('should refuse when the second in-span witness drifted', () => {
      // Row 5 is `hi − 1`. Against the single-witness tree it is an ordinary
      // interior row and nothing looks at it.
      const field = createField();

      field.rows[5]!.style.transform = 'translateY(7px)';

      expect(field.path(6)).toBe('full');
    });

    it('should refuse when an in-span witness changed size', () => {
      // **The `bottom` half of the four-quantity comparison, isolated.** A
      // `scaleY` changes the row's extent without changing the flow, so no
      // other row moves and no other witness has anything to report — the
      // measured `δ` from `top` is non-zero and plausible, and only the paired
      // `bottom` test can tell that the row grew rather than translated.
      //
      // **Driven over a one-row span**, so row 2 is the *only* in-span witness.
      // Over a wider span D-103's second witness would refuse first and this
      // row would be testing that instead.
      const field = createField();

      field.rows[2]!.style.transform = 'scaleY(1.2)';

      expect(field.path(3)).toBe('full');
    });

    it('should refuse when an in-span witness moved across the axis', () => {
      // **The `left`/`right` half, isolated.** A horizontal move alone would be
      // refused by the `δ === 0` test, so it is paired with a vertical one that
      // makes `δ` look honest: the row translates *and* travels sideways, and
      // only the edges the `y` rule never reads can see it. They are compared
      // because the buffer is dimension-neutral and the equivalence instrument
      // holds it to a full scan on both axes — a witness that ignored X would
      // licence a write the instrument then rejects.
      //
      // One-row span, for the same reason as the row above.
      const field = createField();

      field.rows[2]!.style.transform = 'translate(5px, 7px)';

      expect(field.path(3)).toBe('full');
    });

    it('should refuse when a witness outside the span drifted', () => {
      // The after-, suffix- and before-witnesses, which refused before D-103
      // and still do. Driven one at a time on their own fixture, because a
      // refusal is a property of the move rather than of the field.
      for (const slot of [6, 11, 1]) {
        const field = createField();

        field.rows[slot]!.style.transform = 'translateY(7px)';

        expect([slot, field.path(6)]).toEqual([slot, 'full']);
      }
    });

    it('should report a mismatch when a strictly interior row drifted', () => {
      // The residual exposure, and the instrument is what sees it. Span [2, 6)
      // is three rows wide, so rows 3 and 4 are strictly interior: neither end
      // of the span, and no witness reads them.
      const field = createField();

      field.rows[3]!.style.transform = 'translateY(7px)';

      expect(() => field.commit(6)).toThrow(/disagreed with a full scan/u);
    });

    it('should leave exactly one row wrong when a strictly interior row drifted', () => {
      // **The radius, pinned rather than assumed.** With the instrument off —
      // which is the shipped shape — the fast path takes the move and the
      // buffer keeps whatever the hypothesis got wrong. D-103's acceptance
      // criterion is that this is *one* row, which is what the general rebuild
      // would also have got wrong, and not the span.
      const cache = createCache();

      setRefreshVerification(false);
      cache.rows[3]!.style.transform = 'translateY(7px)';
      cache.commit(6);

      expect(cache.differing()).toEqual([3]);
    });

    it('should leave nothing wrong on the same move without the drift', () => {
      // The control. Without it the row above passes on any tree that gets
      // exactly one row wrong for any reason at all.
      const cache = createCache();

      setRefreshVerification(false);
      cache.commit(6);

      expect(cache.differing()).toEqual([]);
    });
  });

  describe('teardown inside the equivalence instrument (P06-02)', () => {
    // The instrument walks every candidate through `getBoundingClientRect()`,
    // which C4-01 makes a consumer call — so it owes I-36 exactly what the
    // candidate loop owes, and **"it is `DEV`-only" is not a waiver**: this
    // repository builds `__DEV__` as `true`, so every fixture in the suite runs
    // this path, and an instrument that skipped the barrier would make the dev
    // build violate an invariant the shipped build holds.

    it('should stop the scan when the controller closes inside it', () => {
      // Row 9 is outside the span [2, 6) and outside every witness, so it is
      // reached only by the instrument's own traversal — which is what makes
      // this a test of the instrument rather than of `shift`.
      const cache = createCache();

      cache.kill(9);

      // Five witnesses, then slots 0..9 of the instrument's scan, and **not**
      // slots 10 and 11: the reading is taken between the consumer call and
      // everything after it, so the traversal stops on the row that closed the
      // controller rather than one row later.
      expect(cache.commit(6)).toBe(15);
      expect(cache.refreshed()).toBe(false);
    });

    it('should leave the cache retired rather than repopulated', () => {
      // The trailing `count`/`length` bookkeeping is precisely what
      // `RectIndex.abort()` refuses to run after a retire, on the grounds that
      // it resurrects a retired cache and pins every row of the list in a
      // destroyed controller (I-20).
      const cache = createCache();

      cache.kill(9);
      cache.commit(6);

      expect(cache.retired()).toBe(true);
    });

    it('should report no equivalence mismatch for a teardown', () => {
      // **The sharper half.** A partially completed scan legitimately differs
      // from the fast-path buffer, so an instrument that compared one would
      // turn a correct teardown into a spurious mismatch — blaming the span
      // hypothesis for a destroy, and surfacing it on `onError` as
      // `FAILURE_INVALIDATION`.
      const cache = createCache();

      cache.kill(9);

      expect(() => cache.commit(6)).not.toThrow();
    });

    it('should still report a mismatch when nothing tore down', () => {
      // The control: the rows above must not be passing because the instrument
      // stopped reporting altogether.
      const cache = createCache();

      cache.rows[3]!.style.transform = 'translateY(7px)';

      expect(() => cache.commit(6)).toThrow(/disagreed with a full scan/u);
    });
  });

  describe('the invariant boundary', () => {
    it('should refuse under xy(), whose call site does not opt in', () => {
      // Condition 1. `xy()` wraps, so δ is neither scalar nor uniform — and it
      // passes no gap at all, so this is enforced by construction rather than
      // by a branch.
      const field = createField('xy');

      expect(field.path(6)).toBe('full');
      expect(field.path(3)).toBe('full');
    });

    it('should refuse when a box resolver is installed', () => {
      // Condition 2, the strict reading of D-98's `box === visual`: any
      // resolver may return an element the list's flow does not govern.
      const field = createField();
      const getBox = (item: HTMLElement): HTMLElement => item;

      expect(field.path(6, { getBox })).toBe('full');
    });

    it('should refuse when the collection version moved', () => {
      // Condition 3. A new version means membership changed, so the packed
      // order no longer lines up with the slots the span is stated in.
      const field = createField();

      expect(field.path(6, { version: 1 })).toBe('full');
    });

    it('should refuse when a second invalidation is outstanding', () => {
      // Condition 4. A scroll between two moves is the case that matters: the
      // geometry it invalidated is not covered by the span hypothesis, and
      // `dirty` alone cannot tell the two reasons apart.
      const field = createField();

      field.invalidate();

      expect(field.path(6)).toBe('full');
    });

    it('should not be poisoned by an invalidation a resolve already serviced', () => {
      // The other half of condition 4, and the one that keeps it from
      // degenerating into "never after the first scroll".
      const field = createField();

      field.invalidate();
      field.resolve(10);

      expect(field.path(6)).toBe('fast');
    });

    it('should refuse when it was reached without a committed insertion', () => {
      // Condition 5. Being called *is* the reason signal, and a null gap is
      // what says this call is not the bracket's.
      const field = createField();

      expect(field.path(6, { insertion: null })).toBe('full');
    });

    it('should refuse when the span reaches the end of the list', () => {
      // Condition 6, the named degradation: with no after-witness and no
      // suffix witness outside the span the hypothesis cannot be checked at
      // all, so dragging to the last slot pays the old cost.
      const field = createField();

      expect(field.path(COUNT)).toBe('full');
    });

    it('should re-synchronise every k committed moves', () => {
      // Condition 7. `k` bounds how long a drift the verification cannot see
      // can persist, and caps the payoff at k× in the same breath.
      const field = createField();
      const paths: string[] = [];

      for (let i = 0; i < RESYNC_INTERVAL + 1; i += 1) {
        // Alternating gaps, so every move has a checkable span.
        paths.push(field.path(i % 2 === 0 ? 6 : 4));
      }

      expect(paths).toEqual([
        ...Array.from({ length: RESYNC_INTERVAL }, () => 'fast'),
        'full',
      ]);
    });

    it('should refuse when a witness disagrees', () => {
      // Condition 8, in its suffix-shaped form: a row growing mid-drag shifts
      // every row below it, which is what the suffix witness exists to catch.
      const field = createField();

      field.rows[9]!.style.height = `${ROW_HEIGHT + 11}px`;

      expect(field.path(6)).toBe('full');
    });

    it('should refuse when the whole list drifted under it', () => {
      // Scroll anchoring, modelled at its observable: the container shifts
      // after the write and before the read, so *every* row moved — including
      // the after-witness and the suffix witness.
      const field = createField();

      field.root.style.top = '13px';

      expect(field.path(6)).toBe('full');
    });

    it('should refuse a span the placeholder did not actually cross', () => {
      // Not one of the eight, but the same refusal: a gap equal to the one the
      // buffer already reflects proposes an empty span, which yields no δ to
      // verify.
      const field = createField();

      expect(field.path(2)).toBe('full');
    });
  });

  describe('the fallback', () => {
    it('should leave a refused refresh with a full, correct buffer', () => {
      // The fallback is the general path taken for a frame, not an error path:
      // it runs in the same window and returns the same answer.
      const field = createField();

      field.rows[9]!.style.height = `${ROW_HEIGHT + 11}px`;
      field.commit(6);
      field.agree();
    });

    it('should recover the fast path on the move after a refusal', () => {
      const field = createField();

      field.invalidate();
      expect(field.path(6)).toBe('full');
      expect(field.path(3)).toBe('fast');
    });
  });

  describe('retirement', () => {
    it('should forget the span across operations', () => {
      // The recorded gap is stated in one operation's destination index space;
      // reused in the next it would propose a span in the wrong one.
      const field = createField();

      field.retire();

      expect(field.path(4)).toBe('full');
      // And it re-establishes itself from there, in the new operation's own
      // index space.
      expect(field.path(7)).toBe('fast');
    });
  });
});
