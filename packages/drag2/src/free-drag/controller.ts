/**
 * The consumer-facing controller. **Four members** — the kernel's two, plus one
 * signal and one command.
 *
 * The one mutable policy slot free drag has is the **bounds source**, which the
 * library re-reads; `invalidate()` is the only signal and no slot has a setter.
 */
import type { KernelHost } from '../kernel/spec.ts';
import type { Point } from '../kernel/types.ts';
import { TAG_POLICY, TAG_POSITION } from './runtime.ts';

export type FreeDragController = Readonly<{
  /**
   * **The bounds source may have changed.** Carries no payload: the library
   * asks rather than being told, so the source is re-read rather than handed
   * over.
   *
   * Applied as a **queued action**, so it lands in FIFO order with everything
   * else the drag is doing, and your source is read inside the library's own
   * transaction rather than on this statement.
   *
   * **`axis` is not re-read, because it is not a source**: it is fixed for the
   * controller's lifetime, since its value applies to travel the drag has
   * already accumulated rather than to the next position. A composition with no
   * `bounds` installer has nothing to invalidate, and this is a queued no-op
   * for it.
   */
  invalidate(): void;
  /**
   * **Move the visual now — a command, not policy.** A controlled position is
   * not a rule the library re-reads.
   *
   * **It re-bases.** The visual is at `point` on the next committed frame and
   * subsequent pointer motion continues *relative to that*, so the command
   * composes with a live pointer rather than fighting it.
   *
   * `point` is **viewport** space, like every other point on this surface, and
   * its coordinates must both be **finite**.
   *
   * **Nothing detects a violation of that.** A non-finite coordinate is
   * accepted and written: it is folded into committed frame state, so it
   * reaches every later derivation, every geometry object you are handed, and
   * the target the kernel pins the drop with — including the `distance` a
   * `landing({ duration })` function is called with. No failure is classified,
   * no `onError` fires, and the drag continues on a poisoned offset. This is a
   * documented boundary rather than a guarded one, in the same form the
   * sortable's `box` slot already uses.
   *
   * A **malformed** `point` — `null`, missing fields, a throwing accessor — is
   * deliberately not checked and throws at the read, so `onError` receives a
   * `DraggableError` whose `stage` is `FAILURE_ACTION_PREPARE`, like any other
   * seam throw.
   */
  moveTo(point: Point): void;
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

export function createFreeDragController(host: KernelHost): FreeDragController {
  // `cancel` and `destroy` **are** the kernel's own members, spread through
  // unchanged: the kernel's latch already makes both inert and idempotent
  // before they do any work. **Neither member re-reads the latch.**
  // `dispatch`'s first statement is `if (queue.closed) { return; }` and
  // `host.closed` is a live getter over that same flag, with nothing observable
  // in between — so a guard here would only answer the question the callee
  // opens with.
  return {
    invalidate(): void {
      host.dispatch(TAG_POLICY, null);
    },

    moveTo(point: Point): void {
      // The point travels as the action's argument rather than being applied
      // here: the offset it becomes is committed frame state, and only a
      // `prepare` may write one.
      host.dispatch(TAG_POSITION, point);
    },

    cancel: host.cancel,
    destroy: host.destroy,
  };
}
