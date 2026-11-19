// P13. Ways a class trait can declare an attribute under form D, with no
// `@attr`. For each: the component writes it, a subclass overrides it with
// an accessor, and a component's own field over it is reported.
import attr from './attr-runtime.ts';
import { ControlledElement } from './element.ts';
import {
  attr as attrDecorator,
  Bool,
  Str,
  Traits,
  type AttributeTable,
} from './marker.ts';

// (1) An explicit get/set pair, with `observedAttributes`.
export class Explicit extends ControlledElement {
  static override observedAttributes: readonly string[] = ['disabled'];
  get disabled(): boolean {
    return attr.get(this, 'disabled', Bool);
  }
  set disabled(value: boolean) {
    attr.set(this, 'disabled', value, Bool);
  }
}

// (2) A static attribute table and a `declare`d field.
export class Declared extends ControlledElement {
  static readonly attributes: AttributeTable<Declared> = { disabled: Bool };
  declare disabled: boolean;
}

// (3) A static attribute table and abstract accessor members.
export abstract class AbstractPair extends ControlledElement {
  static readonly attributes: AttributeTable<AbstractPair> = { disabled: Bool };
  abstract get disabled(): boolean;
  abstract set disabled(value: boolean);
}

// (4) A static attribute table and an abstract auto-accessor.
export abstract class AbstractAuto extends ControlledElement {
  static readonly attributes: AttributeTable<AbstractAuto> = { disabled: Bool };
  abstract accessor disabled: boolean;
}

// (5) A static attribute table and a plain auto-accessor.
export class PlainAuto extends ControlledElement {
  static readonly attributes: AttributeTable<PlainAuto> = { disabled: Bool };
  accessor disabled!: boolean;
}

// (6) The table checks the converter against the member.
export abstract class WrongConverter extends ControlledElement {
  static readonly attributes: AttributeTable<WrongConverter> = {
    disabled: Str, // expected: an error, a string converter on a boolean
  };
  abstract accessor disabled: boolean;
}

// (7) The table names a member that the trait doesn't have.
export abstract class UnknownKey extends ControlledElement {
  static readonly attributes: AttributeTable<UnknownKey> = {
    hidden2: Bool, // expected: an error
  };
  abstract accessor disabled: boolean;
}

// For each form: a component writes the attribute, a subclass overrides it,
// and a component's own field over it.
export class UsesExplicit extends Traits<[Explicit]> {
  enable(): void {
    this.disabled = false; // expected: ok
  }
}
export class SubExplicit extends UsesExplicit {
  override get disabled(): boolean {
    return true; // expected: ok
  }
  override set disabled(_value: boolean) {}
}
export class FieldExplicit extends Traits<[Explicit]> {
  override disabled: boolean = false; // expected: TS2610
}

export class UsesDeclared extends Traits<[Declared]> {
  enable(): void {
    this.disabled = false; // expected: ok
  }
}
export class SubDeclared extends UsesDeclared {
  override get disabled(): boolean {
    return true; // expected: TS2611, RF-54's case
  }
  override set disabled(_value: boolean) {}
}
export class FieldDeclared extends Traits<[Declared]> {
  override disabled: boolean = false; // expected: no error, the shadowing hazard
}

// The abstract forms (3) and (4) were expected to behave as (1). Observed:
// each component fails with TS2515, and the own field gives no TS2610,
// because the field implements the abstract member.
export class UsesAbstractPair extends Traits<[AbstractPair]> {
  enable(): void {
    this.disabled = false; // expected: ok
  }
}
export class SubAbstractPair extends UsesAbstractPair {
  override get disabled(): boolean {
    return true; // expected: ok
  }
  override set disabled(_value: boolean) {}
}
export class FieldAbstractPair extends Traits<[AbstractPair]> {
  override disabled: boolean = false; // expected: TS2610
}

export class UsesAbstractAuto extends Traits<[AbstractAuto]> {
  enable(): void {
    this.disabled = false; // expected: ok
  }
}
export class SubAbstractAuto extends UsesAbstractAuto {
  override get disabled(): boolean {
    return true; // expected: ok
  }
  override set disabled(_value: boolean) {}
}
export class FieldAbstractAuto extends Traits<[AbstractAuto]> {
  override disabled: boolean = false; // expected: TS2610
}

export class SubPlainAuto extends Traits<[PlainAuto]> {
  override get disabled(): boolean {
    return true; // expected: ok
  }
  override set disabled(_value: boolean) {}
}
export class FieldPlainAuto extends Traits<[PlainAuto]> {
  override disabled: boolean = false; // expected: TS2610
}

// (8) `@attr` on an auto-accessor, for comparison.
export class Decorated extends ControlledElement {
  @attrDecorator(Bool) accessor disabled!: boolean;
}
export class SubDecorated extends Traits<[Decorated]> {
  override get disabled(): boolean {
    return true; // expected: ok
  }
  override set disabled(_value: boolean) {}
}
export class FieldDecorated extends Traits<[Decorated]> {
  override disabled: boolean = false; // expected: TS2610
}

// (9) A static table and a `declare readonly` field, for a read-only attribute.
export class DeclaredReadonly extends ControlledElement {
  static readonly attributes: AttributeTable<DeclaredReadonly> = { busy: Bool };
  declare readonly busy: boolean;
}
export class UsesDeclaredReadonly extends Traits<[DeclaredReadonly]> {
  set(): void {
    this.busy = true; // expected: TS2540
  }
}
export class SubDeclaredReadonly extends UsesDeclaredReadonly {
  override get busy(): boolean {
    return true; // expected: TS2611
  }
}

// (10) An explicit pair with the wrong converter.
export class WrongExplicit extends ControlledElement {
  get disabled(): boolean {
    return attr.get(this, 'disabled', Str); // expected: an error, string | null isn't boolean
  }
  set disabled(value: boolean) {
    attr.set(this, 'disabled', value, Str); // expected: unknown
  }
}
