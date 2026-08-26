/**
 * The behavior instance: the one place `rt` is declared and created.
 *
 * Both halves of the two-phase handshake are returned at once, which is what
 * makes "no input can be admitted before install returns" unexpressible rather
 * than a rule (D-1).
 *
 * Assembly happens **inside** the install function, not before it: an installer
 * is handed `realm` and `root`, and neither exists until the kernel has a host.
 *
 * ~~`createFreeDragBehavior`, the direct factory over `install`.~~ **Deleted
 * 2026-08-25 (D-126).** It had no caller anywhere in the repository, and its
 * own doc had said so since 2026-08-22: every free-drag test constructs
 * through the public `freeDrag()` entry, because this behavior has no state a
 * lower seam would reach — nothing here corresponds to the sortable's
 * hand-built slot records. Before release, a seam kept for a use that has not
 * appeared is pure cost (§8), and restoring four lines is cheaper than
 * carrying them. The sortable's equivalent stays for the opposite reason and
 * under the same rule: a test seam exists where a test drives it.
 */
import { DraggableWarning } from '../kernel/errors.ts';
import type {
  BehaviorFactory,
  BehaviorInstall,
  KernelHost,
} from '../kernel/spec.ts';
import { assemble } from './assemble.ts';
import { type FreeDragConfig, mergeFreeFragments } from './config.ts';
import {
  createFreeDragController,
  type FreeDragController,
} from './controller.ts';
import type { FreeDragFramePart } from './frames.ts';
import { createFreeDragRuntime } from './runtime.ts';
import type { FreeDragSlots } from './slots.ts';
import { createFreeDragSpec } from './spec.ts';

function install(
  host: KernelHost,
  slots: FreeDragSlots,
): BehaviorInstall<FreeDragController, FreeDragFramePart> {
  const rt = createFreeDragRuntime(host, slots);

  return {
    spec: createFreeDragSpec(rt),
    controller: createFreeDragController(host),
  };
}

/**
 * Merges the fragments, then assembles against the host's realm and root.
 *
 * **Two stages, and the split is the decision** (D-45): the merge resolves every
 * named slot before a single installer runs, which is what makes last-wins a
 * merge rule rather than a lifecycle problem — a capability that loses its slot
 * is never constructed, so there is nothing to retire.
 *
 * The merge happens here rather than at the `freeDrag()` call site because
 * nothing before this point is per-controller: merging eagerly would compute a
 * config for a behavior that may never be installed.
 *
 * **Nothing is pulled or validated ahead of the installers** (D-80 (b)), and the
 * absence is the point rather than an omission: free drag has no collection, so
 * there is no consumer-triggerable throw between the first `retire` hook being
 * recorded and the bracket that unwinds them. The sortable needed a reordering
 * to make that true; this behavior gets it by having nothing to reorder.
 */
export function createComposedFreeDragBehavior(
  config: FreeDragConfig,
  fragments: ReadonlyArray<Partial<FreeDragConfig>>,
): BehaviorFactory<FreeDragController, FreeDragFramePart> {
  const merged = mergeFreeFragments(config, fragments);

  return (host) =>
    install(
      host,
      assemble(merged, {
        realm: host.realm,
        root: host.root,
        // **The composition unwind's only route to the channel** (D-130 §1).
        // `assemble` runs before `arm()`, so no behavior spec exists yet and the
        // kernel's own notifier is unreachable — but `merged.onError` is in hand
        // right here, which makes this the smallest threading available rather
        // than a new ownership path.
        //
        // `report`, not `fail`: a feature closure created here cannot know which
        // operation is live, so classifying a failure from one would let a late
        // continuation settle another.
        report: (error) => {
          if (host.closed) {
            return;
          }

          try {
            merged.onError?.(
              new DraggableWarning('drag: composition/unwind-failed', error),
            );
          } catch {
            // The terminus. A construction unwind that cannot report is still an
            // unwind, and its next step matters more than this notification.
          }
        },
      }),
    );
}
