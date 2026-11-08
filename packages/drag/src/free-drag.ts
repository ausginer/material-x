/**
 * Free drag, written on the public `draggable` with no private path. A drop asks the
 * consumer: `accept` keeps the element wherever the consumer put it, and `reject`
 * sends it home.
 */
import { draggable } from './draggable.ts';
import { FreeDragBehavior, type FreeDragConfig } from './free-drag/behavior.ts';
import {
  FreeDragResolution,
  type DragGeometry,
  type FreeDragAcceptedResult,
  type FreeDragCanceledResult,
  type FreeDragRejectedResult,
  type FreeDragRequest,
  type FreeDragResult,
  type OnDrop,
  type Point,
} from './free-drag/domain.ts';
import { Lifter } from './lift.ts';

export { FreeDragResolution };
export type {
  DragGeometry,
  FreeDragAcceptedResult,
  FreeDragCanceledResult,
  FreeDragRejectedResult,
  FreeDragRequest,
  FreeDragResult,
  OnDrop,
  Point,
};

export type FreeDragController = Readonly<{
  /** The bounds are stale: re-read them on the next sample. */
  invalidate(): void;
  /** Places the visual at a viewport point and keeps following the pointer. */
  moveTo(point: Point): void;
  requestCancel(reason?: unknown): void;
  requestDestroy(): Promise<void>;
}>;

/** Makes `root` draggable anywhere. */
export function freeDrag(
  root: HTMLElement,
  config: FreeDragConfig,
): FreeDragController {
  const lifter = new Lifter(root.ownerDocument.defaultView!);
  const behavior = new FreeDragBehavior(root, config, lifter);
  const kernel = draggable(root, behavior);

  kernel.use(lifter.cancelLanding);

  return {
    invalidate: () => kernel.requestStep(behavior.invalidate),
    moveTo: (point) =>
      // One step per call: it carries the point, and DRI-8 keeps calls in order.
      kernel.requestStep((operation) => {
        operation?.moveTo(point);
      }),
    requestCancel: (reason) => kernel.requestCancel(reason),
    requestDestroy: () => kernel.requestDestroy(),
  };
}
