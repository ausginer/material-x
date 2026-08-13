/**
 * The consumer-facing controller. Four members, two of which are the kernel's
 * own — the behavior adds the two things the kernel cannot know about: what a
 * collection is, and what a request is.
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
  // **The terminal latch is the kernel's, and it is readable** (D-53). It was
  // the behavior's own between D3 and Revision 2, because `KernelHost` exposed
  // none — and the kernel's own latch guards the *dispatch*, which is one step
  // too late for `updateItems`, whose validation throws before anything reaches
  // the kernel. "No-op after `destroy()`" has to mean the whole method, invalid
  // input included, or the promise is only true for calls that would have been
  // silent anyway. `host.closed` answers that at the same point the mirror did,
  // and answers it for a kernel-internal `panic()` too, which the mirror never
  // saw.
  //
  // `cancel` and `destroy` *are* the kernel's own members, spread through
  // unchanged, and the kernel's latch already makes both inert and idempotent
  // before they do any work. `ready()` deliberately keeps reporting: a
  // post-`destroy()` acknowledgement is a stale one by definition, and telling
  // an integrator that its layout effect outlived the controller is the whole
  // reason that DEV report exists.

  return {
    updateItems(items): void {
      if (host.closed) {
        return;
      }

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

    // D-36: logical closure is immediate and the promise settles after physical
    // teardown. D-53 deletes the behavior's private latch mirror, so this is
    // now the kernel's member spread through unchanged — as `cancel` already
    // was — rather than a wrapper that had to set a second copy first.
    destroy: host.destroy,
  };
}
