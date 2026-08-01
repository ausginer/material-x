/**
 * The behavior instance: the one place `rt` is declared and created.
 *
 * ```ts
 * const rt = createSortableRuntime(host, items, slots);
 * return { spec: createSortableSpec(rt), controller: createSortableController(host, rt) };
 * ```
 *
 * Both halves are returned at once, which is what makes "no input can be
 * admitted before install returns" unexpressible rather than a rule (D-1).
 *
 * This module takes an assembled `SortableSlots`. The public `sortable(items,
 * ...features)` entry — which calls `assemble()` to produce one and drops the
 * feature array — is phase 7; the feature modules themselves are phase 8.
 */
import type { Behavior } from '../kernel/spec.ts';
import {
  createSortableController,
  type SortableController,
} from './controller.ts';
import type { SortableFramePart } from './frames.ts';
import { createSortableRuntime } from './runtime.ts';
import type { SortableSlots } from './slots.ts';
import { createSortableSpec } from './spec.ts';

export function createSortableBehavior(
  items: readonly HTMLElement[],
  slots: SortableSlots,
): Behavior<SortableController, SortableFramePart> {
  return (host) => {
    const rt = createSortableRuntime(host, items, slots);

    return {
      spec: createSortableSpec(rt),
      controller: createSortableController(host, rt),
    };
  };
}
