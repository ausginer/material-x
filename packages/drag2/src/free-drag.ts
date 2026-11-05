/**
 * Public entrypoint for the free-drag behavior: the ordinary tier.
 *
 * A consumer that drags one element freely imports this entry, plus `drag.js`
 * for `instanceof DraggableError`, and nothing else. `freeDrag()` takes the
 * item, calls `draggable()` internally and returns its controller, so neither
 * the kernel tier nor the installer tier is on the ordinary path. The consumer
 * never names `draggable`, never holds a behavior value and never needs to know
 * that a kernel tier exists.
 *
 * The vocabulary uses `drag`, not `drop`. The drop is an event inside the drag.
 * The drag is what is configured, controlled and named, so it names the entry,
 * the function, the controller and the type family. `onDrop` keeps its name
 * because that slot really is about the drop.
 *
 * `FreeDragConfig` and every alias it names are exported from here. A config
 * slot that a consumer can fill, but whose value the consumer cannot move out
 * of the object literal into a typed `const`, is not a writable surface. The
 * set of types this requires is scoped by tier: it resolves within
 * `free-drag.js ∪ drag.js ∪ free-drag/feature.js`. So `ConstraintInstaller`,
 * `FreeDragLandingInstaller` and `FreeDragPlugin` ship from here, and the names
 * they reach stay declared at the middle tier, one import away for an author
 * who wants them.
 */
import { createComposedFreeDragBehavior } from './free-drag/behavior.ts';
import type { FreeDragConfig } from './free-drag/config.ts';
import type { FreeDragController } from './free-drag/controller.ts';
import type {
  ConstraintContribution,
  FreeDragPluginContribution,
  LandingContribution,
} from './free-drag/feature.ts';
import { draggable } from './kernel.ts';
import type { Composed, UniqueSlot } from './shared/composition.ts';

export type { FreeDragController } from './free-drag/controller.ts';
export type {
  FreeDragConfig,
  FreeDragOnDragError,
  FreeDragOnEnd,
  FreeDragOnStart,
  OnMove,
  ResolveElement,
  ResolveHandle,
} from './free-drag/config.ts';
/**
 * The aliases of the three capability slots. `FreeDragConfig` names each of
 * them: `bounds?` by `ConstraintInstaller`, `landing?` by
 * `FreeDragLandingInstaller`, `plugins?` by `FreeDragPlugin`. A consumer
 * writing a third-party constraint must be able to store the installer in a
 * typed `const`, not only fill the slot inline. The types these aliases reach
 * (`FeatureContext`, `ConstraintContribution`, `MotionConstraint`) stay
 * declared at `free-drag/feature.js`.
 */
export type {
  ConstraintInstaller,
  FreeDragLandingInstaller,
  FreeDragPlugin,
} from './free-drag/feature.ts';
export {
  FreeDragResolution,
  type AcceptedFreeDragResult,
  type CanceledFreeDragResult,
  type DragAxis,
  type DragGeometry,
  type FreeDragRequest,
  type FreeDragSubject,
  type FreeDragTransactionResult,
  type OnDrop,
  type RejectedFreeDragResult,
  type ResolveHome,
} from './free-drag/domain.ts';
// The lift vocabulary, published where the slot that takes it is. `config.lift`
// is a `LiftMode`, and a numeric union whose members have no names is not a
// fillable slot. So the three constants are published with it, as the stage
// constants follow `FailureStage` onto `drag.js`. They are one declaration in
// `kernel/presentation.ts`, published from here and from `kernel.js`.
export {
  LIFT_FAITHFUL,
  LIFT_FLAT,
  LIFT_IN_PLACE,
  type LiftMode,
} from './kernel/presentation.ts';
/**
 * The cancellation stages, as values as well as a type, for the same reason
 * `sortable.js` re-exports them: a `CanceledFreeDragResult` carries one, and an
 * ordinary consumer must be able to discriminate it.
 */
export {
  AT_CONSUMER,
  AT_PROPOSAL,
  type CancelStage,
} from './kernel/failures.ts';

/**
 * The cancellation origins, for the same reason: a `CanceledFreeDragResult`
 * carries one, and it is the only field that says who decided. This behavior
 * creates no `reason` of its own, so for a free drag `origin` is the only
 * provenance.
 */
export {
  CANCEL_ABORTED,
  CANCEL_FAILED,
  CANCEL_INTERRUPTED,
  CANCEL_SUPPLIED,
  type CancelOrigin,
} from './kernel/failures.ts';

/**
 * The composition check, applied to one config or fragment.
 *
 * An installer may contribute only the slots that its position is read for. The
 * assembler reads `constrain` from `bounds` and `landingTiming` from `landing`,
 * by position, and the plugin loop reads only `retire`. So a constraint
 * installer passed as a plugin is not a second writer. It is one writer at a
 * position that is never read, and its capability is silently absent. This type
 * intersects a refusal into exactly those entries and leaves every legitimate
 * plugin as it is.
 *
 * This type is erased entirely. The signature of `freeDrag` names it and no
 * config slot does, so an ordinary consumer never writes it.
 */
export type FreeDragComposition<T> = T extends { plugins?: infer P }
  ? Readonly<{
      plugins?: Composed<
        P,
        // The unique slots, derived from the groups themselves: every key that
        // a sibling group declares and the plugin group does not. So a
        // capability added later joins the set by being declared. This is
        // written here and not as its own alias, because an intermediate name
        // would be a second published type whose only role is to be substituted
        // into this one.
        UniqueSlot<
          ConstraintContribution | LandingContribution,
          FreeDragPluginContribution
        >
      >;
    }>
  : unknown;

/**
 * Makes one element freely draggable.
 *
 * ```ts
 * const drag = freeDrag(item, { onDrop }, bounds(stage), landing({ duration: 200 }));
 * ```
 *
 * The first argument is the root element, where listeners bind. For a free drag
 * the root is also the item: there is no collection to search, so the element
 * the consumer names is both what the press binds to and what is dragged.
 *
 * The second argument is a complete `FreeDragConfig`. Every later argument is a
 * plain partial config, merged by slot. So a missing `onDrop` is a compile
 * error and not a runtime throw. A later fragment may replace a slot but cannot
 * clear it, because the merge skips `undefined`.
 *
 * This function throws nothing for any config the compiler accepts. Every
 * option domain the compiler already states is left to the compiler, and the
 * library does not police a value that breaks only the consumer's own drag. A
 * bad `handle`, `visual`, `onMove`, `home`, `onEnd` or bounds source surfaces
 * at the library call that uses it, classified, coded and terminating the
 * operation exactly once. A `NaN` threshold and an unknown `axis` are silent,
 * because neither ever fails. `lift` has no unknown value, because the slot
 * takes the kernel's own `LiftMode`.
 */
export function freeDrag<
  const C extends FreeDragConfig,
  const F extends ReadonlyArray<Partial<FreeDragConfig>>,
>(
  item: HTMLElement,
  config: C & FreeDragComposition<C>,
  ...fragments: { [I in keyof F]: F[I] & FreeDragComposition<F[I]> }
): FreeDragController {
  return draggable(item, createComposedFreeDragBehavior(config, fragments));
}
