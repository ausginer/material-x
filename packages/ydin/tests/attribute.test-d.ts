// oxlint-disable typescript/no-unsafe-type-assertion
import { assertType, describe, expectTypeOf, it } from 'vitest';
import attr, { Str, type ConverterOf } from '../src/attribute.ts';

const VariantStr = Str as ConverterOf<'primary' | 'secondary'>;

describe('attribute types', () => {
  it('should narrow attr.get through a typed string converter', () => {
    const host = null as unknown as HTMLDivElement;

    expectTypeOf(attr.get(host, 'variant', VariantStr)).toEqualTypeOf<
      'primary' | 'secondary' | null
    >();
  });

  it('should accept matching string literals in attr.set', () => {
    const host = null as unknown as HTMLDivElement;

    attr.set(host, 'variant', 'primary', VariantStr);
    attr.set(host, 'variant', 'secondary', VariantStr);
    attr.set(host, 'variant', null, VariantStr);
  });

  it('should reject non-matching string literals in attr.set', () => {
    const host = null as unknown as HTMLDivElement;

    // @ts-expect-error: typed converters should keep the narrowed string union
    attr.set(host, 'variant', 'unexpected', VariantStr);
  });

  it('should allow compile-time converter aliases to be reused', () => {
    assertType<ConverterOf<'primary' | 'secondary'>>(VariantStr);
  });
});
