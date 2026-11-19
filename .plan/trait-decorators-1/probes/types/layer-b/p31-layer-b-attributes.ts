// P31. Layer (b)'s attribute form on layer (a), with core's real
// ControlledElement and converters. Each case states its expected result.
import attr, {
  Bool,
  Str,
  type ConverterOf,
} from '../../../../../packages/core/src/attribute.ts';
import { ControlledElement } from '../../../../../packages/core/src/element.ts';
import { compose, trait, type Composed } from './piirre.ts';
import { ButtonLike, Disableable, Linkable } from './traits.ts';
import { AnyElement, attributes, type AttributeTable } from './ydin.ts';

// (a) A component with attribute traits: writes, an own field, a subclass
// override of an attribute (TextFieldCore's `value`), and RF-57's shape.
const Base: Composed<
  typeof ControlledElement,
  [typeof Disableable, typeof Linkable, typeof ButtonLike]
> = compose(ControlledElement);
export class Writes extends Base {
  check(): boolean {
    this.href = null; // expected: ok
    this.color = 'tonal'; // expected: ok
    return this.disabled; // expected: ok
  }
}
export class OwnField extends Base {
  override disabled = true; // expected: TS2610
}
export class SubclassOverride extends Writes {
  override get href(): string | null {
    return null; // expected: ok
  }
  override set href(_value: string | null) {}
}
export class Counted {
  static {
    trait(this);
  }
  count: number = 0;
}
const WithField: Composed<typeof ControlledElement, [typeof Counted]> =
  compose(ControlledElement);
export class AccessorOverField extends WithField {
  override get count(): number {
    // expected: TS2611
    return 0;
  }
}

// (b) The table is checked against the members.
export class WrongConverter extends AnyElement {
  static {
    attributes(this, { disabled: Str }); // expected: TS2322, a string converter on a boolean
  }
  accessor disabled!: boolean;
}
export class WrongNullability extends AnyElement {
  static {
    attributes(this, { label: Str }); // expected: TS2322, Str reads null
  }
  accessor label!: string;
}
export class NarrowConverter extends AnyElement {
  static {
    attributes(this, { href: Str as ConverterOf<'a' | 'b'> }); // expected: TS2322
  }
  accessor href!: string | null;
}
export class UnknownKey extends AnyElement {
  static {
    attributes(this, { disabld: Bool }); // expected: TS2353
  }
  accessor disabled!: boolean;
}
export class MethodKey extends AnyElement {
  static {
    attributes(this, { disabled: Bool, toggle: Bool }); // expected: TS2353, a method isn't an attribute
  }
  accessor disabled!: boolean;
  toggle(): void {}
}
export class ElementKey extends AnyElement {
  static {
    attributes(this, { disabled: Bool, hidden: Bool }); // expected: TS2353, the base's member
  }
  accessor disabled!: boolean;
}
// A class with no attribute member: its table type has no key to check
// against, so AttributeTable makes it accept no entry.
export class NoAttributes extends AnyElement {
  static {
    attributes(this, { hidden: Bool }); // expected: TS2322
  }
  toggle(): void {}
}

// (c) The table as a static member instead. It reaches the component through
// Statics<T>, and two tables intersect with no error.
export class StaticDisableable extends AnyElement {
  static readonly attributes: AttributeTable<StaticDisableable> = {
    disabled: Bool,
  };
  accessor disabled!: boolean;
}
export class StaticLinkable extends AnyElement {
  static readonly attributes: AttributeTable<StaticLinkable> = { href: Str };
  accessor href!: string | null;
}
const StaticTables: Composed<
  typeof ControlledElement,
  [typeof StaticDisableable, typeof StaticLinkable]
> = compose(ControlledElement);
export class FromStaticTables extends StaticTables {}
export const merged: unknown = [
  FromStaticTables.attributes.disabled, // expected: ok, though nothing merges the tables
  FromStaticTables.attributes.href, // expected: ok
];

// (d) A core helper that defines the accessors at runtime, with `declare`
// members: valid JavaScript unbuilt, but the declaration kind is a property.
export class Declared extends AnyElement {
  static {
    attributes(this, { disabled: Bool });
  }
  declare disabled: boolean;
}
const DeclaredBase: Composed<typeof ControlledElement, [typeof Declared]> =
  compose(ControlledElement);
export class DeclaredOwnField extends DeclaredBase {
  override disabled = true; // expected: no error, the field shadows the attribute
}
export class DeclaredOverride extends DeclaredBase {
  override get disabled(): boolean {
    // expected: TS2611, RF-54's case
    return false;
  }
  override set disabled(_value: boolean) {}
}

// (e) An explicit get/set pair: valid JavaScript unbuilt, and every check, but
// the attribute's name is unchecked text and observedAttributes is separate.
export class Explicit extends AnyElement {
  get disabled(): boolean {
    return attr.get(this, 'disabld', Bool); // expected: ok, a typo nothing reports
  }
  set disabled(value: boolean) {
    attr.set(this, 'disabled', value, Bool);
  }
}

// (f) A shared table constant, as components pass DISABLEABLE_ATTRS to
// useContext at runtime. The converters are still checked; an extra key in a
// non-fresh object is not, so the flattener checks it.
export const SHARED_ATTRS: Readonly<{ href: ConverterOf<string> }> = {
  href: Str,
};
export const WRONG_ATTRS: Readonly<{ href: ConverterOf<boolean> }> = {
  href: Bool,
};
export const EXTRA_ATTRS: Readonly<{
  href: ConverterOf<string>;
  extra: ConverterOf<string>;
}> = { href: Str, extra: Str };
export class SharedTable extends AnyElement {
  static {
    attributes(this, SHARED_ATTRS); // expected: ok
  }
  accessor href!: string | null;
}
export class SharedWrong extends AnyElement {
  static {
    attributes(this, WRONG_ATTRS); // expected: TS2345
  }
  accessor href!: string | null;
}
export class SharedExtra extends AnyElement {
  static {
    attributes(this, EXTRA_ATTRS); // expected: no error, the flattener reports it
  }
  accessor href!: string | null;
}
