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
import type { AxisInstaller } from './axis.ts';
import { insertionAt } from './domain.ts';
import {
  CENTER_X,
  CENTER_Y,
  LEFT,
  RectIndex,
  STRIDE,
  TOP,
} from './rect-index.ts';

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

        index.refresh(
          query.snapshot,
          query.item,
          context.box,
          context.placeholder,
          context.displacement,
        );
        last = query.insertion.index;

        // Read once, outside the candidate loop.
        const { values, count, placeholderRect, items } = index;
        const dxAnchor = pointerX - placeholderRect[CENTER_X]!;
        const dyAnchor = pointerY - placeholderRect[CENTER_Y]!;
        let best = dxAnchor * dxAnchor + dyAnchor * dyAnchor;
        let nearest = -1;

        for (let i = 0; i < count; i += 1) {
          const offset = i * STRIDE;
          const dx = pointerX - values[offset + CENTER_X]!;
          const dy = pointerY - values[offset + CENTER_Y]!;
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
          items[nearest]!,
        );
        // oxlint-disable-next-line no-bitwise -- a documented bitfield
        const follows = (position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

        return insertionAt(items, follows ? nearest + 1 : nearest);
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

        // Read once, outside the loop, before the refresh rewrites the buffer.
        const stale = index.values;

        for (let i = 0; i < held; i += 1) {
          before[i * 2] = stale[i * STRIDE + LEFT]!;
          before[i * 2 + 1] = stale[i * STRIDE + TOP]!;
        }

        index.invalidate();
        index.refresh(
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
        const { values, items, count } = index;
        const span = count < held ? count : held;

        for (let i = 0; i < span; i += 1) {
          const offset = i * STRIDE;
          const dx = before[i * 2]! - values[offset + LEFT]!;
          const dy = before[i * 2 + 1]! - values[offset + TOP]!;

          if (dx !== 0 || dy !== 0) {
            displacement.report(items[i]!, dx, dy, context.space);
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
