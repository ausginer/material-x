/**
 * The y axis rule: the gap follows the item center nearest the pointer on y, with
 * the placeholder's own center as the incumbent. That incumbent provides all the
 * hysteresis, with no dead band and no direction latch.
 *
 * Ignoring x is not an optimization of `xy()`: when the pointer leaves a column
 * sideways, a shared x term would swamp the y ordering near a boundary.
 *
 * The rule predicts from this geometry, and these terms are contract and not
 * runtime checks. Relocating the placeholder displaces the crossed slots by one
 * constant along the axis and changes nothing else: a wrapping list does not
 * satisfy it, and varying gaps and margins do. A row's flow size does not depend
 * on where it sits. The rows' centers increase along y in the collection's order,
 * so the nearest center is one of the two that bracket the pointer. The linear map
 * the collection inherits is stable for the operation. A flow axis that an ancestor
 * rotates or skews is outside the rule; scale and zoom are fine.
 *
 * A resolution reads only rows it has not measured since the cache was last marked
 * stale: those from the placeholder toward the pointer, and one beyond. A
 * resolution with nothing stale and the pointer inside the measured rows reads no
 * layout. A committed move reads one row the first time, to establish the constant,
 * and the placeholder on the next frame.
 */
import type { AxisInstaller } from './axis.ts';
import { insertionAt } from './domain.ts';
import { linearShift } from './linear-shift.ts';
import { CENTER_Y, RectIndex, STRIDE } from './rect-index.ts';

/**
 * The axis rule for a single column. The rows' centers must increase along y in
 * the collection's order: a reversed column, a row that isn't rendered, or a
 * transform that carries a row's center past a neighbor's is outside this rule. A
 * resolution measures only rows it hasn't measured since the last scroll, resize or
 * `invalidate()`: the rows between the placeholder and the pointer, and one beyond.
 */
export function y(): AxisInstaller {
  return () => {
    const index = new RectIndex();
    const shift = linearShift(index);

    return {
      resolve(query, context) {
        // Read once, outside the candidate loop.
        const { pointerY } = query;

        shift._refresh(
          query.snapshot,
          query.item,
          context.box,
          context.placeholder,
          context.displacement,
          query.insertion.index,
          pointerY,
        );

        // Read once, outside the candidate loop.
        const { _values: values, _first: first, _end: end } = index;
        const anchor = index._placeholderRect[CENTER_Y]!;
        let best = Math.abs(pointerY - anchor);
        let nearest = -1;

        // The window only: it holds the nearest center, and the first in order
        // among equals.
        for (let i = first; i < end; i += 1) {
          const distance = Math.abs(pointerY - values[i * STRIDE + CENTER_Y]!);

          if (distance < best) {
            best = distance;
            nearest = i;
          }
        }

        if (nearest === -1) {
          return null;
        }

        // On one axis, the side of `nearest` the placeholder is traveling from
        // is a comparison of two centers the scan already holds.
        const gap =
          values[nearest * STRIDE + CENTER_Y]! > anchor ? nearest + 1 : nearest;

        return insertionAt(index._items, gap);
      },

      invalidate() {
        shift._invalidate();
      },

      confirm(query, context) {
        if (
          !index._holds(
            query.insertion.index,
            query.snapshot,
            context.box,
            context.displacement,
          )
        ) {
          shift._invalidate();
        }
      },

      moved(query, context) {
        shift._moved(query.insertion.index, query.snapshot, context);
      },

      retire() {
        shift._retire();
      },
    };
  };
}
