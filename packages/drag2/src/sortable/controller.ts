/**
 * The consumer-facing controller. Three members, two of which are the kernel's
 * own — the behavior adds exactly one thing the kernel cannot know about.
 */
import type { KernelHost } from '../kernel/spec.ts';
import { copyUniqueItems } from './collection.ts';
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
  // Minted here and monotonic per controller, **not** derived from
  // `rt.snapshot.version`. Two updates queued inside one drain — two calls from
  // `onStart`, or from any hook — both read the same *published* version and
  // would stamp two distinct collections identically, which destroys version's
  // only job: being the identity of a snapshot. The counter is seeded from the
  // initial snapshot so the sequence stays continuous with it.
  let { version } = rt.snapshot;

  return {
    updateItems(items): void {
      // Copied and validated **here**, at call time, so a caller that keeps
      // mutating its own array cannot change a snapshot already queued, and a
      // duplicate is refused at the call that introduced it.
      //
      // **Before** the counter advances, deliberately. A refused call produced
      // no snapshot, so it must not consume a version either: leaving a gap in
      // the sequence would make the counter stop being a dense identity for
      // the collections that actually exist, and a consumer that recovers from
      // the `TypeError` and retries would see its successful update numbered
      // as though an invisible one had happened in between.
      const next = copyUniqueItems(items);

      version += 1;
      host.dispatch(TAG_COLLECTION, {
        items: next,
        version,
      } satisfies CollectionSnapshot);
    },
    cancel: host.cancel,
    destroy: host.destroy,
  };
}
