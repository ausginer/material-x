/**
 * The consumer-facing controller. It has four members: the kernel's two, plus
 * one signal and one command.
 *
 * The one mutable policy slot free drag has is the bounds source, which the
 * library re-reads. `invalidate()` is the only signal, and no slot has a
 * setter.
 */
import type { BehaviorContext } from '../kernel/spec.ts';
import type { Point } from '../kernel/types.ts';
import { type CapturedPosition, TAG_POLICY, TAG_POSITION } from './runtime.ts';

export type FreeDragController = Readonly<{
  /**
   * Signals that the bounds source may have changed. This carries no payload:
   * the library asks the source, so the source is re-read and not handed over.
   *
   * This is applied as a queued action, so it lands in FIFO order with
   * everything else the drag is doing. Your source is read inside the library's
   * own transaction and not on this statement.
   *
   * `axis` is not re-read, because it is not a source: it is fixed for the
   * controller's lifetime, since its value applies to travel the drag has
   * already accumulated and not to the next position. A composition with no
   * `bounds` installer has nothing to invalidate, and this is a queued no-op
   * for it.
   */
  invalidate(): void;
  /**
   * Moves the visual now. This is a command, not policy: a controlled position
   * is not a rule the library re-reads.
   *
   * It re-bases. The visual is at `point` on the next committed frame, and
   * later pointer motion continues relative to that point, so the command
   * composes with a live pointer and does not fight it.
   *
   * `point` is in viewport space, like every other point on this surface, and
   * both its coordinates must be finite.
   *
   * **Nothing detects a violation of that.** A non-finite coordinate is
   * accepted and written. It is folded into committed frame state, so it
   * reaches every later derivation, every geometry object you receive, and the
   * target the drop lands on, including the `distance` that a `landing({
   * duration })` function is called with. No failure is classified, no
   * `onError` fires, and the drag continues on a non-finite offset. This is a
   * documented boundary, not a guarded one.
   *
   * A malformed `point` (`null`, missing fields, a throwing accessor) is not
   * checked. Its coordinates are read once, when you call `moveTo`. A read that
   * throws is reported when the move is applied, so `onError` receives a
   * `DraggableError` whose `stage` is `FAILURE_ACTION_PREPARE`, like any other
   * throw at that stage. A move that is never applied reports nothing. With no
   * drag, past release, behind a cancel, or discarded by destruction, the move
   * is dropped, and the read's error with it.
   */
  moveTo(point: Point): void;
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
   * invoked, and then applies it. From application on nothing is admitted, no
   * lifecycle or domain event is published, and no declared consumer slot is
   * invoked, with two exceptions: teardown runs each installed feature's
   * retire hook, so what a feature holds is released, and a panic delivers
   * its one report to `onError` before teardown. The returned promise settles
   * once, after physical teardown, and every call returns the same one.
   *
   * Most callers do not want the completion signal and should write
   * `void controller.requestDestroy();`.
   */
  requestDestroy(): Promise<void>;
}>;

export function createFreeDragController(
  kernel: BehaviorContext,
): FreeDragController {
  // `requestCancel` and `requestDestroy` forward to the kernel's own members,
  // which already make both inert and idempotent once destruction is applied.
  return {
    invalidate(): void {
      kernel.dispatch(TAG_POLICY, null);
    },

    moveTo(point: Point): void {
      // Capture at intake: the coordinates are copied on this statement, so a
      // consumer that reuses one object across calls cannot change a position
      // after requesting it. One copy per call, never per sample.
      //
      // The copy travels as the action's argument and is not applied here: the
      // offset it becomes is committed frame state, and only a `prepare` may
      // write one. A malformed `point` fails the read here, and its error
      // travels in the same position, so `prepare` throws it and it is
      // classified as a throw from behavior code.
      let captured: CapturedPosition;

      try {
        captured = { x: point.x, y: point.y, fault: null };
      } catch (error) {
        captured = { x: 0, y: 0, fault: { error } };
      }

      kernel.dispatch(TAG_POSITION, captured);
    },

    // Published as wrappers, not as detached methods. A consumer may pull
    // either member off the controller and pass it on, so the published value
    // is a closure over the call and not the kernel's prototype method, which
    // would arrive with no `this`. `requestDestroy`'s wrapper is a plain arrow
    // and not an `async` one, so the memoized promise is returned by identity.
    requestCancel: (reason?: unknown): void => {
      kernel.requestCancel(reason);
    },
    requestDestroy: (): Promise<void> => kernel.requestDestroy(),
  };
}
