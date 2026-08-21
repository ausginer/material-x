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
  FeatureContext,
  InsertionGeometry,
} from '../../src/sortable/feature.ts';
import {
  RESYNC_INTERVAL,
  setRefreshVerification,
} from '../../src/sortable/rect-index.ts';
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
    (installer === 'y' ? y() : xy())(null as unknown as FeatureContext)
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
          getBox: options.getBox ?? null,
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
            getBox: null,
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
              getBox: null,
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
          getBox: null,
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

    it('should read four rows rather than the whole list', () => {
      // The saving, stated structurally. The instrument is switched off for
      // this one assertion **because it performs the very full scan the count
      // is measuring** — and for no other test in this file.
      const field = createField();

      setRefreshVerification(false);

      // lo = 2, hi = 6: the in-span witness, the after-witness, the suffix
      // witness and the before-witness — against twelve for the rebuild this
      // replaces.
      expect(field.commit(6)).toBe(4);
    });

    it('should read three rows when the span starts at the first slot', () => {
      const field = createField();

      setRefreshVerification(false);
      field.commit(0);

      // lo = 0, so there is no before-witness.
      expect(field.commit(5)).toBe(3);
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
