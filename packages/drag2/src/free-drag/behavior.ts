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
 * the sortable's hand-built slot records. With one caller, a named `install`
 * was a name for the two constructor calls the factory already is; the
 * sortable's equivalent exists for the opposite reason and under the same rule:
 * a test seam exists where a test drives it.
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
 * recorded and the bracket that unwinds them. The sortable needed a reordering
 * to make that true; this behavior gets it by having nothing to reorder.
 */
export function createComposedFreeDragBehavior(
  config: FreeDragConfig,
  fragments: ReadonlyArray<Partial<FreeDragConfig>>,
): BehaviorFactory<FreeDragController, FreeDragFramePart> {
  const merged = mergeFreeFragments(config, fragments);

  return (kernel) => ({
    spec: createFreeDragSpec(
      kernel,
      assemble(merged, {
        realm: kernel.realm,
        root: kernel.root,
        // **The composition unwind's only route to the channel.** `assemble`
        // runs before `arm()`, so no behavior spec exists yet and the kernel's
        // own notifier is unreachable — but `merged.onError` is in hand right
        // here, which makes this the smallest threading available rather than a
        // new ownership path.
        //
        // `report`, not `fail`: a feature closure created here cannot know
        // which operation is live, so classifying a failure from one would let
        // a late continuation settle another.
        report: (error) => {
          if (kernel.closed) {
            return;
          }

          try {
            merged.onError?.(
              new DraggableWarning('drag: composition/unwind-failed', {
                cause: error,
              }),
            );
          } catch {
            // The terminus. A construction unwind that cannot report is still
            // an unwind, and its next step matters more than this notification.
          }
        },
      }),
    ),
    controller: createFreeDragController(kernel),
  });
}
