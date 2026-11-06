/**
 * The behavior instance: one factory, and all of it is below.
 *
 * Both parts of the two-phase handshake are returned at once. So the code
 * cannot admit input before install returns, and no separate rule is needed.
 *
 * Assembly happens inside the returned factory, not before it: an installer
 * receives `realm` and `root`, and neither exists until the kernel does.
 *
 * There is no second factory and no `install` between them. Every free-drag
 * test constructs through the public `freeDrag()` entry, because this behavior
 * has no state that a lower test entry would reach. Nothing here corresponds to
 * the sortable's hand-built slot records. A test entry exists where a test
 * drives it, which is also why the sortable has one.
 */
import { DraggableWarning } from '../kernel/errors.ts';
import type { BehaviorFactory } from '../kernel/spec.ts';
import { assemble } from './assemble.ts';
import { type FreeDragConfig, mergeFreeFragments } from './config.ts';
import {
  createFreeDragController,
  type FreeDragController,
} from './controller.ts';
import type { FreeDragFramePart } from './frames.ts';
import { createFreeDragSpec } from './spec.ts';

/**
 * Merges the fragments, then assembles against the kernel's realm and root.
 *
 * There are two stages because the merge resolves every named slot before any
 * installer runs. That makes last-wins a merge rule and not a lifecycle
 * problem: a capability that loses its slot is never constructed, so there is
 * nothing to retire.
 *
 * The merge happens here and not at the `freeDrag()` call site because nothing
 * before this point is per-controller: merging eagerly would compute a config
 * for a behavior that may never be installed.
 *
 * Nothing is pulled or validated ahead of the installers, and this absence is
 * intended. Free drag has no collection, so no consumer-triggerable throw can
 * occur between recording the first `retire` hook and the rollback that runs
 * those hooks.
 */
export function createComposedFreeDragBehavior(
  config: FreeDragConfig,
  fragments: ReadonlyArray<Partial<FreeDragConfig>>,
): BehaviorFactory<FreeDragController, FreeDragFramePart> {
  const merged = mergeFreeFragments(config, fragments);

  return (kernel) => {
    const composition = kernel.channel((warning) => {
      merged.onError?.(warning);
    });

    return {
      spec: createFreeDragSpec(
        kernel,
        assemble(merged, {
          realm: kernel.realm,
          root: kernel.root,
          // The composition rollback's only route to the channel. `assemble`
          // runs before `arm()`, so no behavior spec exists yet. But
          // `merged.onError` is available here, and the kernel creates a
          // channel over it that already works during construction.
          //
          // `report`, not `fail`: a feature closure created here cannot know
          // which operation is live, so classifying a failure from one would
          // let a late continuation settle another.
          report: (error) => {
            composition(
              new DraggableWarning('drag: composition/unwind-failed', {
                cause: error,
              }),
            );
          },
        }),
      ),
      controller: createFreeDragController(kernel),
    };
  };
}
