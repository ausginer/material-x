/**
 * Public entrypoint for the behavior-agnostic kernel.
 *
 * **Frozen surface** (contract 03 §The export topology this requires). What is
 * exported here is `draggable`, the classified-failure vocabulary, and the four
 * behavior-agnostic types the public shapes structurally depend on. Everything
 * the kernel and a behavior say to each other — `BehaviorSpec`, `KernelHost`,
 * `Transition`, every scope and every seam type — is internal and unstable, and
 * reaches no entry module.
 *
 * `DragErrorContext` is deliberately **not** here despite the contract's
 * original table: it carries `domain: ReorderTransactionResult`, a sortable
 * result, and `draggable()` lives on its own entry precisely so a future
 * free-drag consumer need not reach the sortable behavior. It ships from
 * `sortable.js` instead; the kernel half of it, `FailureStage`, is here.
 */
import { createKernel } from './kernel/kernel.ts';
import { type Behavior, unbrandBehavior } from './kernel/spec.ts';

export type { Behavior } from './kernel/spec.ts';
export type { Point } from './kernel/types.ts';
export type { DOMRealm } from './kernel/realm.ts';

/**
 * The stages, as **values as well as a type**. `onError` receives a
 * `FailureStage` and a consumer has to be able to switch on it; exporting the
 * type while keeping the constants internal would be the same contradiction
 * the opaque feature brand exists to avoid (contract 03 §The public/internal
 * boundary).
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
  FAILURE_PRESENTATION_READY,
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
 * `Controller` is inferred from the argument; the consumer names it nowhere.
 * The behavior's frame part is erased at the brand (D-30) — it is a private
 * type of the behavior, and the composed frame type exists only inside the
 * kernel, where `Object.assign`'s `T & U` typing produces it with no cast.
 */
export function draggable<Controller>(
  root: HTMLElement,
  behavior: Behavior<Controller>,
): Controller {
  const kernel = createKernel<object>(root);
  const { spec, controller } = unbrandBehavior(behavior)(kernel.host);

  kernel.arm(spec);
  return controller;
}
