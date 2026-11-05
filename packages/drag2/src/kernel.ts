/**
 * Public entrypoint for the kernel tier.
 *
 * A behavior is authored here. `draggable()` and the classification vocabulary
 * are here because a behavior author needs them and an ordinary consumer needs
 * neither: `sortable()` returns its controller directly, and the stage
 * vocabulary an ordinary consumer does read comes from `drag.js`. What is
 * authored here is the behavior that raises a classified failure. Receiving one
 * requires nothing from this tier.
 *
 * The shared vocabulary (`DraggableError`, `Point`, `DOMRealm`) is not here. It
 * belongs to neither tier, so it has its own root, `drag.js`, and does not sit
 * in whichever tier also happens to need it.
 *
 * ## What this entry publishes
 *
 * > A name is published here if and only if it is in the structural closure
 * > of `BehaviorFactory`, or the SPI gives a behavior a value whose domain it
 * > could not otherwise name.
 *
 * The values matter as much as the types: `config.liftMode` needs a `LIFT_*`,
 * `settlement.prepare` needs the `SETTLED_*` arms to discriminate its input,
 * and the terminal fallback needs `AT_PROPOSAL`/`AT_CONSUMER` and
 * `CANCEL_FAILED`. An erased type cannot fill a value position, and no path
 * under `kernel/` is a declared package export, so this entry is the only
 * specifier that reaches them.
 *
 * Published does not mean a behavior must name it. A behavior whose transitions
 * and callbacks are inline in one object literal is contextually typed
 * throughout and names only a few things. One whose transitions and callbacks
 * are in their own modules names most of the closure. The closure is published
 * so that the second style is possible, not so that anyone types it.
 *
 * Several names are published from two entries, from one declaration each.
 * `Disposer` and `LandingTail` are also published at `sortable/feature.js`, and
 * `CancelStage`/`AT_*`, with `CancelOrigin` and its four constants, at
 * `sortable.js`. All of them are declared under `kernel/`, so this tier owns
 * them. The direction matters: `BehaviorSpec.landingTail` is kernel SPI, so a
 * kernel-tier author reaching `sortable/feature.js` for `LandingTail` would
 * import the sortable behavior in order to author a non-sortable one.
 *
 * Other names are absent from this entry: `BehaviorRunner` and its outcomes,
 * the full `Lifetime`, the frame helpers, the lift acquisition, the reporter,
 * the invalidation utilities and the protocol event names. The rule that
 * excludes them is that the kernel never gives one to a behavior and never
 * accepts one from it. The one gap is `pathOwnsInteraction`, which a
 * third-party behavior wanting the library's opt-out scan must reimplement. It
 * is a policy helper and not SPI vocabulary.
 */
import { Kernel } from './kernel/kernel.ts';
import type { BehaviorFactory } from './kernel/spec.ts';

/**
 * The SPI's own types, and the closure of `BehaviorFactory`. Publishing a type
 * publishes everything it structurally names, so the only ways to shorten this
 * list are to make `BehaviorSpec` smaller or to accept its closure. The closure
 * is accepted, because every candidate for elimination is a name a behavior of
 * the sortable's size writes out of line.
 *
 * `ActionTransition` is re-exported through this module from one declaration,
 * in `kernel/behavior-runner.ts`. Publishing one copy while `BehaviorRunner`
 * consumes another would be an identity hazard.
 */
export type {
  ActionTransition,
  ActivationScope,
  AdmissionSubject,
  BehaviorConfig,
  BehaviorContext,
  BehaviorFactory,
  BehaviorInstall,
  BehaviorSpec,
  CommandAdmission,
  LandingTail,
  PreparedSettlement,
  ReleaseTransition,
  ResolutionCommand,
  SettlementInput,
  SettlementTransition,
} from './kernel/spec.ts';
export type { Transition } from './kernel/behavior-runner.ts';
export type {
  Draft,
  Frame,
  FramePartOf,
  KernelFrame,
  OperationIdentity,
} from './kernel/frames.ts';
export type { Disposer, LifetimeScope } from './kernel/lifetimes.ts';
/**
 * The lift capability and the session it projects.
 *
 * `ActivationScope.lift` and `moved`'s second argument are typed as
 * `BehaviorLiftSession`, so it is published under the same rule as everything
 * else on this list: the test is whether the kernel gives one to a behavior,
 * and the kernel gives this one to every behavior twice. Its definition names
 * `VisualLiftSession`, which therefore stays published as well: a consumer
 * cannot name a `Pick` whose source it cannot name.
 *
 * `InheritedSpace` is published by the same test. `ActivationScope.visualSpace`
 * and `ActivationScope.itemSpace` are both typed as it, so the scope's closure
 * reaches it, and a tier publishes every name its own surface reaches.
 */
export type {
  BehaviorLiftSession,
  InheritedSpace,
  VisualLiftSession,
} from './kernel/presentation.ts';
export type { OffsetBox } from './kernel/types.ts';

/**
 * The lift modes, as values. `BehaviorConfig.liftMode` is mandatory and has no
 * default, so a behavior cannot be constructed without one, and an erased type
 * cannot fill a value position. Without this export, the tier could not be
 * authored in any style.
 */
export {
  LIFT_FAITHFUL,
  LIFT_FLAT,
  LIFT_IN_PLACE,
  type LiftMode,
} from './kernel/presentation.ts';

/**
 * The settlement inputs, as values. The behavior discriminates its own input
 * and the switch must be exhaustive, so the author produces these and does not
 * only read them.
 */
export {
  SETTLED_CANCELED,
  SETTLED_FAILED,
  SETTLED_FULFILLED,
  SETTLED_REJECTED,
  SETTLED_SKIPPED,
} from './kernel/spec.ts';

/**
 * The eight phases, as values. `Draft` and `Frame` carry `phase` and a behavior
 * reads it in code the kernel calls at times the behavior cannot predict, like
 * `command.admit` on any bound event. It says where in the operation this is,
 * never whether the controller is alive.
 *
 * All eight are published, not a useful subset: a numeric union whose members
 * cannot be named is not a public type, and an ordering test like
 * `phase >= RELEASING` is only meaningful over the whole vocabulary.
 */
export {
  ACTIVATING,
  ACTIVE,
  FINALIZING,
  IDLE,
  PENDING,
  RELEASING,
  REPORTING,
  SETTLING,
  type Phase,
} from './kernel/phases.ts';

/**
 * The stages, as values as well as a type. A behavior author calls
 * `kernel.fail(stage, error)` and cannot do so without naming one, so the tier
 * that depends on the vocabulary publishes it.
 *
 * `drag.js` re-exports the same declaration, because `DraggableError.stage`
 * carries a stage to an ordinary consumer, who still never imports this entry.
 */
export {
  FAILURE_ACTION_EFFECT,
  FAILURE_ACTION_PREPARE,
  FAILURE_ACTIVATION,
  FAILURE_ADMISSION,
  FAILURE_INVALIDATION,
  FAILURE_RELEASE,
  FAILURE_RENDERER_WRITE,
  FAILURE_RESOLUTION,
  FAILURE_SCHEDULED_FRAME,
  FAILURE_TERMINAL_CALLBACK,
  type FailureStage,
} from './kernel/failures.ts';

/**
 * The cancellation stages, at the tier that declares them. A behavior reads one
 * off a `SETTLED_CANCELED` input and writes one into the terminal fallback, so
 * the behavior produces this vocabulary as well as consuming it.
 *
 * `sortable.js` also publishes the same two constants and the same type, as a
 * re-export of this declaration, because a `CanceledReorderResult` carries one
 * and an ordinary consumer has to discriminate it. There are two entries and
 * one declaration. The ordinary consumer never reaches the kernel for it, and
 * the kernel-tier author never reaches the sortable.
 */
export {
  AT_CONSUMER,
  AT_PROPOSAL,
  type CancelStage,
} from './kernel/failures.ts';

/**
 * The cancellation origins, at the tier that declares them. A behavior reads
 * one off a `SETTLED_CANCELED` input and writes `CANCEL_FAILED` into the
 * terminal fallback that gives a classified failure a result, so the behavior
 * produces this vocabulary, as it does the stages.
 *
 * `sortable.js` and `free-drag.js` re-export the same declaration, on the same
 * route as `CancelStage`: `origin` is a field of a behavior-owned result and
 * its sibling is published there, so splitting the two would give the consumer
 * one vocabulary at two entries.
 */
export {
  CANCEL_ABORTED,
  CANCEL_FAILED,
  CANCEL_INTERRUPTED,
  CANCEL_SUPPLIED,
  type CancelOrigin,
} from './kernel/failures.ts';

/**
 * Creates one controller.
 *
 * The factory is called with the kernel, narrowed to {@link BehaviorContext},
 * and returns both parts at once: the behavior needs
 * `requestCancel`/`requestDestroy` to build its controller, and the kernel
 * needs the spec before it can arm its input listeners. The listeners are armed
 * exactly once, after the factory has returned, so no input can be admitted
 * before then.
 *
 * `Controller` is inferred from the argument and is named nowhere else. The
 * behavior's frame part is erased at the factory's return position: it is a
 * private type of the behavior, and the composed frame type exists only inside
 * the kernel.
 */
export function draggable<
  Controller,
  Part extends object,
  Activation extends {} = true,
>(
  root: HTMLElement,
  behavior: BehaviorFactory<Controller, Part, Activation>,
): Controller {
  // `construct` narrows the type structurally. `behavior` declares
  // `BehaviorContext`, so what a behavior holds is the kernel under the
  // narrower type, and `construct` is not on that type. `LifetimeScope` uses
  // the same arrangement one tier down.
  return new Kernel<Part, Activation>(root).construct(behavior);
}
