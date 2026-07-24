/**
 * Sortable (reorder) entry point.
 *
 * The controller is an imperative, action-driven state machine over one runtime
 * container with two transactional state frames. Release closes motion ingress
 * before final geometry is read, so the proposal handed to `onReorder` is
 * resolved from the actual release point and nothing later can move it.
 * See `src/sortable/runtime/`.
 */
import type { SortableOptions } from './sortable/options.ts';
import {
  createSortableController,
  type SortableController,
} from './sortable/runtime/controller.ts';

/* PUBLIC */

export {
  type PlaceholderContext,
  ReorderResolution,
  SortableResult,
  type SortableCancelResult,
  type SortableFinishResult,
  type SortableOptions,
} from './sortable/options.ts';
export type {
  AnimationTiming,
  DragSubject,
  ReorderRequest,
} from './kernel/types.ts';
export type { SortableController } from './sortable/runtime/controller.ts';

export function sortable(
  container: HTMLElement,
  options: SortableOptions,
): SortableController {
  return createSortableController(container, options);
}
