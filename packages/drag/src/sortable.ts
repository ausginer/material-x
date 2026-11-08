/**
 * The sortable, written on the public `draggable` with no private path. The
 * consumer owns the DOM order: a drop proposes a reorder and the consumer commits or
 * rejects it.
 */
import { draggable } from './draggable.ts';
import { Lifter } from './lift.ts';
import { SortableBehavior, type SortableConfig } from './sortable/behavior.ts';
import {
  ReorderResolution,
  type OnReorder,
  type ReorderRequest,
  type SortableAcceptedResult,
  type SortableCanceledResult,
  type SortableNoopResult,
  type SortableRejectedResult,
  type SortableResult,
} from './sortable/domain.ts';
import type {
  PlaceholderContext,
  PlaceholderFactory,
} from './sortable/placement.ts';

export { ReorderResolution };
export type {
  OnReorder,
  PlaceholderContext,
  PlaceholderFactory,
  ReorderRequest,
  SortableAcceptedResult,
  SortableCanceledResult,
  SortableNoopResult,
  SortableRejectedResult,
  SortableConfig,
  SortableResult,
};

export type SortableController = Readonly<{
  /**
   * During a drag, re-reads the collection and the geometry. Between drags and
   * during a press nothing needs to be called.
   */
  invalidate(): void;
  requestCancel(reason?: unknown): void;
  requestDestroy(): Promise<void>;
}>;

/** Makes `root` a sortable collection. */
export function sortable(
  root: HTMLElement,
  config: SortableConfig,
): SortableController {
  const displacement = config.displacement?.();
  const lifter = new Lifter(root.ownerDocument.defaultView!);
  const behavior = new SortableBehavior(root, config, displacement, lifter);
  const kernel = draggable(root, behavior);

  if (displacement) {
    kernel.use(() => {
      displacement.retire();
    });
  }

  // Registered last, so a running landing is cancelled first at destruction.
  kernel.use(lifter.cancelLanding);

  return {
    invalidate: () => {
      kernel.requestStep(behavior.invalidate);
    },
    requestCancel: (reason) => kernel.requestCancel(reason),
    requestDestroy: () => kernel.requestDestroy(),
  };
}
