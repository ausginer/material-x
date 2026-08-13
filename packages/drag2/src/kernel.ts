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
 */
import { createKernel } from './kernel/kernel.ts';
import type { BehaviorFactory } from './kernel/spec.ts';

export type {
  ActivationScope,
  AdmissionSubject,
  BehaviorConfig,
  BehaviorFactory,
  BehaviorSpec,
  CommandAdmission,
  KernelHost,
  PreparedSettlement,
  ResolutionCommand,
  SeamRejection,
  SettlementInput,
  SettlementScope,
} from './kernel/spec.ts';

/**
 * The stages, as **values as well as a type**. A behavior author calls
 * `host.fail(stage, error)` and cannot do so without naming one — the same
 * "export what the tier's public surface structurally depends on" rule the
 * contract has run on since phase 9, applied at the tier that now depends on
 * it (D-64).
 */
export {
  FAILURE_ACTIVATION,
  FAILURE_ADMISSION,
  FAILURE_INSERTION,
  FAILURE_INVALIDATION,
  FAILURE_LANDING_CREATE,
  FAILURE_LANDING_INTERRUPTED,
  FAILURE_LANDING_TARGET,
  FAILURE_PLACEHOLDER_MOVE,
  FAILURE_RELEASE,
  FAILURE_RENDERER_WRITE,
  FAILURE_REORDER_RESOLUTION,
  FAILURE_SCHEDULED_FRAME,
  FAILURE_TERMINAL_CALLBACK,
  type FailureStage,
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
export function draggable<Controller, Part extends object>(
  root: HTMLElement,
  behavior: BehaviorFactory<Controller, Part>,
): Controller {
  const kernel = createKernel<Part>(root);
  const { spec, controller } = behavior(kernel.host);

  kernel.arm(spec);
  return controller;
}
