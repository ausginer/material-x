// The consumer-facing controller. Three members, two of which are the kernel's
// own — the behavior adds the one thing the kernel cannot know about: what a
// collection is.
import type { KernelHost } from '../kernel/spec.ts';
import { TAG_COLLECTION } from './runtime.ts';

export type SortableController = Readonly<{
  /**
   * **The committed presentation or data may have changed.** Carries no
   * payload: the collection is a *pull* source, so the library asks `items()`
   * for it rather than being handed one.
   *
   * What this costs depends on what actually changed, and the split is the
   * point: when `items()` returns the **same array identity** the library
   * invalidates geometry and stops, which is what a resize, a zoom or a scroll
   * produces; a **new identity** takes the structural branch — shallow copy,
   * reconcile, geometry invalidation. In-place mutation of the same array is
   * outside the contract.
   *
   * Applied as a queued action, so it lands in FIFO order with everything else
   * the drag is doing — and it is **never discarded**: even a replacement that
   * invalidates the current gap publishes first and cancels afterwards.
   */
  invalidate(): void;
  cancel(reason?: unknown): void;
  /**
   * Closes the controller **logically**, immediately, on this statement — every
   * guard fails from here, nothing is admitted, and no declared consumer slot
   * is invoked again. The returned promise settles **once**, after physical
   * teardown: this call when no library transaction is active, the boundary of
   * the outermost one when there is.
   *
   * Most callers do not want the completion signal and should write
   * `void controller.destroy();`.
   */
  destroy(): Promise<void>;
}>;

// The controller holds no collection state at all, which is the shape a pull
// source implies (D-44).
export function createSortableController(host: KernelHost): SortableController {
  // The terminal latch is the kernel's, and it is readable (D-53). `cancel` and
  // `destroy` are the kernel's own members, spread through unchanged, and that
  // latch already makes both inert and idempotent before they do any work.

  return {
    invalidate(): void {
      // No `host.closed` guard here: `dispatch` opens with the kernel's
      // terminal latch, and `host.closed` is a live getter over it.
      //
      // Payload-free, and it reads nothing here (D-44). `items()` is consumer
      // code and this member is reachable from inside a seam — a handle
      // resolver may call it during admission — so calling it on this statement
      // would run consumer code at an arbitrary reentrant point.
      // `action.prepare` calls it instead, where the kernel has a transaction
      // open, a phase to branch on and a stage to classify a throw against.
      host.dispatch(TAG_COLLECTION, null);
    },
    cancel: host.cancel,

    // Logical closure is immediate and the promise settles after physical
    // teardown (D-36). The behavior keeps no latch mirror, so this is the
    // kernel's member spread through unchanged, as `cancel` already is.
    destroy: host.destroy,
  };
}
