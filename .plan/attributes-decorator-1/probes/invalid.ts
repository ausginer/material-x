// P46 (f)-(r): misuse. Each `// expect:` line names the case. The first eight
// repeat core's attribute-traits.declaration.test.ts against the decorator.
import {
  AnyElement,
  trait,
} from '../../trait-decorator-1/probes/composition.ts';
import { attributes, Bool, type ConverterOf, Str } from './attributes.ts';

declare const NARROW: ConverterOf<'a' | 'b'>;
const WRONG_ATTRS: Readonly<{ href: ConverterOf<boolean> }> = { href: Bool };
const EXTRA_ATTRS: Readonly<{
  href: ConverterOf<string>;
  hidden: ConverterOf<boolean>;
}> = { href: Str, hidden: Bool };

// (f) A string converter on a boolean. expect: TS1238
@trait
@attributes({ disabled: Str })
export class WrongConverter extends AnyElement {
  accessor disabled!: boolean;
}

// (g) Str reads null into a member that can't be null. expect: TS1238
@trait
@attributes({ label: Str })
export class WrongNullability extends AnyElement {
  accessor label!: string;
}

// (h) A converter narrower than the member. expect: TS1238
@trait
@attributes({ href: NARROW })
export class NarrowConverter extends AnyElement {
  accessor href!: string | null;
}

// (i) A key that names no member. expect: TS1238
@trait
@attributes({ disabld: Bool })
export class UnknownKey extends AnyElement {
  accessor disabled!: boolean;
}

// (j) A key that names a method. expect: TS1238
@trait
@attributes({ disabled: Bool, toggle: Bool })
export class MethodKey extends AnyElement {
  accessor disabled!: boolean;
  toggle(): void {}
}

// (k) A key that names HTMLElement's member. expect: TS1238
@trait
@attributes({ disabled: Bool, hidden: Bool })
export class ElementKey extends AnyElement {
  accessor disabled!: boolean;
}

// (l) A class with no attribute member. expect: TS1238
@trait
@attributes({ hidden: Bool })
export class NoAttributes extends AnyElement {
  toggle(): void {}
}

// (m) A shared constant whose converter doesn't fit. expect: TS1238
@trait
@attributes(WRONG_ATTRS)
export class SharedWrong extends AnyElement {
  accessor href!: string | null;
}

// (n) A shared constant with an extra key, which the static-block form
// accepted because a constant isn't a fresh literal. expect: TS1238
@trait
@attributes(EXTRA_ATTRS)
export class SharedExtra extends AnyElement {
  accessor href!: string | null;
}

// (o) Bare, not called. expect: an error
@trait
@attributes
export class Bare extends AnyElement {
  accessor open!: boolean;
}

// (p) The old static-block form. expect: TS2554
@trait
export class Old extends AnyElement {
  static {
    attributes(this, { open: Bool });
  }

  accessor open!: boolean;
}

// (q) On a member. expect: TS1241 or TS1240-family
export class OnMember extends AnyElement {
  @attributes({ open: Bool })
  accessor open!: boolean;
}

// (r) The order reversed. expect: no error from TypeScript; the plugin
// refuses it
@attributes({ open: Bool })
@trait
export class Reversed extends AnyElement {
  accessor open!: boolean;
}
