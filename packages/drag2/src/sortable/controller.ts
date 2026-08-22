/**
 * The consumer-facing controller. **Three** members, two of which are the
 * kernel's own — the behavior adds the one thing the kernel cannot know about:
 * what a collection is.
 *
 * It read _four_ until Revision 2 closure. The fourth was `ready(request)`,
 * deleted with the readiness protocol (D-41), and the count outlived it.
 */
import type { KernelHost } from '../kernel/spec.ts';
import { TAG_COLLECTION } from './runtime.ts';

export type SortableController = Readonly<{
  /**
   * **The committed presentation or data may have changed** (D-44). Carries no
   * payload: the collection is a *pull* source, so the library asks `items()`
   * for it rather than being handed one.
   *
   * ~~`updateItems(payload)`~~ is removed. The package carried two collection
   * channels — a thunk called once at construction and a push method for every
   * later change — and re-read neither; one source plus one signal collapses
   * them.
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
   * invalidates the current gap publishes first and cancels afterwards (D-25).
   */
  invalidate(): void;
  cancel(reason?: unknown): void;
  /**
   * Closes the controller **logically**, immediately, on this statement — every
   * guard fails from here, nothing is admitted, and no declared consumer slot
   * is invoked again. The returned promise settles **once**, after physical
   * teardown: this call when no library transaction is active, the boundary of
   * the outermost one when there is (D-36).
   *
   * Most callers do not want the completion signal and should write
   * `void controller.destroy();`.
   */
  destroy(): Promise<void>;
}>;

/**
 * **The runtime argument is gone** (D-44). It existed only to seed the version
 * counter, which moved to the spec with the payload — the controller now holds
 * no collection state at all, which is the shape a pull source implies.
 */
export function createSortableController(host: KernelHost): SortableController {
  // **The terminal latch is the kernel's, and it is readable** (D-53). It was
  // the behavior's own between D3 and Revision 2, because `KernelHost` exposed
  // none.
  //
  // **The guard is now belt-and-braces rather than load-bearing** (D-44). It
  // existed because `updateItems` validated its payload *before* anything
  // reached the kernel, so the kernel's own dispatch latch was one step too
  // late to make "no-op after `destroy()`" true for invalid input. There is no
  // payload and no pre-dispatch work left; the kernel's latch would answer this
  // on its own. It is kept because the reading is free and the alternative is
  // a member whose inertness depends on a guard in another module.
  //
  // `cancel` and `destroy` *are* the kernel's own members, spread through
  // unchanged, and the kernel's latch already makes both inert and idempotent
  // before they do any work. ~~`ready()` deliberately keeps reporting~~ — the
  // asymmetry this paragraph contrasted against lost its subject with D-41, and
  // what survives is the split above: `invalidate` carries the controller's own
  // reading, `cancel` and `destroy` carry the kernel's.

  return {
    invalidate(): void {
      // ~~`if (host.closed) { return; }`~~ **removed 2026-08-22**, and the
      // comment that stood here said why it could be: _belt-and-braces rather
      // than load-bearing (D-44) … the kernel's latch would answer this on its
      // own_. `dispatch` opens with that latch and `host.closed` is a live
      // getter over it.
      //
      // **Payload-free, and it reads nothing here** (D-44). `items()` is
      // consumer code and this member is reachable from inside a seam — a
      // handle resolver may call it during admission — so calling it on this
      // statement would run consumer code at an arbitrary reentrant point.
      // `action.prepare` calls it instead, where the kernel has a transaction
      // open, a phase to branch on and a stage to classify a throw against.
      host.dispatch(TAG_COLLECTION, null);
    },
    cancel: host.cancel,

    // D-36: logical closure is immediate and the promise settles after physical
    // teardown. D-53 deletes the behavior's private latch mirror, so this is
    // now the kernel's member spread through unchanged — as `cancel` already
    // was — rather than a wrapper that had to set a second copy first.
    destroy: host.destroy,
  };
}
