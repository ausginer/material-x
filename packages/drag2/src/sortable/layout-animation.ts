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
 * **It measures nothing.** The vectors arrive from the axis, which either
 * predicted them from the cache it already held or read them once after the
 * write, so this feature owns duration, easing and the contributions it starts
 * — and no geometry at all. That is what it means for displacement to be a
 * *consumer* of axis-owned deltas.
 *
 * **Nothing is ever released, and one member is why.** An axis rebuilding its
 * cache must obtain *settled* geometry, and settling by cancelling first would
 * leave a window in which a row has jumped. So the sink answers for what it is
 * holding: {@link DisplacementContribution.settle} walks the buffer the axis
 * just measured and subtracts each element's current offset, computed from its
 * own animation's timing with **no layout read**. Rows in flight are measured
 * without being disturbed, and the walk is asked once per rebuild rather than
 * once per candidate.
 *
 * **Contributions fold rather than stack.** A second move arriving mid-flight
 * cancels the running contribution and starts one from `residual + delta`,
 * which lands the element at exactly the position the running one had reached
 * — the same continuity a stack of additive contributions gives, but with one
 * animation per element, which is what makes the current offset answerable at
 * all.
 *
 * **It is not a lifecycle gate, and structurally cannot become one**: no seam
 * it can reach suspends anything. An in-flight displacement never delays
 * release, settlement or presentation teardown.
 *
 * **The dragged item and the placeholder are never reported**, so there is
 * nothing here to exclude them: an axis reports over the destination view,
 * which is the collection *minus* the dragged item, and the placeholder is not
 * in it either. The landing tail is on the dragged item's visual, which is
 * that item or a descendant of it, so it is disjoint by construction.
 */
import type { SortableConfig } from './config.ts';
import type { SortableDisplacementInstaller } from './feature.ts';
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

/** What one element currently carries, and what it was issued for. */
type Contribution = {
  readonly animation: Animation;
  readonly dx: number;
  readonly dy: number;
};

/**
 * How much of a contribution is still applied, as a fraction of the vector it
 * was issued for.
 *
 * **Timing, not layout.** `getComputedTiming().progress` is the *transformed*
 * progress — the effect's easing has already been applied to it — and the
 * keyframes interpolate linearly from the issued vector to zero, so the
 * remaining fraction is one minus it. An unresolved progress means the effect
 * is applying nothing.
 *
 * **The fraction is not confined to `[0, 1]`**, and nothing here needs it to
 * be: an overshooting easing drives the transformed progress outside `[0, 1]`,
 * and `issued × (1 - progress)` is still exactly what the element is currently
 * carrying, which is what both callers multiply by. A clamp would make the fold
 * and the settle walk disagree with the animation they are describing.
 */
const remainingOf = (animation: Animation): number => {
  const { progress } = animation.effect!.getComputedTiming();

  return progress == null ? 0 : 1 - progress;
};

/**
 * The displacement feature, written `displacement: layoutAnimation()`.
 *
 * **A named key, not a plugin.** Two mechanisms writing additive `translate` on
 * the same rows is a collision worth making unrepresentable rather than
 * detectable, and the key's cardinality is what does it.
 */
export function layoutAnimation(
  options: LayoutAnimationOptions = {},
): Pick<SortableConfig, 'displacement'> {
  // **Unchecked.** This animation gates nothing, so an unbounded one leaves
  // displaced rows offset until the controller is destroyed and costs the
  // library nothing.
  const { duration = DEFAULT_DURATION, easing = DEFAULT_EASING } = options;

  const install: SortableDisplacementInstaller = () => {
    /**
     * Every contribution in flight, keyed by the element carrying it.
     *
     * **A `Map`, because the sink must answer for an element.** An axis
     * rebuilding its cache while displacement runs asks what this feature is
     * holding for a given row, which is a lookup; and one record per element is
     * what folding needs, since a fold has to find the contribution it
     * supersedes.
     */
    const running = new Map<HTMLElement, Contribution>();

    const retire = (): void => {
      for (const { animation } of running.values()) {
        animation.cancel();
      }

      running.clear();
    };

    return {
      report(element, dx, dy, live, space): void {
        // **The barrier, and it covers indirect invocation.** `animate()` on a
        // consumer-owned row is a consumer call, so the previous call's may
        // have destroyed the controller. Read at the head so one reading covers
        // this element and every predecessor — the axis walks the span and
        // cannot guard the interior of a loop it only runs.
        if (!live()) {
          return;
        }

        let sx = dx;
        let sy = dy;
        const previous = running.get(element);

        if (previous) {
          // **The fold.** The element is presenting at its old flow position
          // plus whatever is left of the previous contribution; starting the
          // replacement from that residual plus the new vector leaves it
          // exactly there once the write has landed, so the two contributions
          // sum without either of them being replayed.
          const remaining = remainingOf(previous.animation);

          sx += previous.dx * remaining;
          sy += previous.dy * remaining;
          previous.animation.cancel();
          running.delete(element);
        }

        // The individual `translate` property, added rather than assigned.
        //
        // `transform` would be wrong twice over: it *replaces* an authored
        // `rotate(4deg)` for the duration, and it overrides a consumer's own
        // running transform animation. Additive `transform` is wrong too —
        // additive transform lists concatenate, so the offset would land inside
        // the element's own `scale()` and move it by a multiple of the delta,
        // while the delta is in viewport space.
        //
        // `translate` applies *before* `transform` in the used-value chain
        // (`translate → rotate → scale → transform`), so the offset is outside
        // the element's own transform and needs no correction; and
        // `composite: 'add'` composes it with an authored `translate` or a
        // consumer animation on the same property instead of clobbering it.
        //
        // **The one expression that changes units.** The vector is a viewport
        // quantity and a `translate` is a local one, so it is projected through
        // the inverse of the inherited linear part — four multiplies under an
        // ancestor transform, one null test without one, which is the common
        // case. Everything the sink *stores* stays in viewport space: the fold
        // below and the settle walk both work in the units the axis reports,
        // and a local keyframe decaying to zero is `sx × remaining` in viewport
        // at every instant, which is what the walk assumes.
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

        if (!live()) {
          // `animate()` is itself overridable on a consumer's row. Cancelled
          // rather than abandoned: it is not tracked yet, so `retire()` cannot
          // have seen it and nothing else would ever stop it.
          animation.cancel();
          return;
        }

        const record: Contribution = { animation, dx: sx, dy: sy };

        try {
          // The library holds nothing after the contribution ends, and the
          // identity test is what keeps a fold's cancellation from evicting the
          // record that superseded it.
          animation.finished.then(
            () => {
              if (running.get(element) === record) {
                running.delete(element);
              }
            },
            () => {
              // A cancel — from a fold or from `retire` — rejects `finished`;
              // each has already dropped the record it cancelled.
            },
          );
        } catch (error) {
          // Acquisition is all-or-nothing: `finished` is an accessor and `then`
          // a call, so an animation started but never tracked would survive
          // `retire()` and keep offsetting an element nothing owns.
          animation.cancel();
          throw error;
        }

        if (!live()) {
          // **Subscription is part of the acquisition.** A consumer-instrumented
          // animation can destroy the controller and return normally, so the
          // `catch` above never sees it, and `retire()` would then run while the
          // map was still empty.
          animation.cancel();
          return;
        }

        running.set(element, record);
      },

      settle(values, items, count): void {
        // **One walk, and it stops at the first miss.** The common rebuild
        // happens with nothing in flight, and an empty map answers that in one
        // property read rather than `count` lookups.
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

            // The centres are recomputed from the settled edges rather than
            // offset themselves, so the arithmetic is the one a full scan
            // performs and the equivalence instrument compares like with like.
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

      // **Teardown only.** Nothing is cancelled to let something measure: a
      // rebuild settles the buffer instead, so the one cancel left is the one
      // that has to exist, when the controller stops owning the rows.
      retire,
    };
  };

  return { displacement: install };
}
