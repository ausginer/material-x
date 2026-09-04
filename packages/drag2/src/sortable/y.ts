/**
 * The y axis rule — **one of two modules containing axis geometry**, and the
 * only one containing *this* axis. `xy()` is a sibling, never a branch inside
 * this one.
 *
 * ```text
 * candidates := centres of every non-dragged item's **box**, plus the
 *               placeholder's own
 * nearest    := the candidate whose centre is closest to the pointer on Y
 * if nearest is the placeholder -> keep the current insertion (no change)
 * else  gap := nearest sits below the placeholder ? slot + 1 : slot
 * ```
 *
 * **The placeholder being a candidate is the whole hysteresis.** A new gap is
 * proposed only once another item's centre is genuinely closer than the
 * placeholder's own slot: no dead band, no direction latch, no tunable, and
 * therefore nothing to mistune into oscillation.
 *
 * **Why this is not `xy()` with one axis switched off.** A single-column list
 * is the case where a 2-D rule is *nearly* right and not quite: with the
 * pointer carried horizontally outside the column — a wide row, a drag toward a
 * scrollbar, a stylus at an angle — every candidate's X distance grows by the
 * same amount, but the *squared* sum lets that shared term swamp the Y ordering
 * near a boundary. Ignoring X is not an optimisation of the 2-D rule; it is a
 * different and better answer for a list.
 */
import type { InheritedSpace } from '../kernel/presentation.ts';
import {
  type CollectionSnapshot,
  type Insertion,
  insertionAt,
} from './domain.ts';
import type { AxisInstaller } from './feature.ts';
import { LinearShift } from './linear-shift.ts';
import {
  BOTTOM,
  CENTRE_Y,
  type DisplacementSettle,
  RectIndex,
  STRIDE,
  TOP,
} from './rect-index.ts';
import type { DisplacementReport } from './slots.ts';

/**
 * Consumer-declared views. Declared **here**, in the feature's own module, so
 * the dependency points the right way: the behavior's frame and its
 * per-operation view happen to satisfy these structurally, with no wrapper, no
 * allocation, and no import edge from this module to the behavior's runtime.
 *
 * The frame argument is whichever frame the seam was handed — a `Draft` inside
 * a `prepare`, a readonly `Frame` inside an `effect`.
 */
type InsertionFrameView = Readonly<{
  pointerY: number;
  /**
   * **The committed gap**, and it means the same thing at both call sites
   * because the frame does: where the placeholder is. In `resolve` the rebuild
   * records which gap its buffer reflects; in `moved` the write has just put it
   * there.
   */
  insertion: Insertion | null;
  /** The dragged item, excluded from the candidates and from the index. */
  item: HTMLElement | null;
}>;

type InsertionRuntimeView = Readonly<{
  snapshot: CollectionSnapshot;
  placeholder: HTMLElement;
  /**
   * The installed `box` resolver, or `null` when the config named neither `box`
   * nor `visual`. The default `box = visual` is applied by the assembler, so
   * this module never has to know the rule.
   *
   * This names a field the *behavior* guarantees to supply, exactly as it
   * already names `placeholder`: the axis rule cannot tell which config slot
   * filled it, and reads one nullable field off the per-operation object.
   */
  box: ((item: HTMLElement) => HTMLElement) | null;
  /**
   * Whether the controller is still alive, threaded into the candidate loop so
   * a `visual()` resolver that destroys the controller stops the traversal at
   * that call instead of resolving the rest of the list after teardown
   * returned.
   */
  live(): boolean;
  /**
   * The installed displacement sink's settle walk, or `null` when no
   * displacement feature is composed. Applied once per rebuild so the cache
   * holds settled geometry while contributions run; see `rect-index.ts`.
   */
  settle: DisplacementSettle | null;
  /**
   * The projection a displaced element's viewport vector is reported in, or
   * `null` for an untransformed ancestry. Passed on to `report` and never read
   * here: the axis owns the vector, the sink owns what it writes.
   */
  space: InheritedSpace;
}>;

/**
 * The one-dimensional axis rule: the insertion gap follows the item centre
 * nearest the pointer on the y coordinate, with the placeholder's own centre as
 * the incumbent.
 *
 * **It returns the installer itself, not a one-key fragment**, and is written
 * `axis: y()` inside the required first argument of `sortable()`.
 *
 * ## The geometry this rule requires
 *
 * The rule maintains a cache of destination-slot geometry and moves it forward
 * without re-reading the DOM. **These are contract terms, not runtime checks.**
 * A list that breaks one of them is outside the rule's domain, and the library
 * spends no bytes discovering that.
 *
 * - **G1-flow** — a candidate box's **flow** size does not depend on where in
 *   the collection it sits. A row that grows when it moves is not a sortable
 *   row.
 * - **G1-presented** — whatever authored presentation a row wears — a
 *   `translate`, a `rotate`, a `scale`, an ancestor's transform — **travels
 *   with the row rather than changing because of where it landed**. Authored
 *   presentation is fully supported; presentation that is a *function of the
 *   slot* is not.
 * - **G2** — a committed move relocates exactly one hole, from one gap to one
 *   other gap. Nothing else in the destination order changes.
 * - **G4** — every box occupies one contiguous run of the flow, never two.
 * - **G5** — a prediction may consume only a **same-element temporal
 *   difference** of measured geometry. A difference between two *different*
 *   elements' measured rects carries the difference of their authored
 *   presentation and is not a flow quantity. This is the library's own
 *   obligation, stated because it is what decides which of the two axes
 *   predicts and which measures.
 * - **G6** — the placeholder's own geometry is stable between invalidations.
 *   The rule describes the hole's footprint as it stood when it was last
 *   measured, and nothing short of an invalidation revisits it, so a
 *   placeholder whose own size animates must be accompanied by
 *   `controller.invalidate()`.
 * - **G7** — the linear map the collection **inherits** is stable for the
 *   operation. It is captured once, at the grab, before the lift mutates
 *   anything, and nothing revisits it — `controller.invalidate()` included,
 *   because revisiting it would describe a tree the activation has already
 *   changed. An ancestor transform that changes mid-drag is outside the domain;
 *   one that is constant for the drag is fully supported.
 *
 * ## What this rule does not cover
 *
 * Two layouts sit outside it, and neither is checked at runtime:
 *
 * - **position-sensitive collapsing margins.** A block list whose margins
 *   collapse differently depending on which neighbours a row has does not
 *   displace by one constant, and rows *outside* the crossed span move as well
 *   — which breaks G2 before it reaches this rule.
 * - **a flow axis that is not axis-aligned in the viewport.** Candidates are
 *   ordered by their viewport y coordinate, which stops meaning flow order once
 *   an ancestor rotates or skews. Ancestor scaling and CSS `zoom` are fine;
 *   ancestor rotation and skew are not.
 *
 * ## G3-linear
 *
 * **This axis predicts**, and this is the rule it predicts by: relocating the
 * hole from gap `A` to gap `B` displaces the slots in `[min(A,B), max(A,B))` by
 * **one constant** along the axis and changes nothing else, including both
 * cross-axis coordinates. A list whose rows do not all shift by the same amount
 * — one that wraps — does not satisfy it. A varying flow gap does: the rows
 * still travel one constant, and a column whose gaps differ row to row is
 * supported, as are per-item margins.
 *
 * The constant itself is a flow quantity, so under G5 it is **measured once per
 * operation** — one row, read after the first committed move — and once again
 * after any invalidation. Every other committed move performs **no layout read
 * at all**.
 *
 * **The hole is measured rather than predicted**, because where it lands is a
 * function of the crossed rows' flow footprints and no prediction G5 admits
 * yields that. A committed move therefore costs one placeholder read on the
 * **next** spatial frame, taken off a tree the browser has already laid out. A
 * warm spatial frame with no committed move before it still reads nothing.
 */
export function y(): AxisInstaller {
  return () => {
    // Private per-feature state: nobody else can name it, reach it, or type it,
    // so the geometry cache has exactly one owner.
    const index = new RectIndex();
    // **G3-linear, and this import is the axis's opt-in to it**: a module this
    // rule reaches and `xy()` does not, rather than a branch inside the cache
    // both share. The five arguments are this axis's instantiation — the three
    // stride offsets it predicts along, and the unit vector that turns the
    // scalar displacement into two reported components. A future `x()` passes
    // `LEFT`, `RIGHT`, `CENTRE_X`, `1`, `0` and needs nothing else from here.
    const shift = new LinearShift(index, TOP, BOTTOM, CENTRE_Y, 0, 1);

    return {
      insertion: {
        resolve(
          frame: InsertionFrameView,
          runtime: InsertionRuntimeView,
        ): Insertion | null {
          const dragged = frame.item;

          if (!dragged) {
            return null;
          }

          const { snapshot } = runtime;
          const { insertion } = frame;

          if (
            !shift.refresh(
              snapshot,
              dragged,
              runtime.box,
              runtime.live,
              runtime.placeholder,
              runtime.settle,
              // The gap the buffer this scan produces reflects: where the
              // placeholder stands right now, which is what the next committed
              // move advances from.
              insertion ? insertion.index : -1,
            )
          ) {
            // The rebuild crossed the terminal barrier.
            return null;
          }

          const { values, count, hole } = index;
          // **Read, not measured.** The rebuild above cached the placeholder's
          // own rect, so a warm spatial frame — the common one — performs no
          // layout read at all.
          const anchor = hole[CENTRE_Y]!;
          const { pointerY } = frame;
          // The incumbent to beat is the placeholder's own centre.
          let best = Math.abs(pointerY - anchor);
          let nearest = -1;

          for (let i = 0; i < count; i += 1) {
            const distance = Math.abs(
              pointerY - values[i * STRIDE + CENTRE_Y]!,
            );

            if (distance < best) {
              best = distance;
              nearest = i;
            }
          }

          if (nearest === -1) {
            // The placeholder's own slot still wins. The committed insertion
            // stays authoritative and the frame commits nothing.
            return null;
          }

          // The gap sits on the side of `nearest` the placeholder is travelling
          // from. On a y axis that is a comparison of the two centres, which
          // the scan has already measured — no DOM-order query needed.
          const gap =
            values[nearest * STRIDE + CENTRE_Y]! > anchor
              ? nearest + 1
              : nearest;
          const { items } = index;

          return insertionAt(items, gap, snapshot);
        },

        // **Wrapped, not detached.** These two are published into a record the
        // assembler pushes into `retireHooks` and calls with no owner, so a
        // bare prototype read would arrive with no receiver. The closure is
        // what carries it, and the lint gate is what would have caught the
        // bare read.
        invalidate: () => {
          shift.invalidate();
        },

        /**
         * **The committed move has landed**, and this is the one hook that
         * follows it. It advances the cache and the placeholder slot to the
         * geometry the write just produced and reports the span it crossed.
         *
         * `report` is `null` whenever no displacement feature is composed, and
         * the walk then reports nothing — the advance itself is this axis's own
         * business, because the cache has to survive the move either way.
         *
         * The first committed move of an operation, and the first after any
         * invalidation, reads **one** crossed row to establish the constant.
         * Every other move reads nothing at all, and neither does any warm
         * spatial frame.
         */
        moved(
          frame: InsertionFrameView,
          runtime: InsertionRuntimeView,
          report: DisplacementReport | null,
        ): void {
          shift.moved(frame.insertion!.index, runtime, report);
        },

        retire: () => {
          shift.retire();
        },
      },
    };
  };
}
