/**
 * `bounds()` — the containment capability, and the package's first slot a third
 * party can fill **instead of** the first-party one rather than beside it.
 *
 * **A capability installer rather than a config key**: it owns a resolved rect,
 * a staleness rule and a source it re-reads, so a composition without it
 * carries neither the resolver nor the clamp.
 *
 * The no-argument form *is* the viewport; there is no sentinel to export.
 */

import type { FreeDragConfig } from './config.ts';
import type {
  ConstraintContribution,
  ConstraintView,
  FreeDragFeatureContext,
  MotionDraft,
} from './feature.ts';

/**
 * Where the drag is contained. An element is measured; a thunk is called; and
 * `null` from a thunk means unconstrained for that read.
 *
 * The source is optional: `bounds()` with no argument contains the drag to the
 * viewport of the realm that owns the item.
 */
export type BoundsSource = HTMLElement | (() => DOMRectReadOnly | null);

export function bounds(source?: BoundsSource): Pick<FreeDragConfig, 'bounds'> {
  return {
    bounds: (context: FreeDragFeatureContext): ConstraintContribution => {
      const { realm } = context;
      /**
       * The resolved rect, and a flag rather than a version counter: there is
       * one reader and one invalidator, so a counter would carry a number
       * nothing compares.
       */
      let rect: DOMRectReadOnly | null = null;
      let stale = true;

      /**
       * **Resolved lazily, on the first `apply` after a staleness mark** — not
       * inside `invalidate()`. Scroll and resize raise staleness many times a
       * second and each resolve is a layout read or a consumer call, so
       * resolving eagerly would put both on the scroll path.
       *
       * **Where a garbage source surfaces is therefore the seam that next
       * renders, and that is four seams rather than one.** The rect starts
       * stale, so the **first** resolve of every operation is at
       * `activation.effect`, which places the visual at the accumulated grab
       * delta — `FAILURE_ACTIVATION`, and the path a bad source almost always
       * takes. After a staleness mark the next `apply` is whichever of `moved`
       * (`FAILURE_RENDERER_WRITE`), a `TAG_POSITION` effect
       * (`FAILURE_ACTION_EFFECT`) or `release.prepare` (`FAILURE_RELEASE`) runs
       * first. **Four stages for one bad source is the point**: a stage says
       * where the library was standing, so the same fault reports four
       * different ones and none of them names the consumer.
       *
       * **`FAILURE_ACTION_PREPARE` is not reachable from here at all**:
       * `invalidate()` is a staleness flag that calls nothing, so the seam that
       * marks the rect stale is never the seam that resolves it.
       */
      const resolve = (): DOMRectReadOnly | null => {
        if (!stale) {
          return rect;
        }

        stale = false;

        if (source === undefined) {
          // The viewport, constructed from the owning realm rather than the
          // ambient global, so a controller inside an iframe is contained by
          // that document's viewport.
          rect = new realm.window.DOMRectReadOnly(
            0,
            0,
            realm.window.innerWidth,
            realm.window.innerHeight,
          );
        } else if (typeof source === 'function') {
          rect = source();
        } else {
          rect = source.getBoundingClientRect();
        }

        return rect;
      };

      return {
        constrain: {
          /**
           * One indirect call per committed sample, and it **allocates
           * nothing**: the clamped scalars are written back into the draft the
           * behavior owns and passed by reference.
           *
           * The clamp is over the *origin-relative delta*, which is the space
           * `lift.write` consumes — so the visual's rect stays inside the
           * bounds rect without either side ever building a point.
           */
          apply(motion: MotionDraft, view: ConstraintView): void {
            const box = resolve();

            if (!box) {
              return;
            }

            const { originRect } = view;
            // **The lower clamp is applied first**, so a bounds box smaller
            // than the visual pins deterministically to the far edge instead of
            // producing a `NaN`. `@ydinjs/drag` clamps in the same order for
            // the same reason.
            motion.x = Math.min(
              Math.max(motion.x, box.left - originRect.left),
              box.right - originRect.right,
            );
            motion.y = Math.min(
              Math.max(motion.y, box.top - originRect.top),
              box.bottom - originRect.bottom,
            );
          },

          /** Staleness only — **lazy by contract**, so it reads no geometry. */
          invalidate(): void {
            stale = true;
          },

          retire(): void {
            rect = null;
            stale = true;
          },
        },
      };
    },
  };
}
