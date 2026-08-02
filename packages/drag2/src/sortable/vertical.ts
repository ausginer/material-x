/**
 * The vertical axis rule — **the only module containing axis geometry**. A
 * future `horizontal()` is a sibling, never a branch inside this one.
 *
 * ```text
 * candidates := centres of every non-dragged item, plus the placeholder's own
 * nearest    := the candidate whose centre is closest to the pointer on Y
 * if nearest is the placeholder -> keep the current insertion (no change)
 * else  gap := nearest sits below the placeholder ? slot + 1 : slot
 * ```
 *
 * **The placeholder being a candidate is the whole hysteresis.** A new gap is
 * proposed only once another item's centre is genuinely closer than the
 * placeholder's own slot: no dead band, no direction latch, no tunable, and
 * therefore nothing to mistune into oscillation.
 */
import type { CollectionSnapshot, Insertion } from './domain.ts';
import { brandFeature, type SortableFeature } from './feature.ts';

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
}>;

/** Packed `[left, top, right, bottom, centreX, centreY]` per destination slot. */
const STRIDE = 6;
const LEFT = 0;
const TOP = 1;
const RIGHT = 2;
const BOTTOM = 3;
const CENTRE_X = 4;
const CENTRE_Y = 5;

const capacityFor = (needed: number): number => {
  let capacity = 1;

  while (capacity < needed) {
    capacity *= 2;
  }

  return capacity;
};

const centreOf = (element: Element): number => {
  const rect = element.getBoundingClientRect();

  return (rect.top + rect.bottom) * 0.5;
};

export function vertical(): SortableFeature {
  return brandFeature(() => {
    // Private runtime. Nobody else can name it, reach it, or type it — which is
    // what makes probe 1's "where does the geometry cache live" question
    // disappear by construction rather than by argument (H-4).
    //
    // One packed buffer plus one parallel element array, indexed by
    // **destination** position, so a slot *is* the index the resulting
    // `Insertion` needs and its neighbours are the adjacent elements.
    let values = new Float64Array(0);
    let capacity = 0;
    let count = 0;
    // Starts stale, and at a version no real collection can hold, so the first
    // resolution of every operation measures.
    let dirty = true;
    let measured = -1;
    const items: HTMLElement[] = [];

    /**
     * Re-measures only when something dirtied the cache or the collection
     * version moved. On a frame where the pointer merely travels inside the
     * same slot this reads no geometry at all and the previous scan stands.
     */
    const refresh = (
      snapshot: CollectionSnapshot,
      dragged: HTMLElement,
    ): void => {
      if (!dirty && measured === snapshot.version) {
        return;
      }

      const list = snapshot.items;

      if (list.length > capacity) {
        capacity = capacityFor(list.length);
        values = new Float64Array(capacity * STRIDE);
      }

      let n = 0;

      for (const item of list) {
        if (item === dragged) {
          continue;
        }

        const rect = item.getBoundingClientRect();
        const offset = n * STRIDE;

        values[offset + LEFT] = rect.left;
        values[offset + TOP] = rect.top;
        values[offset + RIGHT] = rect.right;
        values[offset + BOTTOM] = rect.bottom;
        values[offset + CENTRE_X] = (rect.left + rect.right) * 0.5;
        values[offset + CENTRE_Y] = (rect.top + rect.bottom) * 0.5;
        items[n] = item;
        n += 1;
      }

      count = n;
      // Truncated, so a shrinking collection neither pins the elements a larger
      // previous rebuild saw nor leaks one into a neighbour lookup.
      items.length = n;
      measured = snapshot.version;
      dirty = false;
    };

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

          refresh(snapshot, dragged);

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
          // from. On a vertical axis that is a comparison of the two centres,
          // which the scan has already measured — no DOM-order query needed.
          const gap =
            values[nearest * STRIDE + CENTRE_Y]! > anchor
              ? nearest + 1
              : nearest;

          return {
            version: snapshot.version,
            index: gap,
            before: items[gap - 1] ?? null,
            after: items[gap] ?? null,
          };
        },

        /**
         * The behavior owns the events that make geometry stale — activation,
         * scroll, resize, a committed placeholder move, collection publication,
         * release — and this feature owns the cache. One flag, because any
         * single reason forces the same full rebuild.
         */
        invalidate(): void {
          dirty = true;
        },

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
            refresh(runtime.snapshot, dragged);
          }
        },

        retire(): void {
          // The element array is what pins DOM between operations, so it is
          // emptied; the numeric buffer is kept and reused.
          items.length = 0;
          count = 0;
          dirty = true;
          measured = -1;
        },
      },
    };
  });
}
