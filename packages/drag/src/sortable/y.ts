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
 * on where it sits. The linear map the collection inherits is stable for the
 * operation. A flow axis that an ancestor rotates or skews is outside the rule;
 * scale and zoom are fine.
 *
 * A resolution with nothing stale reads no layout. A committed move reads one row
 * the first time, to establish the constant, and the placeholder on the next
 * frame.
 */
import type { AxisInstaller } from './axis.ts';
import { insertionAt } from './domain.ts';
import { LinearShift } from './linear-shift.ts';
import {
  BOTTOM,
  CENTER_Y,
  RectIndex,
  type RectIndexView,
  STRIDE,
  TOP,
} from './rect-index.ts';

/** The axis rule for a single column. */
export function y(): AxisInstaller {
  return () => {
    const index = new RectIndex();
    const view: RectIndexView = index;
    const shift = new LinearShift(index, TOP, BOTTOM, CENTER_Y, 0, 1);

    return {
      resolve(query, context) {
        const { snapshot, item, insertion, pointerY } = query;

        shift.refresh(
          snapshot,
          item,
          context.box,
          context.placeholder,
          context.settle,
          insertion ? insertion.index : -1,
        );

        const { values, count, placeholderRect, items } = view;
        const anchor = placeholderRect[CENTER_Y]!;
        let best = Math.abs(pointerY - anchor);
        let nearest = -1;

        for (let i = 0; i < count; i += 1) {
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

        return insertionAt(items, gap, snapshot);
      },

      invalidate() {
        shift.invalidate();
      },

      moved(query, context, report) {
        shift.moved(query.insertion!.index, query.snapshot, context, report);
      },

      retire() {
        shift.retire();
      },
    };
  };
}
