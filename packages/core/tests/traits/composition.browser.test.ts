// oxlint-disable typescript/no-extraneous-class
import { describe, expect, it } from 'vitest';
import * as composition from '../../src/traits/composition.ts';
import { bound, impl, type Bound } from '../../src/traits/composition.ts';
import * as named from './named.ts';
import { Named } from './named.ts';

// Called through the namespace: the build rejects a direct `compose()` call
// outside a composition's constant, and any use of `trait` but `@trait`, and
// these cases call them unbuilt.
const { compose } = composition;

// The trait's build exports its brand, `$` and the class name with a
// lower-case first letter.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const { $named } = named as typeof named & Readonly<{ $named: symbol }>;

const AnyObject: Bound<object> = bound();

describe('trait', () => {
  it('should throw when the decorator is evaluated unbuilt', () => {
    expect(() => {
      composition.trait(Named, {} as ClassDecoratorContext<typeof Named>);
    }).toThrow('@trait is compiled by @ydinjs/vite-traits-plugin');
  });

  it('should make an object with the brand an instance', () => {
    expect({ [$named]: true } instanceof Named).toBe(true);
  });

  it('should not make an object without the brand an instance', () => {
    expect({} instanceof Named).toBe(false);
  });

  it('should not make null an instance', () => {
    expect((null as unknown) instanceof Named).toBe(false);
  });
});

describe('impl', () => {
  it('should brand every instance of the target', () => {
    class Component {
      static {
        impl(this, $named);
      }
    }

    expect(new Component() instanceof Named).toBe(true);
  });

  it('should brand a subclass of the target', () => {
    class Component {
      static {
        impl(this, $named);
      }
    }
    class Subclass extends Component {}

    expect(new Subclass() instanceof Named).toBe(true);
  });

  it('should install each brand as a non-enumerable, read-only value', () => {
    const $other = Symbol('Other');
    class Component {
      static {
        impl(this, $other);
      }
    }

    expect(
      Object.getOwnPropertyDescriptor(Component.prototype, $other),
    ).toEqual({
      value: true,
      writable: false,
      enumerable: false,
      configurable: false,
    });
  });

  it('should leave the target out of a trait whose brand it lacks', () => {
    class Component {
      static {
        impl(this, Symbol('Other'));
      }
    }

    expect(new Component() instanceof Named).toBe(false);
  });
});

describe('bound', () => {
  it('should be null at runtime', () => {
    expect(bound()).toBeNull();
  });
});

describe('compose', () => {
  it('should return a bound', () => {
    expect(compose(AnyObject)).toBeNull();
  });

  it('should throw for a base that is not a bound', () => {
    class Base {}

    expect(() => compose(Base)).toThrow(Error);
  });
});
