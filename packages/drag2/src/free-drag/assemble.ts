/**
 * Construction-time assembly: a merged config in, one `FreeDragSlots` in flat
 * form out (contract 03 §Assembly, applied to the second behavior).
 *
 * **The contribution objects are dropped.** After `assemble()` returns, the only
 * things that exist are the slot fields and the closures they hold — the
 * contribution objects and every reference to either are garbage. That is what
 * makes an installer's private state unreachable from the behavior, the kernel,
 * or a sibling installer.
 *
 * **Zero construction-time throws of its own** (07 §Validation, D-77, D-146),
 * and since F-134 the sentence is exact. The last explicit one was `claim`'s
 * single-writer collision, and it is gone with the discovery it arbitrated:
 * `constrain` is producible from `bounds` and `startLanding` from `landing`, so
 * a second writer is a compile error rather than an invariant no signature could
 * state. Every slot this behavior reads is nullable, so nothing here
 * dereferences a required member either: **only an installer's own body can
 * throw**, and the unwind bracket below is what covers it.
 */
import type { Disposer } from '../kernel/lifetimes.ts';
import { LIFT_FAITHFUL } from '../kernel/presentation.ts';
import type { LandingStart } from '../kernel/spec.ts';
import type { FeatureContext } from '../shared/composition.ts';
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
  let startLanding: LandingStart | null = null;
  const retireHooks: Disposer[] = [];

  // The library is the only producer of a context, so it is the only place the
  // brand is stamped. `as` emits nothing: every call below is `install(context)`
  // (D-138).
  const branded = context as FreeDragFeatureContext;

  try {
    // **Installation order is schema order** (D-57), written out rather than
    // driven by a loop over a heterogeneous array (D-146): named capability
    // keys first, in the order the schema declares them, then plugins in array
    // order, and every reader of `retireHooks` walks it backwards. Fragment order survives
    // only inside `plugins`, and recovering a first-appearance order would mean
    // recording which fragment each slot arrived from — exactly the provenance
    // D-45 deleted.
    //
    // Cleanup is recorded as each installer returns, before the next one runs,
    // so a later installer's throw unwinds every earlier one.
    if (config.bounds) {
      const bounds = config.bounds(branded);

      ({ constrain } = bounds);

      // **Guarded, though the type declares `constrain` required** (F-134).
      // The sortable's twin carries the same guard and the same reason: a
      // JS-authored installer that returns none must not fail *here*, where
      // the unwind has nothing recorded for this installer yet, so its own
      // `retire` below would never run. Where the two behaviors then differ is
      // what the flat record does — the sortable dereferences its insertion
      // and throws, free drag's slot is nullable and the composition simply
      // has no constraint, exactly as a `landing` installer that returns no
      // `startLanding` already does.
      if (constrain) {
        retireHooks.push(constrain.retire);
      }

      if (bounds.retire) {
        retireHooks.push(bounds.retire);
      }
    }

    if (config.landing) {
      const landing = config.landing(branded);

      ({ startLanding } = landing);

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

    // **The flat slot record is built inside the unwind bracket** (D-77, D-80,
    // 03 §Assembly). Nothing in it can throw for this behavior — free drag has
    // no required slot at the record and therefore no dereference standing in
    // for a deleted check — but the placement is normative, and a record built
    // after the bracket would silently stop being covered the day a slot here
    // does acquire one.
    const slots: FreeDragSlots = {
      // **Not validated as a function** (D-77). The type says `OnDrop`; a JS
      // consumer that passes something else meets a designed path — a release
      // with nothing to ask throws in the settlement seam, classified
      // `FAILURE_RESOLUTION`, with the drag canceled and the visual restored.
      onDrop: config.onDrop,

      handle: config.handle ?? null,
      visual: config.visual ?? null,
      home: config.home ?? null,

      onStart: config.onStart ?? null,
      onMove: config.onMove ?? null,
      onEnd: config.onEnd ?? null,
      onError: config.onError ?? null,

      // Carried unresolved: a source is read at activation and on
      // `invalidate()`, so resolving here would make it fixed policy (D-71).
      axis: config.axis ?? DEFAULT_AXIS,
      // **The domain check is deleted, the default is not** (D-77). A `NaN`
      // threshold makes the travel test permanently false, so the drag never
      // activates and **no operation starts** — the consumer's own drag is
      // broken and no library invariant moves.
      threshold: config.threshold ?? DEFAULT_THRESHOLD,
      // **The config slot is the kernel's own vocabulary** (D-141): there is
      // no string domain to translate, so there is no table, no second name for
      // each mode and no unmapped value to fall through.
      liftMode: config.lift ?? LIFT_FAITHFUL,

      constrain,
      startLanding,
      retireHooks,
    };

    // **Stored in installation order and walked backwards by every reader**
    // (D-147). The published guarantee is about execution order; a `reverse()`
    // here would be a second representation of it, with a mutation between the
    // two — which is the shape D-39's undo ledger next door already avoids.
    return slots;
  } catch (error) {
    // A later installer must not leak an earlier installer's state. Installers are externally inert, so this is a
    // retention and diagnostics concern rather than a DOM leak — but the unwind
    // is stated as total, so it is total.
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
