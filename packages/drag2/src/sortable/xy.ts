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
import {
  type CollectionSnapshot,
  type Insertion,
  insertionAt,
} from './domain.ts';
import type { AxisInstaller } from './feature.ts';
import { CENTRE_X, CENTRE_Y, createRectIndex, STRIDE } from './rect-index.ts';

/**
 * Consumer-declared views, declared **here** rather than imported from the
 * behavior, exactly as `y()` declares its own: the behavior's frame and its
 * per-operation view satisfy them structurally, with no wrapper, no allocation
 * and no import edge back to the runtime.
 */
type InsertionFrameView = Readonly<{
  pointerX: number;
  pointerY: number;
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
}>;

/**
 * The two-dimensional axis rule: the insertion gap follows the item centre
 * nearest the pointer over both coordinates, with the placeholder's own centre
 * as the incumbent.
 *
 * **It returns the installer itself, not a one-key fragment**, and is written
 * `axis: xy()` inside the required first argument of `sortable()`.
 */
export function xy(): AxisInstaller {
  return () => {
    const index = createRectIndex();

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

          const { snapshot, placeholder } = runtime;

          if (!index.refresh(snapshot, dragged, runtime.box, runtime.live)) {
            // The rebuild crossed the terminal barrier; see `y.ts`. The
            // placeholder measured below is consumer-owned, so reading it after
            // the close would be an indirect consumer call.
            return null;
          }

          const { values, count } = index;
          const { pointerX, pointerY } = frame;
          const anchor = placeholder.getBoundingClientRect();
          const anchorX = (anchor.left + anchor.right) * 0.5;
          const anchorY = (anchor.top + anchor.bottom) * 0.5;
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
            // **The second placeholder barrier**, and `y()` has no counterpart
            // because it needs no second call: it derives the side from two
            // centres it has already measured. Here the anchor read above is a
            // consumer call on a consumer-owned element, and
            // `compareDocumentPosition` below is a second one on the same
            // element. Paid only on a frame that proposes a gap change, not on
            // every spatial frame.
            return null;
          }

          const { items } = index;
          // `nearest` comes after the placeholder in document order, so the gap
          // is on its far side. The mask test is what `compareDocumentPosition`
          // is for — it returns a bitfield and several bits can be set at once,
          // which is the one legitimate use of `&` in this package.
          const position = placeholder.compareDocumentPosition(items[nearest]!);

          // oxlint-disable-next-line no-bitwise -- a documented bitfield
          const follows = (position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
          const gap = follows ? nearest + 1 : nearest;

          return insertionAt(items, gap, snapshot);
        },

        invalidate: index.invalidate,

        /** The eager half, identical in timing and reason to `y()`'s. */
        measure(
          frame: InsertionFrameView,
          runtime: InsertionRuntimeView,
        ): void {
          const dragged = frame.item;

          if (dragged) {
            index.refresh(runtime.snapshot, dragged, runtime.box, runtime.live);
          }
        },

        retire: index.retire,
      },
    };
  };
}
