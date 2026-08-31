/**
 * The two-dimensional axis rule — a field of rectangles rather than a column.
 *
 * ```text
 * candidates := centres of every non-dragged item's **box**, plus the
 *               placeholder's own
 * nearest    := the candidate whose centre is closest to the pointer, squared
 *               Euclidean over BOTH coordinates
 * if nearest is the placeholder -> keep the current insertion (no change)
 * else  gap := nearest follows the placeholder in DOM order ? slot + 1 : slot
 * ```
 *
 * **The rule is one squared-Euclidean search over both centres, with DOM order
 * deciding the gap side.** There is no axis concept in it: a grid is a list
 * with different CSS. `y()` is this same rule narrowed to a single coordinate,
 * so this module lifts a restriction rather than adding a capability.
 *
 * **Two things differ from `y()`, and neither is a switch.**
 *
 * - **The metric is squared Euclidean, and stays squared.** Comparing squared
 * distances orders identically to comparing distances, so the `sqrt` is pure
 * cost on a per-frame scan.
 * - **The gap side is DOM order, not a coordinate comparison.** On one axis
 * "which side of `nearest` is the placeholder on" *is* "is its centre above or
 * below", which `y()` reads straight out of the scan it already did. In two
 * dimensions there is no such reduction — a candidate up and to the right has
 * no unambiguous side — so the question has to be asked of the document, which
 * is what `compareDocumentPosition` answers. One DOM call per resolution, and
 * only when a nearest was found.
 *
 * **What is shared, and what deliberately is not.** The packed rect index is
 * `rect-index.ts`, held privately per feature instance; the *rule* is here. A
 * parameterized single axis feature would have made every list consumer carry
 * this module's metric and its `compareDocumentPosition` call, which a list
 * consumer must not pay for.
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
  createRectIndex,
  type DisplacementSettle,
  LEFT,
  STRIDE,
  TOP,
} from './rect-index.ts';
import type { DisplacementReport } from './slots.ts';

/**
 * Consumer-declared views, declared **here** rather than imported from the
 * behavior, exactly as `y()` declares its own: the behavior's frame and its
 * per-operation view satisfy them structurally, with no wrapper, no allocation
 * and no import edge back to the runtime.
 */
type InsertionFrameView = Readonly<{
  pointerX: number;
  pointerY: number;
  /** The committed gap; see `y.ts` for why it is read off the frame. */
  insertion: Insertion | null;
  /** The dragged item, excluded from the candidates and from the index. */
  item: HTMLElement | null;
}>;

type InsertionRuntimeView = Readonly<{
  snapshot: CollectionSnapshot;
  placeholder: HTMLElement;
  /** The installed `box` resolver, or `null`; see `y.ts` for why. */
  box: ((item: HTMLElement) => HTMLElement) | null;
  /**
   * Whether the controller is still alive; see `y.ts`. The check itself lives
   * in `RectIndex.refresh`, but the **threading** is per-axis — which is why
   * both sibling modules name it and a future axis has to as well.
   */
  live(): boolean;
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
 * **It returns the installer itself, not a one-key fragment**, and is written
 * `axis: xy()` inside the required first argument of `sortable()`.
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
 *   The hole is the incumbent every candidate is compared against and it is
 *   measured once per rebuild, so a placeholder whose own size animates must be
 *   accompanied by `controller.invalidate()`.
 * - **G7** — the linear map the collection **inherits** is stable for the
 *   operation. It is captured once, at the grab, before the lift mutates
 *   anything, and nothing revisits it — `controller.invalidate()` included,
 *   because revisiting it would describe a tree the activation has already
 *   changed. An ancestor transform that changes mid-drag is outside the domain;
 *   one that is constant for the drag is fully supported.
 *
 * ## This axis does not predict
 *
 * A cellular move sets a crossed slot to the position **another** slot holds,
 * which is exactly the cross-element difference G5 refuses, and unlike the
 * linear constant the error is per element and no single measurement recovers
 * it. So a committed move here **rebuilds the cache after the write** and takes
 * its "before" geometry from the cache it already held — one list-wide
 * measurement per committed move rather than two, and still none on a warm
 * spatial frame.
 *
 * **And only when something consumes it.** Composed without a displacement
 * feature, a committed move reads nothing at all: it invalidates and lets the
 * next spatial frame rebuild against a tree the browser has already laid
 * out.
 *
 * There is therefore no cellular rule for a consumer to satisfy, and in
 * particular **no requirement that the track geometry be independent of its
 * occupants**: this axis measures what the browser actually laid out.
 */
export function xy(): AxisInstaller {
  return () => {
    const index = createRectIndex();
    /**
     * The gap the packed buffer reflects, or `-1` when nothing is known.
     * Recorded by every rebuild, and what tells a committed move which slots it
     * could possibly have touched.
     */
    let last = -1;
    /**
     * The origins the warm cache held immediately before the write, packed
     * `[left, top]` per slot.
     *
     * **This is what replaces the old before-move measurement.** The cache the
     * rule already maintains *is* the "before" geometry, so the move costs one
     * rebuild rather than a list-wide scan on each side of the write.
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

          const { snapshot } = runtime;

          if (
            !index.refresh(
              snapshot,
              dragged,
              runtime.box,
              runtime.live,
              runtime.placeholder,
              runtime.settle,
            )
          ) {
            // The rebuild crossed the terminal barrier; see `y.ts`.
            return null;
          }

          last = frame.insertion ? frame.insertion.index : -1;

          const { values, count, hole } = index;
          const { pointerX, pointerY } = frame;
          // **Read, not measured**: the rebuild cached the placeholder's own
          // rect, so a warm spatial frame performs no layout read.
          const anchorX = hole[CENTRE_X]!;
          const anchorY = hole[CENTRE_Y]!;
          // The incumbent to beat is the placeholder's own centre — the same
          // hysteresis `y()` has, and for the same reason: a new gap is
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

          if (!runtime.live()) {
            // **The placeholder barrier**, and `y()` has no counterpart
            // because it needs no such call: it derives the side from two
            // centres the cache already holds. `compareDocumentPosition` below
            // is a consumer call on a consumer-owned element, and it is the one
            // read this rule still cannot derive. Paid only on a frame that
            // proposes a gap change, not on every spatial frame.
            return null;
          }

          const { items } = index;
          // `nearest` comes after the placeholder in document order, so the gap
          // is on its far side. The mask test is what `compareDocumentPosition`
          // is for — it returns a bitfield and several bits can be set at once,
          // which is the one legitimate use of `&` in this package.
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
         * **The committed move has landed**, and this is the one hook that
         * follows it.
         *
         * **This rule does not predict, and G5 is the reason it cannot.** A
         * cellular move sets a crossed slot to the position *another* slot
         * currently holds, which is a difference between two different
         * elements' presented geometry and therefore carries the difference of
         * their authored contributions. Unlike the linear case the error is
         * per-element rather than one scalar, and one measurement cannot
         * recover it: same-element temporal differences yield only the cell
         * steps already behind the hole, never the ones ahead of it.
         *
         * **So it measures, and only when something consumes the measurement.**
         * With no displacement feature composed there is nothing a rebuild
         * could tell anyone, so the move invalidates and returns: no read, no
         * scan, and — because a read straight after a DOM write is what forces
         * layout — no forced layout either. The next spatial frame rebuilds
         * against a tree the browser has already laid out.
         *
         * With a sink installed the vectors are needed before the animations
         * start, so the rebuild is inherent and happens here. The "before"
         * geometry is the warm cache this rule already holds and the "after" is
         * that one rebuild — **one list-wide measurement per committed move
         * rather than two**, and a warm spatial frame still reads nothing.
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
          const held = index.count;

          if (from < 0 || from === gap || held === 0) {
            // Nothing to compare against, and the write has already landed.
            invalidate();
            return;
          }

          if (before.length < held * 2) {
            before = new Float64Array(held * 2);
          }

          const stale = index.values;

          for (let i = 0; i < held; i += 1) {
            before[i * 2] = stale[i * STRIDE + LEFT]!;
            before[i * 2 + 1] = stale[i * STRIDE + TOP]!;
          }

          index.invalidate();

          if (
            !index.refresh(
              runtime.snapshot,
              frame.item!,
              runtime.box,
              runtime.live,
              runtime.placeholder,
              runtime.settle,
            )
          ) {
            last = -1;
            return;
          }

          last = gap;

          // **The destination order is stable across a placeholder move**: the
          // view is the collection minus the dragged item, and moving the hole
          // reorders none of it. So slot `i` is the same element on both sides
          // and the vector is one subtraction.
          const { values, items, count } = index;
          const span = count < held ? count : held;

          for (let i = 0; i < span; i += 1) {
            const offset = i * STRIDE;
            const dx = before[i * 2]! - values[offset + LEFT]!;
            const dy = before[i * 2 + 1]! - values[offset + TOP]!;

            if (dx !== 0 || dy !== 0) {
              report(items[i]!, dx, dy, runtime.live, runtime.space);
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
