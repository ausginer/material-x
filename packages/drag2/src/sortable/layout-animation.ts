/**
 * Displacement: the items a committed placeholder move pushed aside slide to
 * their new positions instead of jumping.
 *
 * ```text
 * (axis)       a plan -> every displaced element and its vector
 * (behavior)   the DOM write
 * apply        one additive `translate` per element, decaying to zero
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
 * leave a window in which a row has jumped. So the sink publishes
 * {@link DisplacementContribution.contribution}: the offset it is currently
 * holding for an element, computed from its own animation's timing with **no
 * layout read**. The axis subtracts it per candidate and measures rows in
 * flight without disturbing them.
 *
 * **Contributions fold rather than stack.** A second move arriving mid-flight
 * cancels the running contribution and starts one from `residual + delta`,
 * which lands the element at exactly the position the running one had reached
 * — the same continuity a stack of additive contributions gives, but with one
 * animation per element, which is what makes the current offset answerable at
 * all.
 *
 * **It is not a lifecycle gate, and structurally cannot become one**: it has no
 * access to `SettlementScope`, which is passed only to `settlement.effect`. An
 * in-flight displacement never delays release, settlement or presentation
 * teardown.
 *
 * **The dragged item and the placeholder cannot appear in a plan**, so there is
 * nothing here to exclude them: a plan visits the destination view, which is
 * the collection *minus* the dragged item, and the placeholder is not in it
 * either. The landing tail on the dragged item is disjoint by construction.
 */
import type { SortableConfig } from './config.ts';
import type { SortableDisplacementInstaller } from './feature.ts';

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
 * How much of a contribution is still applied, in `[0, 1]`.
 *
 * **Timing, not layout.** `getComputedTiming().progress` is the *transformed*
 * progress — the effect's easing has already been applied to it — and the
 * keyframes interpolate linearly from the issued vector to zero, so the
 * remaining fraction is one minus it. An unresolved progress means the effect
 * is applying nothing.
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
  // **Unchecked**, and the difference from `landing({ duration })` is the rule
  // working rather than an inconsistency. This animation holds no gate and
  // gates no terminal, so an unbounded one leaves displaced rows offset until
  // the controller is destroyed and costs the library nothing.
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

    const stop = (): void => {
      for (const { animation } of running.values()) {
        animation.cancel();
      }

      running.clear();
    };

    return {
      apply(plan, live): void {
        plan((element, dx, dy) => {
          // **The barrier, and it covers indirect invocation.** `animate()` on
          // a consumer-owned row is a consumer call, so the previous
          // iteration's may have destroyed the controller. Read at the head so
          // one reading covers the entry and every predecessor.
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
          // additive transform lists concatenate, so the offset would land
          // inside the element's own `scale()` and move it by a multiple of the
          // delta, while the delta is in viewport space.
          //
          // `translate` applies *before* `transform` in the used-value chain
          // (`translate → rotate → scale → transform`), so the offset is
          // outside the element's own transform and needs no correction; and
          // `composite: 'add'` composes it with an authored `translate` or a
          // consumer animation on the same property instead of clobbering it.
          const animation = element.animate(
            [{ translate: `${sx}px ${sy}px` }, { translate: '0 0' }],
            { duration, easing, composite: 'add' },
          );

          if (!live()) {
            // `animate()` is itself overridable on a consumer's row. Cancelled
            // rather than abandoned: it is not tracked yet, so `retire()`
            // cannot have seen it and nothing else would ever stop it.
            animation.cancel();
            return;
          }

          const record: Contribution = { animation, dx: sx, dy: sy };

          try {
            // The library holds nothing after the contribution ends, and the
            // identity test is what keeps a fold's cancellation from evicting
            // the record that superseded it.
            animation.finished.then(
              () => {
                if (running.get(element) === record) {
                  running.delete(element);
                }
              },
              () => {
                // A cancel — from a fold, from `settle` or from `retire` —
                // rejects `finished`; each of the three has already dropped the
                // record it cancelled.
              },
            );
          } catch (error) {
            // Acquisition is all-or-nothing: `finished` is an accessor and
            // `then` a call, so an animation started but never tracked would
            // survive `retire()` and keep offsetting an element nothing owns.
            animation.cancel();
            throw error;
          }

          if (!live()) {
            // **Subscription is part of the acquisition.** A
            // consumer-instrumented animation can destroy the controller and
            // return normally, so the `catch` above never sees it, and
            // `retire()` would then run while the map was still empty.
            animation.cancel();
            return;
          }

          running.set(element, record);
        });
      },

      contribution(element, out): void {
        const held = running.get(element);

        if (!held) {
          out[0] = 0;
          out[1] = 0;
          return;
        }

        const remaining = remainingOf(held.animation);

        out[0] = held.dx * remaining;
        out[1] = held.dy * remaining;
      },

      // **A plain cancel, and that is the whole of it.** Cancelling an additive
      // contribution that decays to zero lands the element exactly where flow
      // puts it, so release measures settled geometry without anything being
      // released and replayed first.
      settle: stop,
      retire: stop,
    };
  };

  return { displacement: install };
}
