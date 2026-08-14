/**
 * The y axis rule — **one of two modules containing axis geometry**, and
 * the only one containing *this* axis. `xy()` is a sibling, never a branch
 * inside this one.
 *
 * ```text
 * candidates := centres of every non-dragged item's **visual**, plus the
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
 * is the case where a 2-D rule is *nearly* right and not quite: with the pointer
 * carried horizontally outside the column — a wide row, a drag toward a
 * scrollbar, a stylus at an angle — every candidate's X distance grows by the
 * same amount, but the *squared* sum lets that shared term swamp the Y ordering
 * near a boundary. Ignoring X is not an optimisation of the 2-D rule; it is a
 * different and better answer for a list.
 */
import type { CollectionSnapshot, Insertion } from './domain.ts';
import type { SortableConfig } from './config.ts';
import { CENTRE_Y, createRectIndex, STRIDE } from './rect-index.ts';

/**
 * Consumer-declared views (D-13). Declared **here**, in the feature's own
 * module, so the dependency points the right way: the behavior's frame and its
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
   * The installed `visual()` resolver, or `null` when none is composed.
   *
   * **Third widening of a consumer-declared view, and not a sibling-feature
   * dependency.** This module names a field the *behavior* guarantees to supply,
   * exactly as it already names `placeholder` — which is itself a product of the
   * optional `placeholder()` slot. The axis feature imports nothing from
   * `handle.ts` and cannot tell whether a `visual()` was composed; it reads one
   * nullable field off the per-operation object.
   */
  getVisual: ((item: HTMLElement) => HTMLElement) | null;
  /**
   * Whether the controller is still alive (I-36), threaded into the candidate
   * loop so a `visual()` resolver that destroys the controller stops the
   * traversal at that call instead of resolving the rest of the list after
   * teardown returned.
   *
   * **The fourth widening of a consumer-declared view**, and additive like the
   * three before it: the behavior's per-operation object satisfies it
   * structurally, with no wrapper, no allocation and no import edge back to the
   * runtime.
   */
  live(): boolean;
}>;

const centreOf = (element: Element): number => {
  const rect = element.getBoundingClientRect();

  return (rect.top + rect.bottom) * 0.5;
};

export function y(): Pick<SortableConfig, 'axis'> {
  return {
    axis: () => {
      // Private per-feature state. Nobody else can name it, reach it, or type it
      // — which is what makes probe 1's "where does the geometry cache live"
      // question disappear by construction rather than by argument (H-4).
      const index = createRectIndex();

      return {
        insertion: {
          resolve(
            frame: InsertionFrameView,
            runtime: InsertionRuntimeView,
          ): Insertion | null {
            const dragged = frame.item;

            if (dragged === null) {
              return null;
            }

            const { snapshot, placeholder } = runtime;

            if (
              !index.refresh(snapshot, dragged, runtime.getVisual, runtime.live)
            ) {
              // The rebuild crossed the terminal barrier (I-36). Measuring the
              // placeholder below would be a consumer call — it is the
              // consumer's element and may override `getBoundingClientRect()` —
              // so the resolution stops here rather than at the empty scan.
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
              // stays authoritative and the frame commits nothing (I-15).
              return null;
            }

            // The gap sits on the side of `nearest` the placeholder is travelling
            // from. On a y axis that is a comparison of the two centres,
            // which the scan has already measured — no DOM-order query needed.
            const gap =
              values[nearest * STRIDE + CENTRE_Y]! > anchor
                ? nearest + 1
                : nearest;
            const { items } = index;

            return {
              version: snapshot.version,
              index: gap,
              before: items[gap - 1] ?? null,
              after: items[gap] ?? null,
            };
          },

          invalidate: index.invalidate,

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
           */
          measure(
            frame: InsertionFrameView,
            runtime: InsertionRuntimeView,
          ): void {
            const dragged = frame.item;

            if (dragged !== null) {
              index.refresh(
                runtime.snapshot,
                dragged,
                runtime.getVisual,
                runtime.live,
              );
            }
          },

          retire: index.retire,
        },
      };
    },
  };
}
