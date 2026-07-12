// oxlint-disable typescript/no-unsafe-type-assertion
import { assertType, describe, expectTypeOf, it } from 'vitest';
import { impl, trait } from '../../src/traits/piirre.ts';

class Base {
  base = true;
}

const $name: unique symbol = Symbol('Name');
const $count: unique symbol = Symbol('Count');

const Named = trait(
  (base) =>
    class NamedBase extends base {
      name = 'named';
    },
  $name,
);

const Counted = trait(
  (base) =>
    class CountedBase extends base {
      count = 1;
    },
  $count,
);

describe('piirre types', () => {
  it('should accumulate branded instance fields from tuple composition', () => {
    const Combined = impl(Base, [Named, Counted] as const);
    const instance = null as unknown as InstanceType<typeof Combined>;

    expectTypeOf(instance.base).toEqualTypeOf<boolean>();
    expectTypeOf(instance.name).toEqualTypeOf<string>();
    expectTypeOf(instance.count).toEqualTypeOf<number>();
  });

  it('should narrow through instanceof the applied trait shape', () => {
    const value = null as unknown as Base;

    if (value instanceof Named) {
      expectTypeOf(value.name).toEqualTypeOf<string>();
      // @ts-expect-error: a different trait field should not appear after narrowing
      assertType<{ count: number }>(value);
    }
  });

  it('should infer plain arrays weaker than tuple composition', () => {
    const traits = [Named, Counted];
    const Combined = impl(Base, traits);
    const instance = null as unknown as InstanceType<typeof Combined>;

    expectTypeOf(instance).toExtend<Base>();
    // @ts-expect-error: plain arrays should not preserve accumulated trait fields
    assertType<{ name: string; count: number }>(instance);
  });
});
