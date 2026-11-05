/**
 * The two-dimensional axis rule, for a field of rectangles and not a column.
 *
 * ```text
 * candidates := centres of every non-dragged item's box, plus the
 *               placeholder's own
 * nearest    := the candidate whose centre is closest to the pointer, squared
 *               Euclidean over BOTH coordinates
 * if nearest is the placeholder -> keep the current insertion (no change)
 * else  gap := nearest follows the placeholder in DOM order ? slot + 1 : slot
 * ```
 *
 * The rule is one squared-Euclidean search over both centres, and DOM order
 * decides the gap side. The rule has no axis concept: a grid is a list with
 * different CSS. `y()` is this same rule narrowed to a single coordinate, so
 * this module removes a restriction and does not add a capability.
 *
 * It differs from `y()` in two ways, and neither is a switch:
 *
 * - The metric is squared Euclidean and stays squared. Comparing squared
 *   distances gives the same order as comparing distances, so `sqrt` is pure
 *   cost on a per-frame scan.
 * - The gap side comes from DOM order, not from a coordinate comparison. On one
 *   axis, "which side of `nearest` is the placeholder on" is the same as "is
 *   its centre above or below", which `y()` reads from the scan it already did.
 *   Two dimensions have no such reduction: a candidate up and to the right has
 *   no unambiguous side. So the code asks the document, with
 *   `compareDocumentPosition`. That is one DOM call per resolution, and only
 *   when a nearest was found.
 *
 * The packed rect index is in `rect-index.ts`, held privately per feature
 * instance, and the rule is here. A parameterized single axis feature would
 * make every list consumer carry this module's metric and its
 * `compareDocumentPosition` call, which a list consumer must not pay for.
 */
import type { InheritedSpace } from '../kernel/presentation.ts';
import {
  type CollectionSnapshot,
  type Insertion,
  insertionAt,
} from './domain.ts';
import type { AxisInstaller } from './feature.ts';
import {
  CENTRE_X,
  CENTRE_Y,
  type DisplacementSettle,
  LEFT,
  RectIndex,
  type RectIndexView,
  STRIDE,
  TOP,
} from './rect-index.ts';
import type { DisplacementReport } from './slots.ts';

/**
 * Consumer-declared views, declared here and not imported from the behavior, as
 * `y()` declares its own. The behavior's frame and its per-operation view
 * satisfy them structurally, with no wrapper, no allocation and no import edge
 * back to the runtime.
 */
type InsertionFrameView = Readonly<{
  pointerX: number;
  pointerY: number;
  /**
   * The collection the gap indexes into, or `null` before a lift. It is read
   * from the frame for the same reason as `item`: it is committed state, and
   * the release resolve runs after the frame has frozen.
   */
  snapshot: CollectionSnapshot | null;

  /** The committed gap; see `y.ts` for why it is read off the frame. */
  insertion: Insertion | null;
  /** The dragged item, excluded from the candidates and from the index. */
  item: HTMLElement | null;
}>;

type InsertionRuntimeView = Readonly<{
  placeholder: HTMLElement;
  /** The installed `box` resolver, or `null`; see `y.ts` for why. */
  box: ((item: HTMLElement) => HTMLElement) | null;
  /**
   * The installed displacement sink's settle walk, or `null`; see
   * `rect-index.ts`.
   */
  settle: DisplacementSettle | null;
  /**
   * The projection a displaced element's viewport vector is reported in, or
   * `null` for an untransformed ancestry; see `y.ts`. Passed on to `report` and
   * never read here.
   */
  space: InheritedSpace;
}>;

/**
 * The two-dimensional axis rule: the insertion gap follows the item centre
 * nearest the pointer over both coordinates, with the placeholder's own centre
 * as the incumbent.
 *
 * Returns the installer itself, not a one-key fragment. Write it as
 * `axis: xy()` inside the required first argument of `sortable()`.
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
 *   hole is the incumbent every candidate is compared against and it is
 *   measured once per rebuild, so a placeholder whose own size animates must be
 *   accompanied by `controller.invalidate()`.
 * - G7: the linear map the collection inherits is stable for the operation. It
 *   is captured once, at the grab, before the lift mutates anything. Nothing
 *   revisits it, including `controller.invalidate()`, because revisiting it
 *   would describe a tree the activation has already changed. An ancestor
 *   transform that changes mid-drag is outside the domain. One that is constant
 *   for the drag is fully supported.
 *
 * ## This axis does not predict
 *
 * A cellular move sets a crossed slot to the position another slot holds, which
 * is the cross-element difference G5 refuses. Unlike the linear constant, the
 * error is per element and no single measurement recovers it. So a committed
 * move here rebuilds the cache after the DOM write and takes its "before"
 * geometry from the cache it already held. That is one list-wide measurement
 * per committed move, not two, and still none on a warm spatial frame.
 *
 * The rebuild happens only when something consumes it. Composed without a
 * displacement feature, a committed move reads nothing at all: it invalidates,
 * and the next spatial frame rebuilds against a tree the browser has already
 * laid out.
 *
 * So there is no cellular rule for a consumer to satisfy. In particular, the
 * track geometry does not have to be independent of its occupants: this axis
 * measures what the browser actually laid out.
 */
export function xy(): AxisInstaller {
  return () => {
    const index = new RectIndex();
    /**
     * Reading code uses this binding. This module also drives the cache's
     * operations, so it holds both types. `index` is for the operations and
     * this binding is for every read, where the packed contents are not
     * writable from outside the cache.
     */
    const view: RectIndexView = index;
    /**
     * The gap the packed buffer reflects, or `-1` when nothing is known. Every
     * rebuild records it, and it tells a committed move which slots it could
     * possibly have touched.
     */
    let last = -1;
    /**
     * The origins the warm cache held immediately before the DOM write, packed
     * `[left, top]` per slot.
     *
     * The cache the rule already maintains is the "before" geometry, so the
     * move costs one rebuild and not a list-wide scan on each side of the
     * write.
     */
    let before = new Float64Array(0);
    const invalidate = (): void => {
      last = -1;
      index.invalidate();
    };

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

          index.refresh(
            snapshot,
            dragged,
            runtime.box,
            runtime.placeholder,
            runtime.settle,
          );

          last = frame.insertion ? frame.insertion.index : -1;

          const { values, count, hole } = view;
          const { pointerX, pointerY } = frame;
          // Read, not measured: the rebuild cached the placeholder's own rect,
          // so a warm spatial frame performs no layout read.
          const anchorX = hole[CENTRE_X]!;
          const anchorY = hole[CENTRE_Y]!;
          // The incumbent to beat is the placeholder's own centre. This is the
          // same hysteresis `y()` has, for the same reason: a new gap is
          // proposed only once another candidate is genuinely closer than the
          // slot the item already occupies.
          const dxAnchor = pointerX - anchorX;
          const dyAnchor = pointerY - anchorY;
          let best = dxAnchor * dxAnchor + dyAnchor * dyAnchor;
          let nearest = -1;

          for (let i = 0; i < count; i += 1) {
            const offset = i * STRIDE;
            const dx = pointerX - values[offset + CENTRE_X]!;
            const dy = pointerY - values[offset + CENTRE_Y]!;
            const distance = dx * dx + dy * dy;

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

          const { items } = view;
          // When `nearest` comes after the placeholder in document order, the
          // gap is on its far side. `compareDocumentPosition` returns a
          // bitfield in which several bits can be set at once, so `&` is the
          // correct test here.
          const position = runtime.placeholder.compareDocumentPosition(
            items[nearest]!,
          );

          // oxlint-disable-next-line no-bitwise -- a documented bitfield
          const follows = (position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
          const gap = follows ? nearest + 1 : nearest;

          return insertionAt(items, gap, snapshot);
        },

        invalidate,

        /**
         * Runs after the committed move, and is the only hook that does.
         *
         * This rule does not predict, because of G5. A cellular move sets a
         * crossed slot to the position another slot currently holds. That is a
         * difference between two different elements' presented geometry, so it
         * includes the difference of their authored contributions. Unlike the
         * linear case, the error is per element and not one scalar, and one
         * measurement cannot recover it: same-element temporal differences
         * yield only the cell steps already behind the hole, never the ones
         * ahead of it.
         *
         * So this hook measures, and only when something consumes the
         * measurement. With no displacement feature composed, nothing can use a
         * rebuild's result, so the move invalidates and returns. It performs no
         * read and no scan. A read straight after a DOM write forces layout, so
         * this path forces no layout either. The next spatial frame rebuilds
         * against a tree the browser has already laid out.
         *
         * With a sink installed, the vectors are needed before the animations
         * start, so the rebuild must happen here. The "before" geometry is the
         * warm cache this rule already holds, and the "after" is that one
         * rebuild. That is one list-wide measurement per committed move, not
         * two, and a warm spatial frame still reads nothing.
         */
        moved(
          frame: InsertionFrameView,
          runtime: InsertionRuntimeView,
          report: DisplacementReport | null,
        ): void {
          if (!report) {
            invalidate();
            return;
          }

          const gap = frame.insertion!.index;
          const from = last;
          const held = view.count;

          if (from < 0 || from === gap || held === 0) {
            // Nothing to compare against, and the DOM write has already
            // happened.
            invalidate();
            return;
          }

          if (before.length < held * 2) {
            before = new Float64Array(held * 2);
          }

          const stale = view.values;

          for (let i = 0; i < held; i += 1) {
            before[i * 2] = stale[i * STRIDE + LEFT]!;
            before[i * 2 + 1] = stale[i * STRIDE + TOP]!;
          }

          index.invalidate();

          index.refresh(
            frame.snapshot!,
            frame.item!,
            runtime.box,
            runtime.placeholder,
            runtime.settle,
          );

          last = gap;

          // The destination order is stable across a placeholder move: the view
          // is the collection minus the dragged item, and moving the hole
          // reorders none of it. So slot `i` is the same element on both sides,
          // and the vector is one subtraction.
          const { values, items, count } = view;
          const span = count < held ? count : held;

          for (let i = 0; i < span; i += 1) {
            const offset = i * STRIDE;
            const dx = before[i * 2]! - values[offset + LEFT]!;
            const dy = before[i * 2 + 1]! - values[offset + TOP]!;

            if (dx !== 0 || dy !== 0) {
              report(items[i]!, dx, dy, runtime.space);
            }
          }
        },

        retire(): void {
          last = -1;
          index.retire();
        },
      },
    };
  };
}
