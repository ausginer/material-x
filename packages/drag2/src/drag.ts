/**
 * Public entrypoint for the behavior-agnostic kernel.
 *
 * The public *type* surface is phase 9; what is exported here is what phase 4
 * produces. See `.agents/docs/drag/plan.md`.
 */
import { createKernel } from './kernel/kernel.ts';
import type { Behavior } from './kernel/spec.ts';

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
 * Both type parameters are inferred from the argument; the consumer names
 * neither. `Part` is the behavior's frame part, not the composed frame — the
 * composed type exists only inside the kernel, where `Object.assign`'s `T & U`
 * typing produces it with no cast.
 */
export function draggable<Controller, Part extends object>(
  root: HTMLElement,
  behavior: Behavior<Controller, Part>,
): Controller {
  const kernel = createKernel<Part>(root);
  const { spec, controller } = behavior(kernel.host);

  kernel.arm(spec);
  return controller;
}
