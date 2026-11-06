// The consumer-facing controller. Its cancellation and destruction members are
// the kernel's own. The behavior adds the one thing the kernel cannot know:
// what a collection is.
import type { BehaviorContext } from '../kernel/spec.ts';
import { TAG_COLLECTION } from './runtime.ts';

export type SortableController = Readonly<{
  /**
   * Reports that the committed presentation or data may have changed. This call
   * carries no payload: the collection is a pull source, so the library asks
   * `items()` for it and is not given one.
   *
   * The cost depends on what changed. When `items()` returns the same array
   * identity, the library invalidates geometry and stops. A resize, a zoom or a
   * scroll produces this case. A new identity takes the structural branch:
   * shallow copy, reconcile, geometry invalidation. In-place mutation of the
   * same array is outside the contract.
   *
   * The call is applied as a queued action, so it takes effect in FIFO order
   * with everything else the drag is doing. It is never discarded: even a
   * replacement that invalidates the current gap publishes first and cancels
   * afterwards.
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
   * Requests destruction. With no library callback running, it is applied
   * before this returns. When called from inside a library callback, the
   * library first finishes the step that callback belongs to, whose remaining
   * callbacks may still be invoked, and then applies it. From application on,
   * nothing is admitted, no lifecycle or domain event is published, and no
   * declared consumer slot is invoked, with two exceptions: teardown runs each
   * installed feature's retire hook, so what a feature holds is released, and a
   * panic delivers its one report to `onError` before teardown. The returned
   * promise settles once, after physical teardown, and every call returns the
   * same promise.
   *
   * Most callers do not want the completion signal and should write
   * `void controller.requestDestroy();`.
   */
  requestDestroy(): Promise<void>;
}>;

// The controller holds no collection state, because the collection is a pull
// source.
export function createSortableController(
  kernel: BehaviorContext,
): SortableController {
  // `requestCancel` and `requestDestroy` forward to the kernel's own members,
  // which already make both inert and idempotent once destruction is applied.
  return {
    invalidate(): void {
      // This member carries no payload and reads nothing here. `items()` is
      // consumer code, and this member can be called from inside behavior code:
      // a handle resolver may call it during admission. Calling `items()` on
      // this statement would run consumer code at an arbitrary reentrant point.
      // `action.prepare` calls it instead, where the kernel has a transaction
      // open, a phase to branch on and a stage to classify a throw against.
      kernel.dispatch(TAG_COLLECTION, null);
    },

    // Wrap these members in arrows. `requestCancel` and `requestDestroy` are
    // published members that a consumer may read off the controller and pass
    // on. So the published value is a closure over the call and not the
    // kernel's prototype method, which would arrive without `this`.
    requestCancel: (reason?: unknown): void => {
      kernel.requestCancel(reason);
    },

    // A plain arrow and not an `async` one, so the memoized promise is returned
    // by identity: the "settles once" that the kernel documents applies to that
    // object.
    requestDestroy: (): Promise<void> => kernel.requestDestroy(),
  };
}
