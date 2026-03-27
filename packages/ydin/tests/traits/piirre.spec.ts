import type { Constructor } from 'type-fest';
import { describe, expect, it } from 'vitest';
import { impl, trait } from '../../src/traits/piirre.ts';

describe('piirre', () => {
  it('should return a new subclass when applying a trait directly', () => {
    class Base {
      readonly base = true;
    }

    const $named: unique symbol = Symbol('Named');

    const Named = trait(
      (base) =>
        class NamedBase extends base {
          name = 'named';
        },
      $named,
    );

    expect(Named(Base)).not.toBe(Base);
  });

  it('should preserve instanceof Base after direct trait application', () => {
    class Base {
      readonly base = true;
    }

    const $named: unique symbol = Symbol('Named');

    const Named = trait(
      (base) =>
        class NamedBase extends base {
          name = 'named';
        },
      $named,
    );

    expect(new (Named(Base))()).toBeInstanceOf(Base);
  });

  it('should identify applied instances through instanceof Trait', () => {
    class Base {
      readonly base = true;
    }

    const $named: unique symbol = Symbol('Named');

    const Named = trait(
      (base) =>
        class NamedBase extends base {
          name = 'named';
        },
      $named,
    );

    expect(new (Named(Base))()).toBeInstanceOf(Named);
  });

  it('should keep differently branded traits distinct at runtime', () => {
    class Base {
      readonly base = true;
    }

    const $first: unique symbol = Symbol('First');
    const $second: unique symbol = Symbol('Second');

    const First = trait(
      (base) =>
        class FirstValue extends base {
          value = 'value';
        },
      $first,
    );

    const Second = trait(
      (base) =>
        class SecondValue extends base {
          value = 'value';
        },
      $second,
    );

    const first = new (First(Base))();

    expect(first).toBeInstanceOf(First);
    expect(first).not.toBeInstanceOf(Second);
  });

  it('should apply tuple traits in declaration order', () => {
    class Base {
      readonly baseLabel = 'base';

      get order(): readonly string[] {
        return [this.baseLabel];
      }
    }

    const $first: unique symbol = Symbol('First');
    const $second: unique symbol = Symbol('Second');

    const First = trait(
      (base: typeof Base) =>
        class FirstOrder extends base {
          override get order(): readonly string[] {
            return [...super.order, 'first'];
          }
        },
      $first,
    );

    const Second = trait(
      (base: typeof Base) =>
        class SecondOrder extends base {
          override get order(): readonly string[] {
            return [...super.order, 'second'];
          }
        },
      $second,
    );

    const Combined = impl(Base, [First, Second] as const);

    expect(new Combined().order).toEqual(['base', 'first', 'second']);
  });

  it('should throw when a transformer returns the same constructor', () => {
    class Base {
      readonly base = true;
    }

    const $broken: unique symbol = Symbol('Broken');

    const Broken = trait((base) => base, $broken);

    expect(() => Broken(Base)).toThrow(TypeError);
  });

  it('should throw when a transformer returns an unrelated constructor', () => {
    class Base {
      readonly base = true;
    }

    class Unrelated {
      readonly unrelated = true;
    }

    const $broken: unique symbol = Symbol('Broken');

    const Broken = trait(
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      () => Unrelated as unknown as Constructor<Base> & typeof Base,
      $broken,
    );

    expect(() => Broken(Base)).toThrow(TypeError);
  });
});
