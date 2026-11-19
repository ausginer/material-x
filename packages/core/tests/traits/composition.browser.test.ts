// oxlint-disable typescript/no-extraneous-class
import { describe, expect, it } from 'vitest';
import {
  bound,
  compose,
  impl,
  trait,
  type Bound,
} from '../../src/traits/composition.ts';

const AnyObject: Bound<object> = bound();

describe('trait', () => {
  it('should make an object with the brand an instance', () => {
    const $named = Symbol('Named');
    class Named extends AnyObject {
      static {
        trait(this, $named);
      }
    }

    expect({ [$named]: true } instanceof Named).toBe(true);
  });

  it('should not make an object without the brand an instance', () => {
    class Named extends AnyObject {
      static {
        trait(this);
      }
    }

    expect({} instanceof Named).toBe(false);
  });

  it('should not make null an instance', () => {
    class Named extends AnyObject {
      static {
        trait(this);
      }
    }

    expect((null as unknown) instanceof Named).toBe(false);
  });
});

describe('impl', () => {
  it('should brand every instance of the target', () => {
    const $named = Symbol('Named');
    class Named extends AnyObject {
      static {
        trait(this, $named);
      }
    }
    class Component {
      static {
        impl(this, $named);
      }
    }

    expect(new Component() instanceof Named).toBe(true);
  });

  it('should brand a subclass of the target', () => {
    const $named = Symbol('Named');
    class Named extends AnyObject {
      static {
        trait(this, $named);
      }
    }
    class Component {
      static {
        impl(this, $named);
      }
    }
    class Subclass extends Component {}

    expect(new Subclass() instanceof Named).toBe(true);
  });

  it('should install each brand as a non-enumerable, read-only value', () => {
    const $named = Symbol('Named');
    class Component {
      static {
        impl(this, $named);
      }
    }

    expect(
      Object.getOwnPropertyDescriptor(Component.prototype, $named),
    ).toEqual({
      value: true,
      writable: false,
      enumerable: false,
      configurable: false,
    });
  });

  it('should leave the target out of a trait whose brand it lacks', () => {
    class Named extends AnyObject {
      static {
        trait(this);
      }
    }
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
