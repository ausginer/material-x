/**
 * Displacement: the items a committed placeholder move pushed aside slide to
 * their new positions instead of jumping.
 *
 * ```text
 * (behavior)   the DOM write
 * (axis)       report(element, dx, dy, space) -> once per displaced element
 * report       one additive `translate` per element, decaying to zero
 * ```
 *
 * This feature measures nothing. The vectors come from the axis, which either
 * predicted them from the cache it already held or read them once after the DOM
 * write. So this feature owns duration, easing and the contributions it starts,
 * and no geometry. Displacement only consumes axis-owned deltas.
 *
 * A rebuild never cancels a contribution, and {@link
 * DisplacementContribution.settle} is the reason. An axis rebuilding its cache
 * must obtain settled geometry, and cancelling first would leave a window in
 * which a row has jumped. So the sink subtracts what it holds: `settle` walks
 * the buffer the axis just measured and subtracts each element's current
 * offset, computed from its own animation's timing with no layout read. Rows in
 * flight are measured without being disturbed, and the walk runs once per
 * rebuild, not once per candidate.
 *
 * Contributions fold and do not stack. A second move arriving mid-flight
 * cancels the running contribution and starts one from `residual + delta`. That
 * lands the element at exactly the position the running one had reached. A
 * stack of additive contributions gives the same continuity, but folding keeps
 * one animation per element, and the sink needs that to compute the current
 * offset.
 *
 * Displacement is not a lifecycle gate and cannot become one: no behavior code
 * it can reach suspends anything. An in-flight displacement never delays
 * release, settlement or presentation teardown.
 *
 * The dragged item and the placeholder are never reported, so this module has
 * no code to exclude them. An axis reports over the destination view, which is
 * the collection minus the dragged item, and the placeholder is not in that
 * view either. The landing animation is on the dragged item's visual, which is
 * that item or a descendant of it, so it is disjoint from every reported
 * element.
 */
import type { DisplacementInstaller } from './axis.ts';
import {
  BOTTOM,
  CENTRE_X,
  CENTRE_Y,
  LEFT,
  RIGHT,
  STRIDE,
  TOP,
} from './rect-index.ts';

export type LayoutAnimationOptions = Readonly<{
  duration?: number;
  easing?: string;
}>;

const DEFAULT_DURATION = 160;
const DEFAULT_EASING = 'ease-out';

/** What one element currently carries, and the vector it started with. */
type Contribution = {
  readonly animation: Animation;
  readonly dx: number;
  readonly dy: number;
};

/**
 * How much of a contribution is still applied, as a fraction of the vector it
 * started with.
 *
 * This reads timing, not layout. `getComputedTiming().progress` is the
 * transformed progress: the effect's easing has already been applied to it. The
 * keyframes interpolate linearly from the issued vector to zero, so the
 * remaining fraction is one minus the progress. An unresolved progress means
 * the effect is applying nothing.
 *
 * The fraction is not confined to `[0, 1]`, and nothing here needs it to be. An
 * overshooting easing drives the transformed progress outside `[0, 1]`, and
 * `issued × (1 - progress)` is still exactly what the element is currently
 * carrying, which is what both callers multiply by. A clamp would make the fold
 * and the settle walk disagree with the animation they describe.
 */
const remainingOf = (animation: Animation): number => {
  const { progress } = animation.effect!.getComputedTiming();

  return progress == null ? 0 : 1 - progress;
};

/**
 * Written `displacement: layoutAnimation()`. Contributions outlive the operation
 * that started them, and the controller cancels what is running on destruction.
 */
export function layoutAnimation(
  options: LayoutAnimationOptions = {},
): DisplacementInstaller {
  // These options are not checked. This animation gates nothing, so an
  // unbounded one leaves displaced rows offset until the controller is
  // destroyed and costs the library nothing.
  const { duration = DEFAULT_DURATION, easing = DEFAULT_EASING } = options;

  return () => {
    /**
     * Every contribution in flight, keyed by the element carrying it.
     *
     * This is a `Map` because the sink must answer for an element. An axis
     * rebuilding its cache while displacement runs asks what this feature holds
     * for a given row, which is a lookup. A fold also needs one record per
     * element, because it has to find the contribution it replaces.
     */
    const running = new Map<HTMLElement, Contribution>();

    const retire = (): void => {
      for (const { animation } of running.values()) {
        animation.cancel();
      }

      running.clear();
    };

    return {
      report(element, dx, dy, space): void {
        let sx = dx;
        let sy = dy;
        const previous = running.get(element);

        if (previous) {
          // Fold into the previous contribution. The element is presenting at
          // its old flow position plus what is left of the previous
          // contribution. Starting the replacement from that residual plus the
          // new vector leaves the element exactly there once the DOM write has
          // happened. So the two contributions sum, and neither is replayed.
          const remaining = remainingOf(previous.animation);

          sx += previous.dx * remaining;
          sy += previous.dy * remaining;
          previous.animation.cancel();
          running.delete(element);
        }

        // Use the individual `translate` property, added and not assigned.
        //
        // `transform` would be wrong for two reasons: it replaces an authored
        // `rotate(4deg)` for the duration, and it overrides a consumer's own
        // running transform animation. Additive `transform` is wrong too:
        // additive transform lists concatenate, so the offset would land inside
        // the element's own `scale()` and move it by a multiple of the delta,
        // while the delta is in viewport space.
        //
        // `translate` applies before `transform` in the used-value chain
        // (`translate → rotate → scale → transform`), so the offset is outside
        // the element's own transform and needs no correction.
        // `composite: 'add'` composes it with an authored `translate` or a
        // consumer animation on the same property and does not overwrite them.
        //
        // This expression is the only one that changes units. The vector is a
        // viewport quantity and a `translate` is a local one, so the vector is
        // projected through the inverse of the inherited linear part. That
        // costs four multiplies under an ancestor transform, and one null test
        // without one, which is the common case. Everything the sink stores
        // stays in viewport space: the fold and the settle walk both work in
        // the units the axis reports, and a local keyframe decaying to zero is
        // `sx × remaining` in viewport at every instant, which is what the walk
        // assumes.
        const animation = element.animate(
          [
            {
              translate: space
                ? `${space.a * sx + space.c * sy}px ${
                    space.b * sx + space.d * sy
                  }px`
                : `${sx}px ${sy}px`,
            },
            { translate: '0 0' },
          ],
          { duration, easing, composite: 'add' },
        );

        const record: Contribution = { animation, dx: sx, dy: sy };

        try {
          // The library holds nothing after the contribution ends. The identity
          // test keeps a fold's cancellation from evicting the record that
          // replaced it.
          animation.finished.then(
            () => {
              if (running.get(element) === record) {
                running.delete(element);
              }
            },
            () => {
              // A cancel, from a fold or from `retire`, rejects `finished`.
              // Each has already dropped the record it cancelled.
            },
          );
        } catch (error) {
          // Acquisition is all-or-nothing: `finished` is an accessor and `then`
          // a call. An animation started but never tracked would survive
          // `retire()` and keep offsetting an element no code owns.
          animation.cancel();
          throw error;
        }

        running.set(element, record);
      },

      settle(values, items, count): void {
        // An empty map returns at once; otherwise the walk visits every slot.
        // The common rebuild happens with nothing in flight, and an empty map
        // answers that in one property read, not `count` lookups.
        if (running.size === 0) {
          return;
        }

        for (let i = 0; i < count; i += 1) {
          const held = running.get(items[i]!);

          if (held) {
            const remaining = remainingOf(held.animation);
            const dx = held.dx * remaining;
            const dy = held.dy * remaining;
            const offset = i * STRIDE;

            // The centres are recomputed from the settled edges and are not
            // offset themselves. So the arithmetic is the one a full scan
            // performs, and the equivalence check compares like with like.
            const left = values[offset + LEFT]! - dx;
            const right = values[offset + RIGHT]! - dx;
            const top = values[offset + TOP]! - dy;
            const bottom = values[offset + BOTTOM]! - dy;

            values[offset + LEFT] = left;
            values[offset + RIGHT] = right;
            values[offset + CENTRE_X] = (left + right) * 0.5;
            values[offset + TOP] = top;
            values[offset + BOTTOM] = bottom;
            values[offset + CENTRE_Y] = (top + bottom) * 0.5;
          }
        }
      },

      // Teardown only. Nothing is cancelled to let something measure: a rebuild
      // settles the buffer instead. The one remaining cancel has to exist, for
      // when the controller stops owning the rows.
      retire,
    };
  };
}
