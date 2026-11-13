/**
 * The two-dimensional axis rule, for a field of rectangles: the nearest center by
 * squared Euclidean distance, the placeholder's own as the incumbent, and DOM
 * order deciding the gap side, because a candidate up and to the right has no
 * unambiguous side. A list consumer does not carry this module's metric.
 *
 * This axis does not predict: a cellular move's displacement is a difference
 * between two elements' presented geometry, which no single measurement recovers.
 * With a displacement sink, a committed move rebuilds the cache once. Without
 * one, it invalidates, and the next frame rebuilds against a laid-out tree. A
 * resolution with nothing stale reads no layout.
 */
import type { AxisInstaller, DisplacementSink } from './axis.ts';
import type { CollectionSnapshot } from './domain.ts';
import {
  CENTER_X,
  CENTER_Y,
  LEFT,
  PLACEHOLDER,
  RectIndex,
  TOP,
} from './rect-index.ts';

/**
 * Measures every slot, only when something marked the cache stale or the collection
 * version changed. An empty window after `collect` is a rebuild, or a collection
 * with no slot.
 */
function refresh(
  index: RectIndex,
  snapshot: CollectionSnapshot,
  dragged: HTMLElement,
  getBox: ((item: HTMLElement) => HTMLElement) | null | undefined,
  placeholder: HTMLElement,
  displacement: DisplacementSink | null | undefined,
): void {
  index.collect(snapshot, dragged, placeholder, 0);

  if (index.first === index.end) {
    index.measure(0, index.count, getBox, displacement);
  }
}

/** The axis rule for a wrapping field of items. */
export function xy(): AxisInstaller {
  return () => {
    const index = new RectIndex();
    /** The gap the buffer reflects, or `-1` when nothing is known. */
    let last = -1;
    /** The origins held before the DOM write, packed `[left, top]` per slot. */
    let before = new Float64Array(0);
    const invalidate = (): void => {
      last = -1;
      index.invalidate();
    };

    return {
      resolve(query, context) {
        // Read once, outside the candidate loop.
        const { pointerX, pointerY } = query;

        refresh(
          index,
          query.snapshot,
          query.item,
          context.box,
          context.placeholder,
          context.displacement,
        );
        last = query.insertion.index;

        // Read once, outside the candidate loop.
        const { count } = index;
        const dxAnchor = pointerX - index.at(PLACEHOLDER, CENTER_X);
        const dyAnchor = pointerY - index.at(PLACEHOLDER, CENTER_Y);
        let best = dxAnchor * dxAnchor + dyAnchor * dyAnchor;
        let nearest = -1;

        for (let i = 0; i < count; i += 1) {
          const dx = pointerX - index.at(i, CENTER_X);
          const dy = pointerY - index.at(i, CENTER_Y);
          const distance = dx * dx + dy * dy;

          if (distance < best) {
            best = distance;
            nearest = i;
          }
        }

        if (nearest === -1) {
          return null;
        }

        const position = context.placeholder.compareDocumentPosition(
          index.item(nearest),
        );
        // oxlint-disable-next-line no-bitwise -- a documented bitfield
        const follows = (position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

        return index.insertion(follows ? nearest + 1 : nearest);
      },

      invalidate,

      confirm(query, context) {
        if (
          !index.holds(
            query.insertion.index,
            query.snapshot,
            context.box,
            context.displacement,
          )
        ) {
          invalidate();
        }
      },

      moved(query, context) {
        // Read once: the per-row loop below calls into it.
        const { displacement } = context;
        const gap = query.insertion.index;
        // Taken before the refresh below rewrites the count.
        const held = index.count;

        if (!displacement || last < 0 || last === gap || held === 0) {
          invalidate();
          return;
        }

        if (before.length < held * 2) {
          before = new Float64Array(held * 2);
        }

        // Before the refresh rewrites the slots.
        for (let i = 0; i < held; i += 1) {
          before[i * 2] = index.at(i, LEFT);
          before[i * 2 + 1] = index.at(i, TOP);
        }

        index.invalidate();
        refresh(
          index,
          query.snapshot,
          query.item,
          context.box,
          context.placeholder,
          displacement,
        );
        last = gap;

        // Moving the placeholder reorders nothing in the destination view, so
        // slot `i` is the same element on both sides of the write. Read once,
        // outside the loop.
        const { count } = index;
        const span = count < held ? count : held;

        for (let i = 0; i < span; i += 1) {
          const dx = before[i * 2]! - index.at(i, LEFT);
          const dy = before[i * 2 + 1]! - index.at(i, TOP);

          if (dx !== 0 || dy !== 0) {
            displacement.report(index.item(i), dx, dy, context.space);
          }
        }
      },

      retire() {
        last = -1;
        index.retire();
      },
    };
  };
}
