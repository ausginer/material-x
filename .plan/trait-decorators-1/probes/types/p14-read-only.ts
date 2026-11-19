// P14. Read-only attributes: `readonly accessor`, a getter alone, and a
// decorated getter.
import attr from './attr-runtime.ts';
import { ControlledElement } from './element.ts';
import { Bool, Traits, type AttributeTable, type Converter } from './marker.ts';

/** An accessor decorator, as in P5. */
export function attrAccessor<T>(
  _converter: Converter<T>,
): <This extends HTMLElement>(
  target: ClassAccessorDecoratorTarget<This, T>,
  context: ClassAccessorDecoratorContext<This, T>,
) => void {
  throw new Error('removed by the flattener');
}

/** A getter decorator. */
export function attrGetter<T>(
  _converter: Converter<T>,
): <This extends HTMLElement>(
  target: (this: This) => T,
  context: ClassGetterDecoratorContext<This, T>,
) => void {
  throw new Error('removed by the flattener');
}

// (a) `readonly accessor`, with and without a decorator.
export class ReadonlyAuto extends ControlledElement {
  @attrAccessor(Bool) readonly accessor busy!: boolean; // expected: unknown
}
export class ReadonlyAutoBare extends ControlledElement {
  readonly accessor busy!: boolean; // expected: unknown
}
export abstract class ReadonlyAutoAbstract extends ControlledElement {
  abstract readonly accessor busy: boolean; // expected: unknown
}

// (b) A getter alone, written out.
export class GetterOnly extends ControlledElement {
  static override observedAttributes: readonly string[] = ['busy'];
  get busy(): boolean {
    return attr.get(this, 'busy', Bool);
  }
}

// (c) A decorated getter, with a body.
export class DecoratedGetter extends ControlledElement {
  @attrGetter(Bool) get busy(): boolean {
    return false; // the flattener would replace the body
  }
}

// (d) A decorated abstract getter.
export abstract class DecoratedAbstractGetter extends ControlledElement {
  @attrGetter(Bool) abstract get busy(): boolean; // expected: an error, a decorator on an abstract member
}

// (e) A table and an abstract getter alone.
export abstract class TableGetter extends ControlledElement {
  static readonly attributes: AttributeTable<TableGetter> = { busy: Bool };
  abstract get busy(): boolean;
}

// What a component and a subclass can do with each read-only form.
export class UsesGetterOnly extends Traits<[GetterOnly]> {
  set(): void {
    this.busy = true; // expected: TS2540, read-only
  }
}
export class SubGetterOnly extends UsesGetterOnly {
  override get busy(): boolean {
    return true; // expected: ok
  }
  override set busy(_value: boolean) {} // expected: unknown, a setter added by a subclass
}
export class UsesTableGetter extends Traits<[TableGetter]> {
  set(): void {
    this.busy = true; // expected: TS2540
  }
}
export class FieldTableGetter extends Traits<[TableGetter]> {
  override busy: boolean = false; // expected: TS2610
}
export class UsesDecoratedGetter extends Traits<[DecoratedGetter]> {
  set(): void {
    this.busy = true; // expected: TS2540
  }
}
export class UsesReadonlyAuto extends Traits<[ReadonlyAuto]> {
  set(): void {
    this.busy = true; // expected: unknown
  }
}
export class SubReadonlyAuto extends UsesReadonlyAuto {
  override get busy(): boolean {
    return true; // expected: unknown
  }
}
