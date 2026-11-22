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
@attributes({ disabled: Bool })
class Disableable extends AnyElement {
  declare disabled: boolean;
}

@trait
@attributes({ href: Str })
class Linkable extends AnyElement {
  declare href: string | null;
}

@trait
class Focusing extends AnyElement {
  override focus(_options?: FocusOptions): void {}
}

const SHARED_ATTRS: Readonly<{ href: ConverterOf<string> }> = { href: Str };
declare const NARROW: ConverterOf<'a' | 'b'>;
const WRONG_ATTRS: Readonly<{ href: ConverterOf<boolean> }> = { href: Bool };
const EXTRA_ATTRS: Readonly<{
  href: ConverterOf<string>;
  label: ConverterOf<string>;
}> = { href: Str, label: Str };

describe('attributes', () => {
  it('should accept a converter that reads the member', () => {
    @trait
    @attributes({ checked: Bool })
    class Checked extends AnyElement {
      declare checked: boolean;
    }

    expectTypeOf<Checked['checked']>().toEqualTypeOf<boolean>();
  });

  it("should reject a converter of another member's type", () => {
    @trait
    // @ts-expect-error: a string converter on a boolean
    @attributes({ disabled: Str })
    class WrongConverter extends AnyElement {
      declare disabled: boolean;
    }

    expectTypeOf<WrongConverter>().toExtend<HTMLElement>();
  });

  it('should reject a converter that reads null into a member that cannot be null', () => {
    @trait
    // @ts-expect-error: Str reads null
    @attributes({ label: Str })
    class WrongNullability extends AnyElement {
      declare label: string;
    }

    expectTypeOf<WrongNullability>().toExtend<HTMLElement>();
  });

  it('should reject a converter narrower than the member', () => {
    @trait
    // @ts-expect-error: it couldn't write every value of the member
    @attributes({ href: NARROW })
    class NarrowConverter extends AnyElement {
      declare href: string | null;
    }

    expectTypeOf<NarrowConverter>().toExtend<HTMLElement>();
  });

  it('should reject a key that names no member', () => {
    @trait
    // @ts-expect-error: no member is named `disabld`
    @attributes({ disabld: Bool })
    class UnknownKey extends AnyElement {
      declare disabled: boolean;
    }

    expectTypeOf<UnknownKey>().toExtend<HTMLElement>();
  });

  it('should reject a key that names a method', () => {
    @trait
    // @ts-expect-error: a method isn't an attribute
    @attributes({ disabled: Bool, toggle: Bool })
    class MethodKey extends AnyElement {
      declare disabled: boolean;

      toggle(): void {}
    }

    expectTypeOf<MethodKey>().toExtend<HTMLElement>();
  });

  it('should reject a key that names a getter', () => {
    @trait
    // @ts-expect-error: a getter with no setter isn't an attribute
    @attributes({ disabled: Bool, active: Bool })
    class GetterKey extends AnyElement {
      declare disabled: boolean;

      get active(): boolean {
        return this.isConnected;
      }
    }

    expectTypeOf<GetterKey>().toExtend<HTMLElement>();
  });

  it("should reject a key that names the base's member", () => {
    @trait
    // @ts-expect-error: `hidden` is HTMLElement's
    @attributes({ disabled: Bool, hidden: Bool })
    class ElementKey extends AnyElement {
      declare disabled: boolean;
    }

    expectTypeOf<ElementKey>().toExtend<HTMLElement>();
  });

  it('should reject every key for a class with no attribute member', () => {
    @trait
    // @ts-expect-error: the class has no attribute member
    @attributes({ hidden: Bool })
    class NoAttributes extends AnyElement {
      toggle(): void {}
    }

    expectTypeOf<NoAttributes>().toExtend<HTMLElement>();
  });

  it('should accept a shared table constant whose converters fit', () => {
    @trait
    @attributes(SHARED_ATTRS)
    class SharedTable extends AnyElement {
      declare href: string | null;
    }

    expectTypeOf<SharedTable['href']>().toEqualTypeOf<string | null>();
  });

  it('should reject a shared table constant whose converters do not fit', () => {
    @trait
    // @ts-expect-error: a boolean converter on a string
    @attributes(WRONG_ATTRS)
    class SharedWrong extends AnyElement {
      declare href: string | null;
    }

    expectTypeOf<SharedWrong>().toExtend<HTMLElement>();
  });

  it('should reject a shared table constant with a key that names no member', () => {
    @trait
    // @ts-expect-error: no member is named `label`
    @attributes(EXTRA_ATTRS)
    class SharedExtra extends AnyElement {
      declare href: string | null;
    }

    expectTypeOf<SharedExtra>().toExtend<HTMLElement>();
  });

  it('should reject the decorator without a table', () => {
    @trait
    // @ts-expect-error: TS1270, `attributes` takes the table
    @attributes
    class Bare extends AnyElement {
      declare disabled: boolean;
    }

    expectTypeOf<Bare>().toExtend<HTMLElement>();
  });

  it('should reject a call with the class and the table', () => {
    @trait
    class Called extends AnyElement {
      static {
        // @ts-expect-error: TS2554, `attributes` takes the table alone
        attributes(this, { disabled: Bool });
      }

      declare disabled: boolean;
    }

    expectTypeOf<Called>().toExtend<HTMLElement>();
  });

  it("should leave a decorated class's member types its declared ones", () => {
    expectTypeOf<Linkable['href']>().toEqualTypeOf<string | null>();
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

  it('should give no props for a getter', () => {
    @trait
    @attributes({ disabled: Bool })
    class WithGetter extends AnyElement {
      declare disabled: boolean;

      get active(): boolean {
        return this.isConnected;
      }
    }

    expectTypeOf<Props<typeof WithGetter>>().toEqualTypeOf<{
      disabled?: boolean;
    }>();
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
