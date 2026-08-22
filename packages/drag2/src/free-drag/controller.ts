/**
 * The consumer-facing controller. **Four members** — the kernel's two, plus one
 * signal and one command (D-71).
 *
 * ~~`update(DragUpdate)`~~ is dropped and replaced. The package carried the same
 * defect D-44 found in the collection: two channels for one thing, re-reading
 * neither. Every mutable policy slot is now a source the library re-reads and
 * `invalidate()` is the only signal; no slot has a setter.
 */
import type { KernelHost } from '../kernel/spec.ts';
import type { Point } from '../kernel/types.ts';
import { TAG_POLICY, TAG_POSITION } from './runtime.ts';

export type FreeDragController = Readonly<{
  /**
   * **A policy source may have changed** (D-71). Carries no payload: the
   * library asks rather than being told, so `axis` and the bounds source are
   * re-read rather than handed over.
   *
   * Applied as a **queued action**, so it lands in FIFO order with everything
   * else the drag is doing and reads consumer sources inside `action.prepare`,
   * where the kernel has a transaction open, a phase to branch on and a stage to
   * classify a throw against. Calling a source on this statement would run
   * consumer code at an arbitrary reentrant point.
   */
  invalidate(): void;
  /**
   * **Move the visual now — a command, not policy** (D-71). A controlled
   * position is not a rule the library re-reads; folding it into an options bag
   * is what made the shipped `update({ position })` carry a motion command.
   *
   * **It re-bases.** The visual is at `point` on the next committed frame and
   * subsequent pointer motion continues *relative to that*. The shipped
   * `update({ position })` set an absolute position that later pointer samples
   * did not disturb; the two agree on the observable the shipped test pins —
   * retargeting a controlled drag mid-flight — and differ only when the pointer
   * keeps moving, where the re-base is the one that composes with a live
   * pointer rather than fighting it.
   *
   * `point` is **viewport** space (D-72), like every other point on this
   * surface, and its coordinates must both be **finite** (D-91).
   *
   * **A non-finite coordinate discards the call.** Nothing is written, no
   * failure is classified, no `onError` fires and no terminal is published; the
   * misuse is surfaced on the platform reporter and the drag continues. The
   * check exists because this value is not read once — it is folded into
   * committed frame state, so a single `NaN` poisons every later derivation,
   * every geometry object the consumer is handed, and the target the kernel
   * pins with. Refusing it before it is written costs the operation nothing,
   * which is why it is discarded here and *classified* at `home` (E-05): that
   * one can only be refused by failing the seam that produced it.
   *
   * A **malformed** `point` — `null`, missing fields, a throwing accessor — is
   * deliberately not checked and throws at the read, reaching
   * `FAILURE_ACTION_PREPARE` → `presentation` like any other seam throw.
   */
  moveTo(point: Point): void;
  cancel(reason?: unknown): void;
  /**
   * Closes the controller **logically**, immediately, on this statement — every
   * guard fails from here, nothing is admitted, and no declared consumer slot is
   * invoked again. The returned promise settles **once**, after physical
   * teardown: this call when no library transaction is active, the boundary of
   * the outermost one when there is (D-36).
   *
   * Most callers do not want the completion signal and should write
   * `void controller.destroy();`.
   */
  destroy(): Promise<void>;
}>;

export function createFreeDragController(host: KernelHost): FreeDragController {
  // `cancel` and `destroy` **are** the kernel's own members, spread through
  // unchanged: the kernel's latch already makes both inert and idempotent
  // before they do any work (D-53).
  // **Neither member re-reads the latch** (removed 2026-08-22). `dispatch`'s
  // first statement is `if (queue.closed) { return; }` and `host.closed` is a
  // live getter over that same flag, with nothing observable in between — so
  // the guard here answered the question the callee opens with.
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
