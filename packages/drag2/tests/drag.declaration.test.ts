/**
 * The inference the opaque `Behavior` brand has to keep working.
 *
 * Erasing the frame part at the brand (D-30) is only safe if the *controller*
 * still flows out of `draggable()` on its own. If it did not, every consumer
 * would have to name a type argument to get anything back, and the erasure
 * would have bought opacity by making the entry point unusable.
 */
import { describe, expectTypeOf, it } from 'vitest';
import { draggable } from '../src/drag.ts';
import { createSortableBehavior } from '../src/sortable/behavior.ts';
import type { SortableController } from '../src/sortable/controller.ts';
import type { SortableFramePart } from '../src/sortable/frames.ts';
import type { SortableSlots } from '../src/sortable/slots.ts';

const root = null as unknown as HTMLElement;
const slots = null as unknown as SortableSlots;
const items = null as unknown as HTMLElement[];

describe('draggable', () => {
  it('should infer the concrete controller with no explicit type argument', () => {
    const controller = draggable(root, createSortableBehavior(items, slots));

    expectTypeOf(controller).toEqualTypeOf<SortableController>();
  });

  it('should not require the behavior frame part to be named', () => {
    // The part is the behavior's private type. A second type argument would put
    // it back on the consumer's surface, which is what the brand removes.
    // @ts-expect-error: `draggable` takes one type argument
    draggable<SortableController, SortableFramePart>(
      root,
      createSortableBehavior(items, slots),
    );
  });
});
