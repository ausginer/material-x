import { assertType, describe, it } from 'vitest';
import { ControlledElement } from '../../src/element.ts';
import { impl } from '../../src/traits/attributes.ts';
import { Valuable } from '../../src/traits/valuable.ts';

const Base = impl(ControlledElement, [Valuable] as const);

describe('trait field overrides', () => {
  it('should allow an accessor override of a trait field', () => {
    class WithAccessor extends Base {
      override get value(): string | null {
        return null;
      }

      override set value(_value: string | null) {}
    }

    assertType<Valuable>(new WithAccessor());
  });

  it('should reject a property override of the wrong type', () => {
    class WithWrongType extends Base {
      // @ts-expect-error: number is not assignable to string | null
      override value: number = 1;
    }

    assertType<WithWrongType>(new WithWrongType());
  });

  it('should keep the trait brand nominal', () => {
    const unbranded = null as unknown as ControlledElement & {
      value: string | null;
    };

    // @ts-expect-error: an object without the brand is not Valuable
    assertType<Valuable>(unbranded);
  });
});
