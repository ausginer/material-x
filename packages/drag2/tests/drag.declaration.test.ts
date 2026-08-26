/**
 * The shared root's type-level witnesses, and the inference the opaque
 * `Behavior` brand has to keep working.
 *
 * Erasing the frame part at the brand (D-30) is only safe if the *controller*
 * still flows out of `draggable()` on its own. If it did not, every consumer
 * would have to name a type argument to get anything back, and the erasure
 * would have bought opacity by making the entry point unusable.
 *
 * **The fault vocabulary is witnessed here because both halves of it are types**
 * (D-132). `tests/kernel/stages.node.test.ts` reflects over the twelve runtime
 * constants, which catches a stage shipping unnoticed and cannot see the union
 * at all; `tests/kernel/errors.node.test.ts` asserts `'code' in error` is
 * false, which is a runtime property of one instance. Neither fails if the
 * removed field is re-declared as an optional or if `FailureStage` widens to
 * `number`, and both of those are edits a consumer's compiler would see first.
 */
import { describe, expectTypeOf, it } from 'vitest';
import {
  DraggableError,
  FAILURE_ADMISSION,
  type FailureStage,
} from '../src/drag.ts';
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

describe('DraggableError', () => {
  it('should carry the stage as a stage or null and nothing wider', () => {
    const error = new DraggableError(FAILURE_ADMISSION, null);

    expectTypeOf(error.stage).toEqualTypeOf<FailureStage | null>();
  });

  it('should expose no code property at the type level', () => {
    const error = new DraggableError(FAILURE_ADMISSION, null);

    // @ts-expect-error: the coarse code is deleted and `stage` replaced it
    // (D-132). The rename is what makes the break loud — a consumer's
    // `err.code === 'consumer'` is a missing property rather than a comparison
    // that silently became always-false — and this is the assertion that says
    // so at the tier the consumer's compiler works at.
    void error.code;
  });
});

describe('FailureStage', () => {
  it('should be closed over exactly the twelve published numbers', () => {
    // Written as literals rather than as the union of `typeof FAILURE_*`,
    // which would restate the declaration and pass however it changed. A
    // stage added, removed or repointed fails here, and so does the union
    // widening to `number`.
    expectTypeOf<FailureStage>().toEqualTypeOf<
      1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 14
    >();
  });

  it('should not admit a retired stage number', () => {
    // 12 and 13 are holes and neither is ever reused, because a stage constant
    // is inlined into a consumer's compiled code (D-41, D-130).
    // @ts-expect-error: 12 is a hole
    const retired: FailureStage = 12;

    void retired;
  });

  it('should not admit an arbitrary number', () => {
    const arbitrary = null as unknown as number;

    // @ts-expect-error: a closed union is what stops a private or invalid
    // stage being forged, and it is the reason the type is not `number`.
    const forged: FailureStage = arbitrary;

    void forged;
  });
});
