// The consumer-facing controller. Its cancellation and destruction members are
// the kernel's own — the behavior adds the one thing the kernel cannot know
// about: what a collection is.
import type { BehaviorContext } from '../kernel/spec.ts';
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
  /**
   * Requests cancellation of the current drag. It is registered only while
   * the drag can still be cancelled, applied in order with everything else
   * the drag is doing, and lapses if the drag is decided first. The outcome
   * arrives as the drag's terminal callback; with no drag it does nothing.
   */
  requestCancel(reason?: unknown): void;
  /**
   * Requests destruction. With no library callback running it is applied
   * before this returns. Called from inside one, the library first finishes
   * the step that callback belongs to, whose remaining callbacks may still be
   * invoked, and then applies it. From application on nothing is admitted and
   * no declared consumer slot is invoked. The returned promise settles
   * **once**, after physical teardown, and every call returns the same one.
   *
   * Most callers do not want the completion signal and should write
   * `void controller.requestDestroy();`.
   */
  requestDestroy(): Promise<void>;
}>;

// The controller holds no collection state at all, which is the shape a pull
// source implies.
export function createSortableController(
  kernel: BehaviorContext,
): SortableController {
  // `requestCancel` and `requestDestroy` forward to the kernel's own members,
  // which already make both inert and idempotent once destruction is applied.
  return {
    invalidate(): void {
      // Payload-free, and it reads nothing here. `items()` is consumer code and
      // this member is reachable from inside a seam — a handle resolver may
      // call it during admission — so calling it on this statement would run
      // consumer code at an arbitrary reentrant point. `action.prepare` calls
      // it instead, where the kernel has a transaction open, a phase to branch
      // on and a stage to classify a throw against.
      kernel.dispatch(TAG_COLLECTION, null);
    },

    // **Wrapped, not detached.** `requestCancel` and `requestDestroy` are
    // published members a consumer may pull off the controller and pass on,
    // so what is published is a closure over the call rather than the
    // kernel's prototype method, which would arrive with no receiver.
    requestCancel: (reason?: unknown): void => {
      kernel.requestCancel(reason);
    },

    // A plain arrow rather than an `async` one, so the memoized promise is
    // returned **by identity** — the *settles once* the kernel documents is a
    // statement about that object.
    requestDestroy: (): Promise<void> => kernel.requestDestroy(),
  };
}
