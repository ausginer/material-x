/**
 * The inference the opaque `Behavior` brand has to keep working.
 *
 * Erasing the frame part at the brand (D-30) is only safe if the *controller*
 * still flows out of `draggable()` on its own. If it did not, every consumer
 * would have to name a type argument to get anything back, and the erasure
 * would have bought opacity by making the entry point unusable.
 */
import { describe, expectTypeOf, it } from 'vitest';
import { draggable } from '../src/kernel.ts';
import { createSortableBehavior } from '../src/sortable/behavior.ts';
import type { SortableController } from '../src/sortable/controller.ts';
import type { SortableSlots } from '../src/sortable/slots.ts';

const root = null as unknown as HTMLElement;
const slots = null as unknown as SortableSlots;
const items = null as unknown as HTMLElement[];

describe('draggable', () => {
  it('should infer the concrete controller with no explicit type argument', () => {
    const controller = draggable(root, createSortableBehavior(items, slots));

    expectTypeOf(controller).toEqualTypeOf<SortableController>();
  });

  it('should infer the behavior frame part rather than being told it', () => {
    // **D-48/D-55 invert this row rather than deleting it.** The part used to
    // be erased at the brand, so naming it was a compile error. There is no
    // brand: `BehaviorFactory` carries the part and `draggable` infers it from
    // the factory's return position — which is the claim the handoff flagged as
    // the one only the compiler can settle.
    const controller = draggable(root, createSortableBehavior(items, slots));

    expectTypeOf(controller).toEqualTypeOf<SortableController>();
  });
});
