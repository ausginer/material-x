// oxlint-disable typescript/no-unsafe-type-assertion, max-classes-per-file, eslint/class-methods-use-this
import { describe, expectTypeOf, it } from 'vitest';
import { Bool, Str, type ConverterOf } from '../../src/attribute.ts';
import {
  AnyElement,
  attributes,
  type Props,
} from '../../src/traits/attribute-traits.ts';
import { trait } from '../../src/traits/composition.ts';

// Each attribute member is a `declare` field rather than `accessor name!: T`:
// Vitest's typecheck collector can't walk an `accessor` member. The table's
// type reads a member's type, which is the same in both forms.

@trait
class Disableable extends AnyElement {
  static {
    attributes(this, { disabled: Bool });
  }

  declare disabled: boolean;
}

@trait
class Linkable extends AnyElement {
  static {
    attributes(this, { href: Str });
  }

  declare href: string | null;
}

@trait
class Focusing extends AnyElement {
  override focus(_options?: FocusOptions): void {}
}

const SHARED_ATTRS: Readonly<{ href: ConverterOf<string> }> = { href: Str };
declare const NARROW: ConverterOf<'a' | 'b'>;
const WRONG_ATTRS: Readonly<{ href: ConverterOf<boolean> }> = { href: Bool };

describe('attributes', () => {
  it('should accept a converter that reads the member', () => {
    class Checked extends AnyElement {
      static {
        attributes(this, { checked: Bool });
      }

      declare checked: boolean;
    }

    expectTypeOf<Checked['checked']>().toEqualTypeOf<boolean>();
  });

  it("should reject a converter of another member's type", () => {
    class WrongConverter extends AnyElement {
      static {
        // @ts-expect-error: a string converter on a boolean
        attributes(this, { disabled: Str });
      }

      declare disabled: boolean;
    }

    expectTypeOf<WrongConverter>().toExtend<HTMLElement>();
  });

  it('should reject a converter that reads null into a member that cannot be null', () => {
    class WrongNullability extends AnyElement {
      static {
        // @ts-expect-error: Str reads null
        attributes(this, { label: Str });
      }

      declare label: string;
    }

    expectTypeOf<WrongNullability>().toExtend<HTMLElement>();
  });

  it('should reject a converter narrower than the member', () => {
    class NarrowConverter extends AnyElement {
      static {
        // @ts-expect-error: it couldn't write every value of the member
        attributes(this, { href: NARROW });
      }

      declare href: string | null;
    }

    expectTypeOf<NarrowConverter>().toExtend<HTMLElement>();
  });

  it('should reject a key that names no member', () => {
    class UnknownKey extends AnyElement {
      static {
        // @ts-expect-error: no member is named `disabld`
        attributes(this, { disabld: Bool });
      }

      declare disabled: boolean;
    }

    expectTypeOf<UnknownKey>().toExtend<HTMLElement>();
  });

  it('should reject a key that names a method', () => {
    class MethodKey extends AnyElement {
      static {
        // @ts-expect-error: a method isn't an attribute
        attributes(this, { disabled: Bool, toggle: Bool });
      }

      declare disabled: boolean;

      toggle(): void {}
    }

    expectTypeOf<MethodKey>().toExtend<HTMLElement>();
  });

  it("should reject a key that names the base's member", () => {
    class ElementKey extends AnyElement {
      static {
        // @ts-expect-error: `hidden` is HTMLElement's
        attributes(this, { disabled: Bool, hidden: Bool });
      }

      declare disabled: boolean;
    }

    expectTypeOf<ElementKey>().toExtend<HTMLElement>();
  });

  it('should reject every key for a class with no attribute member', () => {
    class NoAttributes extends AnyElement {
      static {
        // @ts-expect-error: the class has no attribute member
        attributes(this, { hidden: Bool });
      }

      toggle(): void {}
    }

    expectTypeOf<NoAttributes>().toExtend<HTMLElement>();
  });

  it('should accept a shared table constant whose converters fit', () => {
    class SharedTable extends AnyElement {
      static {
        attributes(this, SHARED_ATTRS);
      }

      declare href: string | null;
    }

    expectTypeOf<SharedTable['href']>().toEqualTypeOf<string | null>();
  });

  it('should reject a shared table constant whose converters do not fit', () => {
    class SharedWrong extends AnyElement {
      static {
        // @ts-expect-error: a boolean converter on a string
        attributes(this, WRONG_ATTRS);
      }

      declare href: string | null;
    }

    expectTypeOf<SharedWrong>().toExtend<HTMLElement>();
  });
});

describe('Props', () => {
  it("should make a trait's attribute members optional props", () => {
    expectTypeOf<Props<typeof Disableable>>().toEqualTypeOf<{
      disabled?: boolean;
    }>();
  });

  it('should give no props for a trait without attribute members', () => {
    expectTypeOf<keyof Props<typeof Focusing>>().toBeNever();
  });

  it('should combine the props of a tuple of traits', () => {
    expectTypeOf<
      Props<readonly [typeof Disableable, typeof Linkable]>
    >().toEqualTypeOf<{ disabled?: boolean } & { href?: string | null }>();
  });

  it('should reject a value of the wrong type', () => {
    // @ts-expect-error: `disabled` is a boolean
    const props: Props<typeof Disableable> = { disabled: 'yes' };

    expectTypeOf(props).not.toBeNever();
  });
});
