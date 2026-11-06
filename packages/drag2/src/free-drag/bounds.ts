/**
 * `bounds()`: the containment capability. A third party can fill its slot
 * instead of the first-party one, not beside it.
 *
 * It is a capability installer and not a config key: it owns a resolved rect, a
 * staleness rule and a source it re-reads, so a composition without it carries
 * neither the resolver nor the clamp.
 *
 * The no-argument form is the viewport; there is no sentinel to export.
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
       * The resolved bounds, copied into a record this feature owns. A thunk's
       * rect is the consumer's object, and the clamp reads the bounds on every
       * later sample, after behavior or consumer code has run. The copy is
       * taken once per resolve, into storage allocated once per installation,
       * so no sample allocates and none reads the consumer's object.
       *
       * A flag and not a version counter: there is one reader and one
       * invalidator, so a counter would carry a number nothing compares.
       */
      const box = { left: 0, top: 0, right: 0, bottom: 0 };
      let bounded = false;
      let stale = true;

      /**
       * Resolves lazily, on the first `apply` after a staleness mark, and not
       * inside `invalidate()`. Scroll and resize raise staleness many times a
       * second, and each resolve is a layout read or a consumer call, so
       * resolving eagerly would put both on the scroll path.
       *
       * So a garbage source surfaces at whichever behavior call next renders,
       * which is not one fixed call. The rect starts stale, so the first
       * resolve of every operation is at `activation.effect`, which places the
       * visual at the accumulated grab delta. That is `FAILURE_ACTIVATION`, the
       * path a bad source almost always takes. After a staleness mark, the next
       * `apply` is whichever of `moved` (`FAILURE_RENDERER_WRITE`), a
       * `TAG_POSITION` effect (`FAILURE_ACTION_EFFECT`) or `release.prepare`
       * (`FAILURE_RELEASE`) runs first. One bad source can report several
       * stages, and this is intended: a stage says where the library was, so
       * the same fault reports a different stage at each call, and none of them
       * names the consumer.
       *
       * `FAILURE_ACTION_PREPARE` cannot be reached from here: `invalidate()` is
       * a staleness flag that calls nothing, so the action that marks the rect
       * stale never resolves it.
       */
      const resolve = (): typeof box | null => {
        if (!stale) {
          return bounded ? box : null;
        }

        stale = false;

        if (source === undefined) {
          // The viewport of the owning realm and not the ambient global, so a
          // controller inside an iframe is contained by that document's
          // viewport.
          box.left = 0;
          box.top = 0;
          box.right = realm.window.innerWidth;
          box.bottom = realm.window.innerHeight;
          bounded = true;

          return box;
        }

        const read =
          typeof source === 'function'
            ? source()
            : source.getBoundingClientRect();

        if (!read) {
          bounded = false;

          return null;
        }

        // Read every field before writing any, so a throwing accessor leaves
        // the previous bounds whole.
        const { left, top, right, bottom } = read;

        box.left = left;
        box.top = top;
        box.right = right;
        box.bottom = bottom;
        bounded = true;

        return box;
      };

      return {
        constrain: {
          /**
           * One indirect call per committed sample, and it allocates nothing:
           * the clamped scalars are written back into the draft the behavior
           * owns and passes by reference.
           *
           * The clamp works on the origin-relative delta, the space
           * `lift.write` consumes. So the visual's rect stays inside the bounds
           * rect without either side building a point.
           */
          apply(motion: MotionDraft, view: ConstraintView): void {
            const box = resolve();

            if (!box) {
              return;
            }

            const { originRect } = view;
            // Apply the lower clamp first, so a bounds box smaller than the
            // visual pins deterministically to the far edge and does not
            // produce a `NaN`. `@ydinjs/drag` clamps in the same order for the
            // same reason.
            motion.x = Math.min(
              Math.max(motion.x, box.left - originRect.left),
              box.right - originRect.right,
            );
            motion.y = Math.min(
              Math.max(motion.y, box.top - originRect.top),
              box.bottom - originRect.bottom,
            );
          },

          /** Staleness only. Lazy by contract, so it reads no geometry. */
          invalidate(): void {
            stale = true;
          },

          retire(): void {
            bounded = false;
            stale = true;
          },
        },
      };
    },
  };
}
