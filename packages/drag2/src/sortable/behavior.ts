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
import { mergeFragments, type SortableConfig } from './config.ts';
import {
  createSortableController,
  type SortableController,
} from './controller.ts';
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
    controller: createSortableController(host),
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

/**
 * Merges the fragments, then assembles against the host's realm and root.
 *
 * **Two stages, and the split is the decision** (D-45): the merge resolves
 * every named slot before a single installer runs, which is what makes
 * last-wins a merge rule rather than a lifecycle problem — a capability that
 * loses its slot is never constructed, so there is nothing to retire.
 *
 * The merge happens here rather than at the `sortable()` call site because
 * nothing before this point is per-controller: merging eagerly would compute a
 * config for a behavior that may never be installed.
 */
export function createComposedSortableBehavior(
  fragments: ReadonlyArray<Partial<SortableConfig>>,
): BehaviorFactory<SortableController, SortableFramePart> {
  const config = mergeFragments(fragments);

  return (host) =>
    install(
      host,
      // **D-44: the first pull.** Every later one goes through
      // `action.prepare(COLLECTION)`; this is the initial snapshot and the
      // initial structural baseline, and it is the only `items()` call that
      // happens outside a transaction. Validated as a function by `assemble`,
      // which runs on the next line — hence the guard, which is what keeps a
      // non-function config producing the assembler's diagnostic rather than a
      // `TypeError` from this call site.
      typeof config.items === 'function' ? config.items() : [],
      // `report`, not `fail`: a feature closure created here cannot know which
      // operation is live, so classifying a failure from one would let a late
      // continuation settle another.
      assemble(config, { realm: host.realm, root: host.root, report }),
    );
}
