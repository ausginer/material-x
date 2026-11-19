// P2. Form A: the decorator marks the traits, and a merged interface carries
// their types. Each case notes what was expected before the run.
import { ControlledElement, traits } from './element.ts';
import {
  Counted,
  Disableable,
  FocusForwarding,
  NamedNumber,
  NamedString,
} from './traits.ts';

// (a) The trait's members are on the component's type, and `super` is the base.
export interface Button extends Disableable, FocusForwarding {}
@traits(Disableable, FocusForwarding)
export class Button extends ControlledElement {
  check(): boolean {
    return this.disabled; // expected: ok
  }
  readSuper(): boolean {
    return super.disabled; // expected: error, the base has no `disabled`
  }
}

// (b) The component overrides a trait's accessor, without `override`.
export interface Linkish extends Disableable {}
@traits(Disableable)
export class Linkish extends ControlledElement {
  get disabled(): boolean {
    return true; // expected: unknown
  }
  set disabled(_value: boolean) {}
}

// (c) The same with `override`.
export interface Linkish2 extends Disableable {}
@traits(Disableable)
export class Linkish2 extends ControlledElement {
  override get disabled(): boolean {
    return true; // expected: TS4113, not declared in the base class
  }
  override set disabled(_value: boolean) {}
}

// (d) A subclass of a traited component overrides the trait's accessor.
export class SubButton extends Button {
  override get disabled(): boolean {
    return false; // expected: ok
  }
  override set disabled(_value: boolean) {}
}

// (e) RF-57: a subclass overrides a trait's class field with an accessor.
export interface Counter extends Counted {}
@traits(Counted)
export class Counter extends ControlledElement {}
export class SubCounter extends Counter {
  override get count(): number {
    return 1; // expected: unknown; RF-57 wants TS2610
  }
  override set count(_value: number) {}
}

// (f) Two traits declare one member with different types.
export interface Clash extends NamedString, NamedNumber {} // expected: TS2320
@traits(NamedString, NamedNumber)
export class Clash extends ControlledElement {}

// (g) A host type for a use* helper is the trait class itself.
export function useDisableable(host: Disableable): void {
  host.disabled = true;
}
export function setUp(button: Button): void {
  useDisableable(button); // expected: ok
}

// (h) `instanceof` narrows to the trait's instance type.
export function isDisabled(element: Element): boolean {
  return element instanceof Disableable && element.disabled; // expected: ok
}

// (i) A subclass of the component calls the trait's method through `super`.
export class SubButton2 extends Button {
  override focus(options?: FocusOptions): void {
    super.focus(options); // expected: ok
  }
}
