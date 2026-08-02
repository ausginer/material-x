/**
 * Public entrypoint for the behavior-agnostic kernel.
 *
 * The public *type* surface is phase 9; what is exported here is what phase 4
 * produces. See `.agents/docs/drag/plan.md`.
 */
import { createKernel } from './kernel/kernel.ts';
import { type Behavior, unbrandBehavior } from './kernel/spec.ts';

export type {
  ActivationScope,
  Behavior,
  BehaviorInstall,
  BehaviorSpec,
  KernelHost,
  ResolutionCommand,
  SeamRejection,
} from './kernel/spec.ts';

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
