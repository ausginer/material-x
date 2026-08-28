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
import {
  type CollectionSnapshot,
  type Insertion,
  insertionAt,
} from './domain.ts';
import type { AxisInstaller } from './feature.ts';
import { CENTRE_Y, createRectIndex, STRIDE } from './rect-index.ts';
import { createVerifiedRefresh } from './verified-refresh.ts';

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
   * The destination gap of the committed move being bracketed, or `null`
   * outside the bracket.
   *
   * `measure` has exactly one call site — the committed-move bracket — so a
   * non-null value here *is* the reason signal: it says a placeholder move just
   * happened, without widening `invalidate` and without this module learning
   * anything about the behavior's phases. `resolve` reads it too, and
   * deliberately ignores it: a lazy rebuild has no committed move to attribute
   * itself to.
   */
  insertion: Insertion | null;
}>;

const centreOf = (element: Element): number => {
  const rect = element.getBoundingClientRect();

  return (rect.top + rect.bottom) * 0.5;
};

/**
 * The one-dimensional axis rule: the insertion gap follows the item centre
 * nearest the pointer on the y coordinate, with the placeholder's own centre as
 * the incumbent.
 *
 * **It returns the installer itself, not a one-key fragment**, and is written
 * `axis: y()` inside the required first argument of `sortable()`.
 */
export function y(): AxisInstaller {
  return () => {
    // Private per-feature state: nobody else can name it, reach it, or type it,
    // so the geometry cache has exactly one owner.
    const index = createRectIndex();
    // The verified fast path is `y()`-only, and this import is its opt-in: a
    // module this rule reaches and `xy()` does not, rather than a branch inside
    // the cache both share. The wrapper owns the span hypothesis and its
    // counters; `index` stays the dimension-neutral full scan, and every
    // refresh below goes through the wrapper so the two cannot disagree about
    // what the buffer holds.
    const verified = createVerifiedRefresh(index);

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

          if (
            !verified.refresh(
              snapshot,
              dragged,
              runtime.box,
              runtime.live,
              // A lazy rebuild has no committed move to attribute itself to.
              -1,
            )
          ) {
            // The rebuild crossed the terminal barrier. Measuring the
            // placeholder below would be a consumer call — it is the consumer's
            // element and may override `getBoundingClientRect()` — so the
            // resolution stops here rather than at the empty scan.
            return null;
          }

          const { values, count } = index;
          const anchor = centreOf(placeholder);
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

        invalidate: verified.invalidate,

        /**
         * The eager half. The behavior calls it inside the committed-move
         * bracket, in the one window where no displacement offset is applied,
         * so the rebuild reads **settled presentation geometry**.
         *
         * This is a re-timing, not an extra read: a committed move always
         * dirties the cache and `resolve` always rebuilds it on the next
         * spatial frame, which by then is mid-animation. The only case that
         * pays for a pass it would not otherwise have is the last move before
         * release — and release invalidates and re-resolves anyway.
         *
         */
        measure(
          frame: InsertionFrameView,
          runtime: InsertionRuntimeView,
        ): void {
          const dragged = frame.item;

          if (dragged) {
            const { insertion } = runtime;

            // **The reason signal.** The gap is both "a committed move just
            // happened" and half the span hypothesis; four reads verify the
            // other half, and any refutation falls back to the full rebuild, in
            // the same window.
            verified.refresh(
              runtime.snapshot,
              dragged,
              runtime.box,
              runtime.live,
              insertion ? insertion.index : -1,
            );
          }
        },

        retire: verified.retire,
      },
    };
  };
}
