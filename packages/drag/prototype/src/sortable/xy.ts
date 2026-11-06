/**
 * The two-dimensional axis rule, for a field of rectangles: the nearest centre
 * by squared Euclidean distance, the placeholder's own as the incumbent, and DOM
 * order deciding the gap side, because a candidate up and to the right has no
 * unambiguous side. A list consumer does not carry this module's metric.
 *
 * This axis does not predict: a cellular move's displacement is a difference
 * between two elements' presented geometry, which no single measurement recovers.
 * With a displacement sink, a committed move rebuilds the cache once. Without
 * one, it invalidates, and the next spatial frame rebuilds against a laid-out
 * tree. A warm spatial frame reads nothing.
 */
import type { AxisInstaller } from './axis.ts';
import { insertionAt } from './domain.ts';
import {
  CENTRE_X,
  CENTRE_Y,
  LEFT,
  RectIndex,
  type RectIndexView,
  STRIDE,
  TOP,
} from './rect-index.ts';

export function xy(): AxisInstaller {
  return () => {
    const index = new RectIndex();
    const view: RectIndexView = index;
    /** The gap the buffer reflects, or `-1` when nothing is known. */
    let last = -1;
    /** The origins held before the DOM write, packed `[left, top]` per slot. */
    let before = new Float64Array(0);
    const invalidate = (): void => {
      last = -1;
      index.invalidate();
    };

    return {
      resolve(frame, runtime) {
        const { snapshot, item, insertion, pointerX, pointerY } = frame;

        index.refresh(
          snapshot,
          item,
          runtime.box,
          runtime.placeholder,
          runtime.settle,
        );
        last = insertion ? insertion.index : -1;

        const { values, count, hole, items } = view;
        const dxAnchor = pointerX - hole[CENTRE_X]!;
        const dyAnchor = pointerY - hole[CENTRE_Y]!;
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
          return null;
        }

        const position = runtime.placeholder.compareDocumentPosition(
          items[nearest]!,
        );
        // oxlint-disable-next-line no-bitwise -- a documented bitfield
        const follows = (position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

        return insertionAt(items, follows ? nearest + 1 : nearest, snapshot);
      },

      invalidate,

      moved(frame, runtime, report) {
        const gap = frame.insertion!.index;
        const from = last;
        const held = view.count;

        if (!report || from < 0 || from === gap || held === 0) {
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
          frame.snapshot,
          frame.item,
          runtime.box,
          runtime.placeholder,
          runtime.settle,
        );
        last = gap;

        // Moving the hole reorders nothing in the destination view, so slot `i`
        // is the same element on both sides of the write.
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

      retire() {
        last = -1;
        index.retire();
      },
    };
  };
}
