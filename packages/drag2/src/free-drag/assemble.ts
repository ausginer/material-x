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
 * **Zero construction-time throws of its own** (07 §Validation, D-77). The one
 * throw here is `claim`'s single-writer collision, which is an invariant over
 * what installers *contribute* — the only category D-77 leaves at runtime,
 * because no signature can state it.
 */
import type { Disposer } from '../kernel/lifetimes.ts';
import {
  LIFT_FAITHFUL,
  LIFT_FLAT,
  LIFT_IN_PLACE,
  type LiftMode,
} from '../kernel/presentation.ts';
import type { LandingStart } from '../kernel/spec.ts';
import type { FeatureContext } from '../shared/composition.ts';
import type { FreeDragConfig } from './config.ts';
import type { FreeDragLift } from './domain.ts';
import type {
  FreeDragFeatureContext,
  FreeDragInstaller,
  MotionConstraint,
} from './feature.ts';
import {
  DEFAULT_AXIS,
  DEFAULT_THRESHOLD,
  type FreeDragSlots,
} from './slots.ts';

/**
 * **A total map, not a check** (D-73, 07 §Validation). Adding a mode without a
 * mapping does not compile, which is D-64's `STAGE_TO_CODE` precedent — this
 * package already treats a total `Record` as the way to make a mapping total,
 * rather than a runtime domain test plus a fallback branch.
 *
 * A JS consumer passing an unknown string reaches `undefined` here and gets
 * whichever branch `presentation.ts` falls through to. That is consumer-owned
 * and nothing fails, which is exactly what the silent table promises.
 */
const LIFT_MODES: Readonly<Record<FreeDragLift, LiftMode>> = {
  faithful: LIFT_FAITHFUL,
  flat: LIFT_FLAT,
  'in-place': LIFT_IN_PLACE,
};

/**
 * Single-writer enforcement, checked with the full contribution in hand so the
 * diagnostic can name the slot rather than only the second writer's position.
 *
 * The identity names the duplication rather than a tier, because the pair is
 * not always two plugins — it can be a plugin against `bounds()` — and a
 * diagnostic that guesses wrong is worse than one that does not guess.
 */
const claim = <T>(
  current: T | null,
  next: T | undefined,
  label: string,
): T | null => {
  if (next === undefined) {
    return current;
  }

  if (current !== null) {
    throw new TypeError(`drag: free-drag/duplicate-contribution ${label}`);
  }

  return next;
};

export function assemble(
  config: FreeDragConfig,
  context: FeatureContext,
): FreeDragSlots {
  let constrain: MotionConstraint | null = null;
  let startLanding: LandingStart | null = null;
  const retireHooks: Disposer[] = [];

  // **Installation order is schema order** (D-57): named capability slots
  // first, in the order the schema declares them, then plugins in array order;
  // `retireHooks` reverses the whole sequence. Fragment order survives only
  // inside `plugins`, and recovering a first-appearance order would mean
  // recording which fragment each slot arrived from — exactly the provenance
  // D-45 deleted.
  const installers: ReadonlyArray<FreeDragInstaller | undefined> = [
    config.bounds,
    config.landing,
    ...(config.plugins ?? []),
  ];

  try {
    for (const install of installers) {
      if (install === undefined) {
        continue;
      }

      // The library is the only producer of a context, so it is the only place
      // the brand is stamped. `as` emits nothing: the call is `install(context)`
      // (D-138).
      const contribution = install(context as FreeDragFeatureContext);

      // Cleanup is recorded **first**, before any claim can throw, and in
      // installation order. Recording it after the claim would leak the private
      // state of the very contribution whose claim collided — a second
      // constraint has already resolved its rect by the time `claim` throws,
      // and the unwind would only see the earlier contributions.
      if (contribution.constrain) {
        retireHooks.push(contribution.constrain.retire);
      }

      if (contribution.retire) {
        retireHooks.push(contribution.retire);
      }

      constrain = claim(constrain, contribution.constrain, 'motion constraint');
      startLanding = claim(startLanding, contribution.startLanding, 'landing');
    }

    // **The flat slot record is built inside the unwind bracket** (D-77, D-80,
    // 03 §Assembly). Nothing in it can throw for this behavior — free drag
    // has no required contribution and therefore no dereference standing in for
    // a deleted check — but the placement is normative, and a record built
    // after the bracket would silently stop being covered the day a slot here
    // does acquire one.
    const slots: FreeDragSlots = {
      // **Not validated as a function** (D-77). The type says `OnDrop`; a JS
      // consumer that passes something else meets a designed path — a release
      // with nothing to ask is a `SeamRejection`, classified `FAILURE_RESOLUTION`
      // → `consumer`, with the drag canceled and the visual restored.
      onDrop: config.onDrop,

      getHandle: config.handle ?? null,
      getVisual: config.visual ?? null,
      getHome: config.home ?? null,

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
      liftMode: LIFT_MODES[config.lift ?? 'faithful'],

      constrain,
      startLanding,
      retireHooks,
    };

    // Reversed exactly once, and **after** the record is built rather than
    // before: the record holds this very array, so the reverse still reaches
    // it — while the unwind above, which walks backwards, keeps seeing
    // installation order for as long as anything can still throw.
    retireHooks.reverse();

    return slots;
  } catch (error) {
    // A later installer or a claim collision must not leak an earlier
    // installer's state. Installers are externally inert, so this is a
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
