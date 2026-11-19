// P6. How a trait's member kind meets an override, and what the merge
// doesn't cover.
import { ControlledElement } from './element.ts';
import { attr } from './p5-attribute-accessor.ts';
import { Disableable } from './traits.ts';

type Converter<T> = Readonly<{
  from(value: string | null): T;
  to(value: T): string | null;
}>;
declare const Str: Converter<string | null>;

// (a) A trait field written with `declare`: a subclass's accessor override.
export class DeclaredValue extends ControlledElement {
  declare value: string | null;
}
export interface FieldA extends DeclaredValue {}
export class FieldA extends ControlledElement {}
export class SubFieldA extends FieldA {
  override get value(): string | null {
    return null; // expected: TS2611, RF-54's case
  }
  override set value(_value: string | null) {}
}

// (b) A trait auto-accessor: a subclass's accessor override.
export class AccessorValue extends ControlledElement {
  @attr(Str) accessor value!: string | null;
}
export interface FieldB extends AccessorValue {}
export class FieldB extends ControlledElement {}
export class SubFieldB extends FieldB {
  override get value(): string | null {
    return null; // expected: ok
  }
  override set value(_value: string | null) {}
}

// (c) The component's own accessor over a trait accessor, as TextFieldCore's
// `value` is today, with an incompatible type.
export interface Incompatible extends Disableable {}
export class Incompatible extends ControlledElement {
  get disabled(): string {
    return ''; // expected: an error
  }
  set disabled(_value: string) {}
}

// (d) The component's own field over a trait accessor.
export interface OwnField extends Disableable {}
export class OwnField extends ControlledElement {
  disabled: boolean = false; // expected: unknown; the field would shadow the trait accessor
}

// (e) A trait's static member isn't on the component's constructor.
export class FormTrait extends ControlledElement {
  static formAssociated: boolean = true;
}
export interface Form extends FormTrait {}
export class Form extends ControlledElement {}
export const associated: boolean = Form.formAssociated; // expected: TS2339

// (f) An abstract trait class.
export abstract class Abstract extends ControlledElement {
  get flag(): boolean {
    return true;
  }
}
export interface UsesAbstract extends Abstract {}
export class UsesAbstract extends ControlledElement {}
export function readFlag(element: Element): boolean {
  return element instanceof Abstract && element.flag; // expected: ok
}
