/**
 * The behavior instance: the one place `rt` is declared and created.
 *
 * ```ts
 * const rt = createSortableRuntime(host, items, slots);
 * return { spec: createSortableSpec(rt), controller: createSortableController(host, rt) };
 * ```
 *
 * Both halves are returned at once, which is what makes "no input can be
 * admitted before install returns" unexpressible rather than a rule (D-1).
 *
 * Assembly happens **inside** the install function, not before it: a feature
 * factory is handed `realm` and `root`, and neither exists until the kernel has
 * a host. The public `sortable(items, ...features)` entry lives in `sortable.ts`
 * and is the only caller that assembles.
 */
import { report } from '../kernel/reporter.ts';
import type {
  BehaviorFactory,
  BehaviorInstall,
  KernelHost,
} from '../kernel/spec.ts';
import { assemble } from './assemble.ts';
import {
  createSortableController,
  type SortableController,
} from './controller.ts';
import type { SortableFeature } from './feature.ts';
import type { SortableFramePart } from './frames.ts';
import { createSortableRuntime } from './runtime.ts';
import type { SortableSlots } from './slots.ts';
import { createSortableSpec } from './spec.ts';

function install(
  host: KernelHost,
  items: readonly HTMLElement[],
  slots: SortableSlots,
): BehaviorInstall<SortableController, SortableFramePart> {
  const rt = createSortableRuntime(host, items, slots);

  return {
    spec: createSortableSpec(rt),
    controller: createSortableController(host, rt),
  };
}

/**
 * Takes an already-assembled slot record. The seam the tests drive directly.
 *
 * **A plain factory, unbranded** (D-55). `brandBehavior` is withdrawn: with
 * `sortable()` returning its controller directly there is no branded value for
 * a consumer to hold, so the brand had no producer.
 */
export function createSortableBehavior(
  items: readonly HTMLElement[],
  slots: SortableSlots,
): BehaviorFactory<SortableController, SortableFramePart> {
  return (host) => install(host, items, slots);
}

/** Assembles the features first, against the host's realm and root. */
export function createComposedSortableBehavior(
  items: readonly HTMLElement[],
  features: readonly SortableFeature[],
): BehaviorFactory<SortableController, SortableFramePart> {
  return (host) =>
    install(
      host,
      items,
      // `report`, not `fail`: a feature closure created here cannot know which
      // operation is live, so classifying a failure from one would let a late
      // continuation settle another.
      assemble(features, { realm: host.realm, root: host.root, report }),
    );
}
