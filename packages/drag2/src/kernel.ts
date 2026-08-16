/**
 * Public entrypoint for the **kernel tier** (D-48).
 *
 * This is where a behavior is authored. `draggable()` and the classification
 * vocabulary live here because they are what a *behavior author* needs, and an
 * ordinary consumer needs neither: `sortable()` returns its controller
 * directly, and `onError` hands out a coarse {@link DraggableError} rather than
 * a stage (D-64).
 *
 * The shared vocabulary — `DraggableError`, `Point`, `DOMRealm` — is **not**
 * here. It belongs to neither tier, so it has its own root rather than lodging
 * in whichever tier also happens to need it (`drag.js`).
 *
 * ## What this entry publishes, and why it is this long (D-68)
 *
 * > A name is published here **if and only if** it is in the structural closure
 * > of `BehaviorFactory`, or the SPI hands a behavior a value whose domain it
 * > could not otherwise name.
 *
 * Until Revision 2.2 the entry published `draggable`, the thirteen stages and
 * twelve types — and **could not construct a behavior at all** (F-59). Every
 * missing name was a *value*: `config.liftMode` needs a `LIFT_*`,
 * `settlement.prepare` needs the `SETTLED_*` arms to discriminate its input,
 * and D-66's fallback needs `AT_PROPOSAL`/`AT_CONSUMER`. Erased types cannot
 * fill a value position, and no path under `kernel/` is a declared package
 * export, so there was no supported specifier that reached them.
 *
 * **Published is not must-name.** A behavior whose seams sit inline in one
 * object literal is contextually typed throughout and names three to eight
 * things; one whose seams live in their own modules names about thirty. The
 * closure is published so the second style is *possible*, not so anyone types
 * it.
 *
 * **Four names are re-homed, not added.** `Disposer`, `LandingStart`,
 * `LandingContext` and `LandingHandle` are published at `sortable/feature.js`
 * and `CancelStage`/`AT_*` at `sortable.js`; all six are declared under
 * `kernel/`, so the tier that owns them is this one, and each keeps its
 * existing publication as a re-export of the same declaration. The direction is
 * the point: `SettlementScope.holdForLanding` is kernel SPI, so a kernel-tier
 * author reaching `sortable/feature.js` for `LandingStart` would be importing
 * the sortable behavior in order to author a **non**-sortable one.
 *
 * **What is deliberately absent** is the other half of the decision: the seam
 * driver and its outcomes, the full `Lifetime`, the frame helpers, the lift
 * acquisition, the reporter, the invalidation utilities and the protocol event
 * names. The rule that excludes them is *the kernel never hands one to a
 * behavior and never accepts one from it*. The one honest gap is D-46's
 * input-policy helpers, which a third-party behavior wanting the library's
 * policy must reimplement; that is a policy helper rather than SPI vocabulary
 * and is a later decision.
 */
import { createKernel } from './kernel/kernel.ts';
import type { BehaviorFactory } from './kernel/spec.ts';

/**
 * **The SPI's own types, and the closure of `BehaviorFactory`** (D-68, class
 * A). Publishing a type publishes everything it structurally names, so the only
 * ways to make this list shorter are to make `BehaviorSpec` smaller or to
 * accept its closure; D-68 accepts it, because every candidate for elimination
 * is a name a behavior of the sortable's size writes out of line.
 *
 * `ActionTransition` and `SeamRejection` are re-exported through this module
 * from **one** declaration each, in `kernel/seams.ts` (F-61): both were
 * declared twice, and publishing one copy while the driver consumed the other
 * is the identity hazard 03 §The export topology exists to prevent.
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
  SeamRejection,
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
 * **The lift capability and the session it projects** (D-35, C5-01).
 *
 * `BehaviorLiftSession` is what `ActivationScope.lift` and `moved`'s second
 * argument are typed as, so it is published under the same rule as everything
 * else on this list: 02 §What stays internal's discriminating test is whether
 * *the kernel hands one to a behavior*, and the kernel hands this one to every
 * behavior twice. Its own definition names `VisualLiftSession`, which therefore
 * stays published as well — a `Pick` whose source a consumer cannot name is not
 * a type a consumer can name.
 *
 * `InheritedSpace` joins them for the same reason and by the same test (D-85):
 * `ActivationScope.inheritedSpace` is typed as it, so the scope's closure runs
 * through it and D-68's rule — a tier publishes every name its own surface
 * reaches — applies unchanged.
 */
export type {
  BehaviorLiftSession,
  InheritedSpace,
  VisualLiftSession,
} from './kernel/presentation.ts';
export type { OffsetBox } from './kernel/types.ts';

/**
 * **The lift modes, as values** (D-68, class P). `BehaviorConfig.liftMode` is
 * mandatory and has no default, so a behavior cannot be *constructed* without
 * one — which is F-59, and the sharpest form of it: an erased type cannot fill
 * a value position, so before this export the tier was authorable in no style
 * at all rather than merely awkward to annotate.
 */
export {
  LIFT_FAITHFUL,
  LIFT_FLAT,
  LIFT_IN_PLACE,
  type LiftMode,
} from './kernel/presentation.ts';

/**
 * **The settlement inputs, as values** (D-68, class P). The behavior
 * discriminates its own input and D-24 requires the switch to be exhaustive, so
 * these are produced by the author, not merely read.
 */
export {
  SETTLED_CANCELED,
  SETTLED_FAILED,
  SETTLED_FULFILLED,
  SETTLED_REJECTED,
  SETTLED_SKIPPED,
} from './kernel/spec.ts';

/**
 * **The eight phases, as values** (D-68, class I). `Draft` and `Frame` carry
 * `phase` and a behavior reads it — in seams the kernel calls at times the
 * behavior cannot predict, like `command.admit` on any bound event — and
 * `KernelHost.closed` answers liveness, never *where in the operation this is*.
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
 * **The stage → code mapping, published because D-64 makes it library-owned**
 * (D-68, class I). Publishing thirteen stages and a four-member
 * `DraggableErrorCode` without the mapping between them would make that false:
 * each behavior would re-own it, and `code` — the thing an ordinary consumer
 * switches on — would mean something different depending on which behavior
 * raised it.
 *
 * It is the one name here justified by an **obligation** rather than by
 * expressibility, and it *reduces* what an author must name: with it a behavior
 * classifies without ever naming `DraggableErrorCode` or reciting the stages.
 */
export { toDraggableError } from './kernel/errors.ts';

/**
 * The stages, as **values as well as a type**. A behavior author calls
 * `host.fail(stage, error)` and cannot do so without naming one — the same
 * "export what the tier's public surface structurally depends on" rule the
 * contract has run on since phase 9, applied at the tier that now depends on
 * it (D-64).
 */
export {
  FAILURE_ACTION_EFFECT,
  FAILURE_ACTION_PREPARE,
  FAILURE_ACTIVATION,
  FAILURE_ADMISSION,
  FAILURE_INVALIDATION,
  FAILURE_LANDING_CREATE,
  FAILURE_LANDING_INTERRUPTED,
  FAILURE_LANDING_TARGET,
  FAILURE_RELEASE,
  FAILURE_RENDERER_WRITE,
  FAILURE_RESOLUTION,
  FAILURE_SCHEDULED_FRAME,
  FAILURE_TERMINAL_CALLBACK,
  type FailureStage,
} from './kernel/failures.ts';

/**
 * **The cancellation stages, at the tier that declares them** (D-68, class P).
 * A behavior *reads* one off a `SETTLED_CANCELED` input and **writes** one into
 * D-66's terminal fallback, so this is produced vocabulary, not just consumed.
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
 * The behavior needs `cancel`/`destroy` to build its controller and the kernel
 * needs the spec before it can arm ingress. Returning both halves at once makes
 * "no input can be admitted before install returns" unexpressible rather than a
 * rule to obey (D-1): `arm()` is not on `KernelHost`, only this function holds
 * the kernel handle, and it calls `arm()` exactly once.
 *
 * **Takes a plain factory** (D-48, D-55). The opaque `Behavior<Controller>`
 * brand is withdrawn: with `sortable()` returning a controller, the brand had
 * no producer, and an exported opaque type nothing constructs is a boundary
 * marker with no boundary to mark.
 *
 * `Controller` is inferred from the argument; the consumer names it nowhere.
 * The behavior's frame part is erased at the factory's return position — it is
 * a private type of the behavior, and the composed frame type exists only
 * inside the kernel, where `Object.assign`'s `T & U` typing produces it with no
 * cast.
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
