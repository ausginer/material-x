import { describe, expectTypeOf, it } from 'vitest';
import {
  type SlotControllerUpdateCallback,
  useSlot,
} from '../../src/controllers/useSlot.ts';
import type { ControlledElement } from '../../src/element.ts';

// Each call sits in a function that is never called: only its types are under
// test.
declare const host: ControlledElement;

describe('useSlot types', () => {
  it('should type the callback nodes as readonly Node[]', () => {
    expectTypeOf<Parameters<SlotControllerUpdateCallback>[1]>().toEqualTypeOf<
      readonly Node[]
    >();
  });

  it('should infer readonly Node[] for an inline callback', () => {
    const observe = (): void => {
      useSlot(host, 'slot', (_, nodes) => {
        expectTypeOf(nodes).toEqualTypeOf<readonly Node[]>();
      });
    };

    expectTypeOf(observe).toBeFunction();
  });

  // Both type-argument rows pass `never`. It satisfies any constraint, so a
  // type parameter of any bound would accept it and leave the directive unused.
  it('should reject a type argument', () => {
    const observe = (): void => {
      // @ts-expect-error: TS2558, `useSlot` takes no type argument
      useSlot<never>(host, 'slot', () => {});
    };

    expectTypeOf(observe).toBeFunction();
  });

  it('should reject a type argument on the callback type', () => {
    // @ts-expect-error: TS2315, `SlotControllerUpdateCallback` is not generic
    expectTypeOf<SlotControllerUpdateCallback<never>>().toBeFunction();
  });
});
