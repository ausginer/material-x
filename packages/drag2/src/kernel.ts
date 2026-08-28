/**
 * Public entrypoint for the **kernel tier**.
 *
 * This is where a behavior is authored. `draggable()` and the classification
 * vocabulary live here because they are what a *behavior author* needs, and an
 * ordinary consumer needs neither: `sortable()` returns its controller
 * directly, and the stage vocabulary an ordinary consumer *does* read reaches
 * it from `drag.js` rather than from here. What is authored here is the
 * behavior that *raises* a classified failure; receiving one requires nothing
 * from this tier.
 *
 * The shared vocabulary — `DraggableError`, `Point`, `DOMRealm` — is **not**
 * here. It belongs to neither tier, so it has its own root rather than lodging
 * in whichever tier also happens to need it (`drag.js`).
 *
 * ## What this entry publishes
 *
 * > A name is published here **if and only if** it is in the structural closure
 * > of `BehaviorFactory`, or the SPI hands a behavior a value whose domain it >
 * could not otherwise name.
 *
 * The values matter as much as the types: `config.liftMode` needs a `LIFT_*`,
 * `settlement.prepare` needs the `SETTLED_*` arms to discriminate its input,
 * and the terminal fallback needs `AT_PROPOSAL`/`AT_CONSUMER`. An erased type
 * cannot fill a value position, and no path under `kernel/` is a declared
 * package export, so this entry is the only specifier that reaches them.
 *
 * **Published is not must-name.** A behavior whose seams sit inline in one
 * object literal is contextually typed throughout and names three to eight
 * things; one whose seams live in their own modules names about thirty. The
 * closure is published so the second style is *possible*, not so anyone types
 * it.
 *
 * **Six names are published from two entries, from one declaration each.**
 * `Disposer`, `LandingStart`, `LandingContext` and `LandingHandle` are also
 * published at `sortable/feature.js`, and `CancelStage`/`AT_*` at
 * `sortable.js`; all six are declared under `kernel/`, so the tier that owns
 * them is this one. The direction is the point:
 * `SettlementScope.holdForLanding` is kernel SPI, so a kernel-tier author
 * reaching `sortable/feature.js` for `LandingStart` would be importing the
 * sortable behavior in order to author a **non**-sortable one.
 *
 * **What is deliberately absent** is the other half of the decision: the seam
 * driver and its outcomes, the full `Lifetime`, the frame helpers, the lift
 * acquisition, the reporter, the invalidation utilities and the protocol event
 * names. The rule that excludes them is *the kernel never hands one to a
 * behavior and never accepts one from it*. The one honest gap is
 * `pathOwnsInteraction`, which a third-party behavior wanting the library's
 * opt-out scan must reimplement; it is a policy helper rather than SPI
 * vocabulary.
 */
import { createKernel } from './kernel/kernel.ts';
import type { BehaviorFactory } from './kernel/spec.ts';

/**
 * **The SPI's own types, and the closure of `BehaviorFactory`.** Publishing a
 * type publishes everything it structurally names, so the only ways to make
 * this list shorter are to make `BehaviorSpec` smaller or to accept its
 * closure; the closure is accepted, because every candidate for elimination is
 * a name a behavior of the sortable's size writes out of line.
 *
 * `ActionTransition` is re-exported through this module from **one**
 * declaration, in `kernel/seams.ts`: publishing one copy while the driver
 * consumes another is an identity hazard. It is the only type that needs the
 * treatment, because a non-discardable seam fails by throwing, like every other
 * seam.
 */
export type {
  ActionTransition,
  ActivationScope,
  AdmissionSubject,
  BehaviorConfig,
  BehaviorFactory,
  BehaviorInstall,
  BehaviorSpec,
  CommandAdmission,
  KernelHost,
  LandingContext,
  LandingHandle,
  LandingStart,
  PreparedSettlement,
  ReleaseTransition,
  ResolutionCommand,
  SettlementInput,
  SettlementScope,
  SettlementTransition,
} from './kernel/spec.ts';
export type { Transition } from './kernel/seams.ts';
export type {
  Draft,
  Frame,
  FramePartOf,
  KernelFrame,
  OperationIdentity,
} from './kernel/frames.ts';
export type { Disposer, LifetimeScope } from './kernel/lifetimes.ts';
/**
 * **The lift capability and the session it projects.**
 *
 * `BehaviorLiftSession` is what `ActivationScope.lift` and `moved`'s second
 * argument are typed as, so it is published under the same rule as everything
 * else on this list: the discriminating test is whether *the kernel hands one
 * to a behavior*, and the kernel hands this one to every behavior twice. Its
 * own definition names `VisualLiftSession`, which therefore stays published as
 * well — a `Pick` whose source a consumer cannot name is not a type a consumer
 * can name.
 *
 * `InheritedSpace` joins them for the same reason and by the same test:
 * `ActivationScope.inheritedSpace` is typed as it, so the scope's closure runs
 * through it and the rule — a tier publishes every name its own surface reaches
 * — applies unchanged.
 */
export type {
  BehaviorLiftSession,
  InheritedSpace,
  VisualLiftSession,
} from './kernel/presentation.ts';
export type { OffsetBox } from './kernel/types.ts';

/**
 * **The lift modes, as values.** `BehaviorConfig.liftMode` is mandatory and has
 * no default, so a behavior cannot be *constructed* without one — and an erased
 * type cannot fill a value position, so without this export the tier would be
 * authorable in no style at all rather than merely awkward to annotate.
 */
export {
  LIFT_FAITHFUL,
  LIFT_FLAT,
  LIFT_IN_PLACE,
  type LiftMode,
} from './kernel/presentation.ts';

/**
 * **The settlement inputs, as values.** The behavior discriminates its own
 * input and the switch must be exhaustive, so these are produced by the author,
 * not merely read.
 */
export {
  SETTLED_CANCELED,
  SETTLED_FAILED,
  SETTLED_FULFILLED,
  SETTLED_REJECTED,
  SETTLED_SKIPPED,
} from './kernel/spec.ts';

/**
 * **The eight phases, as values.** `Draft` and `Frame` carry `phase` and a
 * behavior reads it — in seams the kernel calls at times the behavior cannot
 * predict, like `command.admit` on any bound event — and `KernelHost.closed`
 * answers liveness, never *where in the operation this is*.
 *
 * All eight, not a useful subset: a numeric union whose members are unnameable
 * is not a public type, and an ordering test like `phase >= RELEASING` is only
 * meaningful over the whole vocabulary.
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
 * The stages, as **values as well as a type**. A behavior author calls
 * `host.fail(stage, error)` and cannot do so without naming one, so the tier
 * that depends on the vocabulary publishes it.
 *
 * `drag.js` re-exports the same declaration, because `DraggableError.stage`
 * carries a stage to an ordinary consumer — who still never imports this entry.
 */
export {
  FAILURE_ACTION_EFFECT,
  FAILURE_ACTION_PREPARE,
  FAILURE_ACTIVATION,
  FAILURE_ADMISSION,
  FAILURE_INVALIDATION,
  FAILURE_LANDING_CREATE,
  FAILURE_LANDING_INTERRUPTED,
  FAILURE_RELEASE,
  FAILURE_RENDERER_WRITE,
  FAILURE_RESOLUTION,
  FAILURE_SCHEDULED_FRAME,
  FAILURE_TERMINAL_CALLBACK,
  type FailureStage,
} from './kernel/failures.ts';

/**
 * **The cancellation stages, at the tier that declares them.** A behavior
 * *reads* one off a `SETTLED_CANCELED` input and **writes** one into the
 * terminal fallback, so this is produced vocabulary, not just consumed.
 *
 * `sortable.js` keeps publishing the same two constants and the same type — a
 * `CanceledReorderResult` carries one and an ordinary consumer has to
 * discriminate it — as a re-export of this declaration. Two entries, one
 * declaration; the ordinary consumer never reaches the kernel for it, and the
 * kernel-tier author never reaches the sortable.
 */
export {
  AT_CONSUMER,
  AT_PROPOSAL,
  type CancelStage,
} from './kernel/failures.ts';

/**
 * Creates one controller.
 *
 * The factory is called with the kernel host and returns both halves at once:
 * the behavior needs `cancel`/`destroy` to build its controller, and the kernel
 * needs the spec before it can arm ingress. Ingress is armed exactly once,
 * after the factory has returned, so no input can be admitted before then.
 *
 * `Controller` is inferred from the argument and is named nowhere else. The
 * behavior's frame part is erased at the factory's return position — it is a
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
  const kernel = createKernel<Part, Activation>(root);
  const { spec, controller } = behavior(kernel.host);

  kernel.arm(spec);
  return controller;
}
