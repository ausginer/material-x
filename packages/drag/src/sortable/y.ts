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
 * constant along the axis and changes nothing else. A wrapping list does not
 * satisfy it. Nor does a block column whose vertical margins collapse into each
 * other on both sides of a row: the space between two neighbours is then the
 * larger of their two margins, so where the placeholder sits changes the spacing
 * of rows it did not cross. Such a column satisfies it when the placeholder has
 * the rows' margins. A flex column, a flow `gap` and margins on one side of each
 * row satisfy it. A row's flow size does not depend on where it sits. The rows' centers increase along y in the collection's order,
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
import type {
  AxisContext,
  AxisInstaller,
  AxisQuery,
  InsertionGeometry,
} from './axis.ts';
import type { Insertion } from './domain.ts';
import { LinearShift } from './linear-shift.ts';
import { CENTER_Y, PLACEHOLDER, RectIndex, TOP } from './rect-index.ts';

class YAxisGeometry implements InsertionGeometry {
  readonly #index = new RectIndex(TOP);
  readonly #shift = new LinearShift(this.#index);

  resolve(query: AxisQuery, context: AxisContext): Insertion | null {
    this.#shift.refresh(
      query.snapshot,
      query.item,
      context.box,
      context.placeholder,
      context.displacement,
      query.insertion.index,
      query.pointerY,
    );

    // Read once, outside the candidate loop.
    const anchor = this.#index.at(PLACEHOLDER, CENTER_Y);
    let best = Math.abs(query.pointerY - anchor);
    let nearest = -1;

    // The window only: it holds the nearest center, and the first in order
    // among equals.
    for (let i = this.#index.first; i < this.#index.end; i += 1) {
      const distance = Math.abs(query.pointerY - this.#index.at(i, CENTER_Y));

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
    return this.#index.insertion(
      this.#index.at(nearest, CENTER_Y) > anchor ? nearest + 1 : nearest,
    );
  }

  confirm(query: AxisQuery, context: AxisContext): void {
    if (
      !this.#index.holds(
        query.insertion.index,
        query.snapshot,
        context.box,
        context.displacement,
      )
    ) {
      this.#shift.invalidate();
    }
  }

  moved(query: AxisQuery, context: AxisContext): void {
    this.#shift.moved(query.insertion.index, query.snapshot, context);
  }

  invalidate(): void {
    this.#shift.invalidate();
  }

  retire(): void {
    this.#shift.retire();
  }
}

/**
 * The axis rule for a single column. The rows' centers must increase along y in
 * the collection's order: a reversed column, a row that isn't rendered, or a
 * transform that carries a row's center past a neighbor's is outside this rule.
 * Moving the placeholder must move only the rows it crosses, all by one distance:
 * a wrapping list is outside this rule, and so is a block column whose vertical
 * margins collapse on both sides of a row, unless the placeholder has the rows'
 * margins, for example from a `[data-drag-placeholder]` style rule. A resolution
 * measures only rows it hasn't measured since the last scroll, resize or
 * `invalidate()`: the rows between the placeholder and the pointer, and one beyond.
 */
export function y(): AxisInstaller {
  return () => new YAxisGeometry();
}
