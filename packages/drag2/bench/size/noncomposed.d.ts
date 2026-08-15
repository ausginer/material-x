/**
 * Types for the hand-written M-3 baseline, so `tests/bench/size.node.test.ts`
 * can compare its slot record against the assembler's without an `any`.
 */
import type { SortableController } from '../../src/sortable/controller.ts';
import type { FeatureContext } from '../../src/sortable/feature.ts';
import type { SortableSlots } from '../../src/sortable/slots.ts';

export declare function buildSlots(
  context: FeatureContext,
  config: Readonly<{
    items: SortableSlots['items'];
    onReorder: SortableSlots['onReorder'];
    grip: (item: HTMLElement) => HTMLElement | null;
    box: (item: HTMLElement) => HTMLElement;
  }>,
): SortableSlots;

export declare function mount(
  root: HTMLElement,
  items: readonly HTMLElement[],
  onReorder: SortableSlots['onReorder'],
  grip: (item: HTMLElement) => HTMLElement | null,
  box: (item: HTMLElement) => HTMLElement,
): SortableController;
