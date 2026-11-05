/**
 * Construction-time assembly: takes a merged config and returns one
 * `FreeDragSlots` in flat form.
 *
 * The contribution objects are dropped. After `assemble()` returns, only the
 * slot fields and the closures they hold exist; the contribution objects and
 * every reference to them are garbage. So the behavior, the kernel and a
 * sibling installer cannot reach an installer's private state.
 *
 * This function has no construction-time throws of its own. `constrain` can
 * come only from `bounds` and `landingTiming` only from `landing`, so a second
 * writer is a compile error and not an invariant no signature could state.
 * Every slot this behavior reads is nullable, so nothing here dereferences a
 * required member either. Only an installer's own body can throw, and the
 * rollback below covers that.
 */
import type { Disposer } from '../kernel/lifetimes.ts';
import { LIFT_FAITHFUL } from '../kernel/presentation.ts';
import type { FeatureContext, LandingTiming } from '../shared/composition.ts';
import type { FreeDragConfig } from './config.ts';
import type { FreeDragFeatureContext, MotionConstraint } from './feature.ts';
import {
  DEFAULT_AXIS,
  DEFAULT_THRESHOLD,
  type FreeDragSlots,
} from './slots.ts';

export function assemble(
  config: FreeDragConfig,
  context: FeatureContext,
): FreeDragSlots {
  let constrain: MotionConstraint | null = null;
  let landingTiming: LandingTiming | null = null;
  const retireHooks: Disposer[] = [];

  // The library is the only producer of a context, so this is the only place
  // the brand is stamped. `as` emits nothing: every call below is
  // `install(context)`.
  const branded = context as FreeDragFeatureContext;

  try {
    // Installation order is schema order, written out and not driven by a loop
    // over a heterogeneous array: named capability keys first, in the order the
    // schema declares them, then plugins in array order. Every reader of
    // `retireHooks` walks it backwards. Fragment order survives only inside
    // `plugins`. Recovering a first-appearance order would mean recording which
    // fragment each slot came from, and the merge does not keep that.
    //
    // Cleanup is recorded as each installer returns, before the next one runs,
    // so a later installer's throw rolls back every earlier one.
    if (config.bounds) {
      const bounds = config.bounds(branded);

      ({ constrain } = bounds);

      // Guarded, though the type declares `constrain` required. The sortable's
      // equivalent has the same guard and the same reason: a JS-authored
      // installer that returns no `constrain` must not fail here. The rollback
      // has nothing recorded for this installer yet, so the installer's own
      // `retire` below would never run. The two behaviors then differ in the
      // flat record. The sortable dereferences its insertion and throws. Free
      // drag's slot is nullable, so the composition has no constraint, exactly
      // as when a `landing` installer returns no `landingTiming`.
      if (constrain) {
        retireHooks.push(constrain.retire);
      }

      if (bounds.retire) {
        retireHooks.push(bounds.retire);
      }
    }

    if (config.landing) {
      const landing = config.landing(branded);

      ({ landingTiming } = landing);

      if (landing.retire) {
        retireHooks.push(landing.retire);
      }
    }

    for (const install of config.plugins ?? []) {
      const plugin = install(branded);

      if (plugin.retire) {
        retireHooks.push(plugin.retire);
      }
    }

    // Build the flat slot record inside this `try`. Nothing in it can throw for
    // this behavior: free drag has no required slot at the record, so no
    // dereference stands in for a deleted check. A record built after the `try`
    // would silently lose the rollback if a slot here later acquires such a
    // dereference.
    const slots: FreeDragSlots = {
      // Not validated as a function. The type says `OnDrop`. A JS consumer that
      // passes something else meets a designed path: a release with nothing to
      // ask throws in the settlement transition, classified
      // `FAILURE_RESOLUTION`, with the drag canceled and the visual restored.
      onDrop: config.onDrop,

      handle: config.handle ?? null,
      visual: config.visual ?? null,
      home: config.home ?? null,

      onStart: config.onStart ?? null,
      onMove: config.onMove ?? null,
      onEnd: config.onEnd ?? null,
      onError: config.onError ?? null,

      // A plain value, fixed for the controller's life and never re-read, not
      // even by `invalidate()`.
      axis: config.axis ?? DEFAULT_AXIS,
      // There is no domain check, but there is a default. A `NaN` threshold
      // makes the travel test permanently false, so the drag never activates
      // and no operation starts. The consumer's own drag is broken, and no
      // library invariant changes.
      threshold: config.threshold ?? DEFAULT_THRESHOLD,
      // The config slot uses the kernel's own vocabulary: there is no string
      // domain to translate, so there is no table, no second name for each mode
      // and no unmapped value to fall through.
      liftMode: config.lift ?? LIFT_FAITHFUL,

      constrain,
      landingTiming,
      retireHooks,
    };

    // Stored in installation order and walked backwards by every reader. The
    // published guarantee is about execution order. A `reverse()` here would be
    // a second representation of that order, with a mutation between the two.
    return slots;
  } catch (error) {
    // A later installer must not leak an earlier installer's state. Installers
    // are externally inert, so this is a retention and diagnostics concern and
    // not a DOM leak. The rollback is stated as total, so it is total.
    for (let i = retireHooks.length - 1; i >= 0; i -= 1) {
      try {
        retireHooks[i]!();
      } catch (nested) {
        context.report(nested);
      }
    }

    throw error;
  }
}
