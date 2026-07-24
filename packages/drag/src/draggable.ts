/**
 * Free dragging entry point.
 *
 * The controller is an imperative, action-driven state machine over one runtime
 * container with two transactional state frames: input and async completions
 * enqueue actions, each action validates itself against the committed frame,
 * mutates a reusable draft, commits by swapping the two, then runs its effects
 * inline. See `src/draggable/runtime/`.
 */
import type { DraggableOptions } from './draggable/options.ts';
import {
  createDraggableController,
  type FreeDragController,
} from './draggable/runtime/controller.ts';

/* PUBLIC */

export {
  FreeDropResolution,
  FreeDropResult,
  type DragBounds,
  type DraggableOptions,
  type DragUpdate,
  type FreeDropCancelResult as FreeDragCancelResult,
  type FreeDropFinishResult as FreeDragFinishResult,
  type FreeHomeRequest,
  type FreeHomeTarget,
  type LiftMode,
} from './draggable/options.ts';
export type {
  AnimationTiming,
  CoordinateMapper,
  DragAxis,
  DragGeometry,
  DragSubject,
  FreeDropRequest,
  Point,
} from './kernel/types.ts';
export type { FreeDragController } from './draggable/runtime/controller.ts';

export function draggable(
  item: HTMLElement,
  options: DraggableOptions,
): FreeDragController {
  return createDraggableController(item, options);
}
