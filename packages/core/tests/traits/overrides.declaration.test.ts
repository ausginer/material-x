import { assertType, describe, it } from 'vitest';
import { ControlledElement } from '../../src/element.ts';
import { compose, type Composed } from '../../src/traits/composition.ts';
import type { Valuable } from '../../src/traits/valuable.ts';

const Base: Composed<typeof ControlledElement, [typeof Valuable]> =
  compose(ControlledElement);

describe('trait member overrides', () => {
  it('should allow an accessor override of an attribute member', () => {
    class WithAccessor extends Base {
      override get value(): string | null {
        return null;
      }

      override set value(_value: string | null) {}
    }

    assertType<Valuable>(new WithAccessor());
  });

  it('should reject a field over an attribute member', () => {
    class WithField extends Base {
      // @ts-expect-error: TS2610, `value` is an accessor
      override value: string | null = null;
    }

    assertType<WithField>(new WithField());
  });

  it('should reject a property override of the wrong type', () => {
    class WithWrongType extends Base {
      // @ts-expect-error: number is not assignable to string | null
      override value: number = 1;
    }

    assertType<WithWrongType>(new WithWrongType());
  });
});
