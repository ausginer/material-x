/**
 * The consumer-facing controller. Three members, two of which are the kernel's
 * own — the behavior adds exactly one thing the kernel cannot know about.
 */
import type { KernelHost } from '../kernel/spec.ts';
import type { CollectionSnapshot } from './domain.ts';
import { type SortableRuntime, TAG_COLLECTION } from './runtime.ts';

export type SortableController = Readonly<{
  /**
   * Replace the collection. Applied as a queued action, so it lands in FIFO
   * order with everything else the drag is doing — and it is **never
   * discarded**: even a replacement that invalidates the current gap publishes
   * first and cancels afterwards (D-25).
   */
  updateItems(items: readonly HTMLElement[]): void;
  cancel(reason?: unknown): void;
  destroy(): void;
}>;

export function createSortableController(
  host: KernelHost,
  rt: SortableRuntime,
): SortableController {
  return {
    updateItems(items): void {
      // Shallow-copied and versioned **here**, at call time, so a caller that
      // keeps mutating its own array cannot change a snapshot already queued.
      const next: CollectionSnapshot = {
        items: [...items],
        version: rt.snapshot.version + 1,
      };

      host.dispatch(TAG_COLLECTION, next);
    },
    cancel: host.cancel,
    destroy: host.destroy,
  };
}
