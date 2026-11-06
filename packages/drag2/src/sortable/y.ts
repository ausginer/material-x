/**
 * The y axis rule. This is the only module containing this axis's geometry.
 * `xy()` is a sibling, never a branch inside this module.
 *
 * ```text
 * candidates := centres of every non-dragged item's box, plus the
 *               placeholder's own
 * nearest    := the candidate whose centre is closest to the pointer on Y
 * if nearest is the placeholder -> keep the current insertion (no change)
 * else  gap := nearest sits below the placeholder ? slot + 1 : slot
 * ```
 *
 * Making the placeholder a candidate provides all of the hysteresis. A new gap
 * is proposed only once another item's centre is genuinely closer than the
 * placeholder's own slot. There is no dead band, no direction latch and no
 * tunable, so nothing can be mistuned into oscillation.
 *
 * This is not `xy()` with one axis switched off. A single-column list is the
 * case where a 2-D rule is nearly right but not quite. When the pointer is
 * carried horizontally outside the column, for example on a wide row, in a drag
 * toward a scrollbar, or with a stylus at an angle, every candidate's X
 * distance grows by the same amount. But the squared sum lets that shared term
 * swamp the Y ordering near a boundary. Ignoring X is not an optimisation of
 * the 2-D rule. It is a different and better answer for a list.
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
  type RectIndexView,
  STRIDE,
  TOP,
} from './rect-index.ts';
import type { DisplacementReport } from './slots.ts';

/**
 * Consumer-declared views. They are declared in the feature's own module, so
 * the dependency points the right way. The behavior's frame and its
 * per-operation view happen to satisfy these structurally, with no wrapper, no
 * allocation, and no import edge from this module to the behavior's runtime.
 *
 * The frame argument is whichever frame the transition received: a `Draft`
 * inside a `prepare`, a readonly `Frame` inside an `effect`.
 */
type InsertionFrameView = Readonly<{
  pointerY: number;
  /**
   * The collection the gap indexes into, or `null` before a lift. It is read
   * from the frame for the same reason as `item`: it is committed state, and
   * the release resolve runs after the frame has frozen.
   */
  snapshot: CollectionSnapshot | null;

  /**
   * The committed gap. It means the same thing at both call sites because the
   * frame does: where the placeholder is. In `resolve`, the rebuild records
   * which gap its buffer reflects. In `moved`, the DOM write has just put the
   * placeholder there.
   */
  insertion: Insertion | null;
  /** The dragged item, excluded from the candidates and from the index. */
  item: HTMLElement | null;
}>;

type InsertionRuntimeView = Readonly<{
  placeholder: HTMLElement;
  /**
   * The installed `box` resolver, or `null` when the config named neither `box`
   * nor `visual`. The assembler applies the default `box = visual`, so this
   * module never has to know that rule.
   *
   * The behavior guarantees to supply this field, as it does `placeholder`. The
   * axis rule cannot tell which config slot filled it, and reads one nullable
   * field from the per-operation object.
   */
  box: ((item: HTMLElement) => HTMLElement) | null;
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
 * Returns the installer itself, not a one-key fragment. Write it as `axis: y()`
 * inside the required first argument of `sortable()`.
 *
 * ## The geometry this rule requires
 *
 * The rule maintains a cache of destination-slot geometry and moves it forward
 * without re-reading the DOM. The terms below are contract terms, not runtime
 * checks. A list that breaks one of them is outside the rule's domain, and the
 * library does not detect that.
 *
 * - G1-flow: a candidate box's flow size does not depend on where in the
 *   collection the box sits. A row that grows when it moves is not a sortable
 *   row.
 * - G1-presented: any authored presentation on a row, such as a `translate`, a
 *   `rotate`, a `scale` or an ancestor's transform, travels with the row and
 *   does not change because of where the row landed. Authored presentation is
 *   fully supported. Presentation that is a function of the slot is not.
 * - G2: a committed move relocates exactly one hole, from one gap to one other
 *   gap. Nothing else in the destination order changes.
 * - G4: every box occupies one contiguous run of the flow, never two.
 * - G5: a prediction may consume only a same-element temporal difference of
 *   measured geometry. A difference between the measured rects of two different
 *   elements includes the difference of their authored presentation, so it is
 *   not a flow quantity. This term binds the library. It is stated here because
 *   it decides which axis predicts and which measures.
 * - G6: the placeholder's own geometry is stable between invalidations. The
 *   rule describes the hole's footprint as it stood when it was last measured,
 *   and nothing short of an invalidation revisits it. So a placeholder whose
 *   own size animates must be accompanied by `controller.invalidate()`.
 * - G7: the linear map the collection inherits is stable for the operation. It
 *   is captured once, at the grab, before the lift mutates anything. Nothing
 *   revisits it, including `controller.invalidate()`, because revisiting it
 *   would describe a tree the activation has already changed. An ancestor
 *   transform that changes mid-drag is outside the domain. One that is constant
 *   for the drag is fully supported.
 *
 * ## What this rule does not cover
 *
 * These layouts are outside the rule, and none is checked at runtime:
 *
 * - Position-sensitive collapsing margins. A block list whose margins collapse
 *   differently depending on a row's neighbours does not displace by one
 *   constant, and rows outside the crossed span move as well. That breaks G2
 *   before it reaches this rule.
 * - A flow axis that is not axis-aligned in the viewport. Candidates are
 *   ordered by their viewport y coordinate, which stops meaning flow order once
 *   an ancestor rotates or skews. Ancestor scaling and CSS `zoom` are fine.
 *   Ancestor rotation and skew are not.
 *
 * ## G3-linear
 *
 * This axis predicts by this rule: relocating the hole from gap `A` to gap `B`
 * displaces the slots in `[min(A,B), max(A,B))` by one constant along the axis
 * and changes nothing else, including both cross-axis coordinates. A list whose
 * rows do not all shift by the same amount, such as one that wraps, does not
 * satisfy it. A varying flow gap does satisfy it: the rows still travel one
 * constant, so a column whose gaps differ row to row is supported, as are
 * per-item margins.
 *
 * The constant is a flow quantity, so under G5 it is measured once per
 * operation, by reading one row after the first committed move, and once again
 * after any invalidation. Every other committed move performs no layout read at
 * all.
 *
 * The hole is measured and not predicted, because where it lands depends on the
 * crossed rows' flow footprints and no prediction G5 admits yields that. A
 * committed move therefore costs one placeholder read on the next spatial
 * frame, from a tree the browser has already laid out. A warm spatial frame
 * with no committed move before it still reads nothing.
 */
export function y(): AxisInstaller {
  return () => {
    const index = new RectIndex();
    // Reading code uses this binding. `index` exists here only to construct the
    // cache and pass it to its operator. Every read below goes through the
    // collaborator's type, where the cache's contents are not writable.
    const view: RectIndexView = index;
    // This import is the axis's opt-in to G3-linear: a module this rule reaches
    // and `xy()` does not, and not a branch inside the cache both share. The
    // five arguments are this axis's values: the three stride offsets it
    // predicts along, and the unit vector that turns the scalar displacement
    // into two reported components. A future `x()` passes `LEFT`, `RIGHT`,
    // `CENTRE_X`, `1`, `0` and needs nothing else from here.
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

          const snapshot = frame.snapshot!;
          const { insertion } = frame;

          shift.refresh(
            snapshot,
            dragged,
            runtime.box,
            runtime.placeholder,
            runtime.settle,
            // The gap the resulting buffer reflects: where the placeholder
            // stands now, which is what the next committed move advances from.
            insertion ? insertion.index : -1,
          );

          const { values, count, hole } = view;
          // Read, not measured. The rebuild above cached the placeholder's own
          // rect, so a warm spatial frame, the common one, performs no layout
          // read at all.
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

          // The gap is on the side of `nearest` the placeholder is travelling
          // from. On a y axis that is a comparison of the two centres, which
          // the scan has already measured, so no DOM-order query is needed.
          const gap =
            values[nearest * STRIDE + CENTRE_Y]! > anchor
              ? nearest + 1
              : nearest;
          const { items } = view;

          return insertionAt(items, gap, snapshot);
        },

        // Wrap each hook, for different reasons. The assembler pushes `retire`
        // into `retireHooks`, which are called with no owner. It publishes
        // `invalidate` as `invalidateInsertion`, which is called as a member of
        // the slots object. Either way, a bare prototype read would arrive
        // without `shift` as `this`. The closure supplies `shift`, and the lint
        // rule would have caught a bare read.
        invalidate: () => {
          shift.invalidate();
        },

        /**
         * Runs after the committed move, and is the only hook that does. It
         * advances the cache and the placeholder slot to the geometry the DOM
         * write just produced and reports the span it crossed.
         *
         * `report` is `null` whenever no displacement feature is composed, and
         * the walk then reports nothing. The advance itself belongs to this
         * axis, because the cache has to survive the move either way.
         *
         * The first committed move of an operation, and the first after any
         * invalidation, reads one crossed row to establish the constant. Every
         * other move reads nothing at all, and neither does any warm spatial
         * frame.
         */
        moved(
          frame: InsertionFrameView,
          runtime: InsertionRuntimeView,
          report: DisplacementReport | null,
        ): void {
          shift.moved(frame.insertion!.index, frame.snapshot!, runtime, report);
        },

        retire: () => {
          shift.retire();
        },
      },
    };
  };
}
