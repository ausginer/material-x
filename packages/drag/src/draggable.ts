import type {
  AnyBehavior,
  Behavior,
  LiftedBehavior,
} from './kernel/behavior.ts';
import type { Drag, LiftedDrag } from './kernel/drag.ts';
import { Gesture, type DraggableController } from './kernel/gesture.ts';

export type { Admission, LiftedAdmission } from './kernel/admission.ts';
export type { Behavior, LiftedBehavior } from './kernel/behavior.ts';
export type { Drag, DragDisposer, LiftedDrag } from './kernel/drag.ts';
export type { DraggableController } from './kernel/gesture.ts';
export type {
  CanceledOutcome,
  CancelOrigin,
  Outcome,
  SkippedOutcome,
  VerdictOutcome,
} from './kernel/outcome.ts';

/**
 * Makes `root` draggable with one behavior. Compose `lift` from
 * `@ydinjs/drag/lift.js` to promote the visual to the top layer. Without it the
 * bundle holds no lift code, and the behavior renders by itself, reading its
 * coordinate basis with `@ydinjs/box-quad` in `activate`.
 *
 * `root` must be connected and must stay in its document while a drag holds
 * pointer capture on it. A press is never prevented, so give the handle
 * `touch-action: none` for touch input, `user-select: none` for text, and
 * `draggable="false"` on a natively draggable element such as a link or an image.
 *
 * The kernel calls each hook as a method of `behavior`, read when it is called,
 * so a behavior may be a class instance. An event one controller admitted is
 * offered to no other, so nested roots need no marking. An `Escape` that cancels
 * a started operation has its default prevented.
 */
export function draggable<State = undefined, Verdict = unknown>(
  root: HTMLElement,
  behavior: LiftedBehavior<State, Verdict>,
): DraggableController<LiftedDrag<State>>;
export function draggable<State = undefined, Verdict = unknown>(
  root: HTMLElement,
  behavior: Behavior<State, Verdict>,
): DraggableController<Drag<State>>;
export function draggable<State, Verdict>(
  root: HTMLElement,
  behavior: AnyBehavior<State, Verdict>,
): DraggableController<never> {
  const gesture = new Gesture(root, behavior);
  // Not the instance, so the session's way into it stays inside this module.
  const controller: DraggableController<LiftedDrag<State>> = {
    requestStep: gesture.requestStep,
    requestCancel: gesture.requestCancel,
    requestDestroy: gesture.requestDestroy,
    use: gesture.use,
  };

  return controller as DraggableController<never>;
}
