// oxlint-disable typescript/no-unsafe-type-assertion
import { assertType, describe, expectTypeOf, it } from 'vitest';
import {
  type Bool,
  type Num,
  Str,
  type ConverterForPrimitive,
  type ConverterOf,
  type ConverterReadValue,
  type ConverterWriteValue,
} from '../src/attribute.ts';

const VariantStr = Str as ConverterOf<'primary' | 'secondary'>;

describe('attribute types', () => {
  it('should extract converter read values', () => {
    expectTypeOf<ConverterReadValue<typeof Bool>>().toEqualTypeOf<boolean>();
    expectTypeOf<ConverterReadValue<typeof Num>>().toEqualTypeOf<
      number | null
    >();
    expectTypeOf<ConverterReadValue<typeof VariantStr>>().toEqualTypeOf<
      'primary' | 'secondary' | null
    >();
  });

  it('should extract converter write values', () => {
    expectTypeOf<ConverterWriteValue<typeof Bool>>().toEqualTypeOf<boolean>();
    expectTypeOf<ConverterWriteValue<typeof Num>>().toEqualTypeOf<
      number | null | undefined
    >();
    expectTypeOf<ConverterWriteValue<typeof VariantStr>>().toEqualTypeOf<
      'primary' | 'secondary' | null | undefined
    >();
  });

  it('should select built-in converter from primitive values', () => {
    expectTypeOf<ConverterForPrimitive<boolean>>().toEqualTypeOf<Bool>();
    expectTypeOf<ConverterForPrimitive<number>>().toEqualTypeOf<Num>();
    expectTypeOf<ConverterForPrimitive<string>>().toEqualTypeOf<Str>();
  });

  it('should allow compile-time converter aliases to be reused', () => {
    assertType(VariantStr);
  });
});
