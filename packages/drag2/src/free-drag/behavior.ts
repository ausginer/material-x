/**
 * The behavior instance: one factory, and the whole of it is below.
 *
 * Both halves of the two-phase handshake are returned at once, which is what
 * makes "no input can be admitted before install returns" unexpressible rather
 * than a rule.
 *
 * Assembly happens **inside** the returned factory, not before it: an installer
 * is handed `realm` and `root`, and neither exists until the kernel does.
 *
 * **There is no second factory, and no `install` between them.** Every
 * free-drag test constructs through the public `freeDrag()` entry, because this
 * behavior has no state a lower seam would reach — nothing here corresponds to
 * the sortable's hand-built slot records. A test seam exists where a test
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
 * **Two stages, and the split is deliberate**: the merge resolves every named
 * slot before a single installer runs, which is what makes last-wins a merge
 * rule rather than a lifecycle problem — a capability that loses its slot is
 * never constructed, so there is nothing to retire.
 *
 * The merge happens here rather than at the `freeDrag()` call site because
 * nothing before this point is per-controller: merging eagerly would compute a
 * config for a behavior that may never be installed.
 *
 * **Nothing is pulled or validated ahead of the installers**, and the absence
 * is the point rather than an omission: free drag has no collection, so there
 * is no consumer-triggerable throw between the first `retire` hook being
 * recorded and the bracket that unwinds them.
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
          // **The composition unwind's only route to the channel.** `assemble`
          // runs before `arm()`, so no behavior spec exists yet — but
          // `merged.onError` is in hand right here, and the kernel mints a
          // channel over it that already works in the construction window.
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
