// P24. Layer (a): how a trait declares what it requires of its base, how
// `this` is typed, and groups, brands and Rust-like members.
import { ControlledElement } from './element.ts';
import { compose, trait, type Composed, type Traited } from './layer-a.ts';
import {
  AnyElement,
  Counted,
  Disableable,
  FocusForwarding,
  Internal,
  Labelled,
  Observing,
} from './traits-a.ts';

// (a) `this` in a trait's members is its bound's instance type plus its own
// members, so it calls the bound's members (traits-a.ts, Disableable) and its
// static side sees the bound's statics (Observing.observed). A trait with no
// bound that calls an element member fails. expected: TS2339
export class Unbound {
  static {
    trait(this);
  }
  hidden(): boolean {
    return this.hasAttribute('hidden');
  }
}

// (b) A nominal bound: Internal requires ControlledElement, whose ES-private
// member a plain HTMLElement lacks. expected: TS2344
const B1: Composed<typeof HTMLElement, [typeof Internal]> =
  compose(HTMLElement);
export class OnPlainElement extends B1 {}
// The same on ControlledElement. expected: ok
const B2: Composed<typeof ControlledElement, [typeof Internal]> =
  compose(ControlledElement);
export class OnControlled extends B2 {}

// (c) The static bound met: ControlledElement's constructor has
// `observedAttributes`. expected: ok, and the trait's static is the component's
const B3: Composed<typeof ControlledElement, [typeof Observing]> =
  compose(ControlledElement);
export class Observes extends B3 {}
export const observed: readonly string[] = Observes.observed();

// (d) `instanceof` a trait class narrows to its instance type. expected: ok
export function isOff(node: Node): boolean {
  return node instanceof Disableable && node.disabled;
}

// (e) The type brand: a trait whose members the bound already has.
// expected: TS2345 for a plain element, ok for an adopter
export function useFocusForwarding(_host: FocusForwarding): void {}
useFocusForwarding(document.createElement('div'));
const B4: Composed<typeof ControlledElement, [typeof FocusForwarding]> =
  compose(ControlledElement);
export class Forwards extends B4 {
  connect(): void {
    useFocusForwarding(this); // expected: ok
  }
}

// (f) A group is a tuple type, and a rest element spreads it. expected: ok
export type ButtonCoreTraits = readonly [
  typeof Disableable,
  typeof FocusForwarding,
];
export type ButtonCore = Traited<typeof ControlledElement, ButtonCoreTraits>;
export function useButtonCore(host: ButtonCore): boolean {
  return host.disabled;
}
const G1: Composed<
  typeof ControlledElement,
  [...ButtonCoreTraits, typeof Counted]
> = compose(ControlledElement);
export class Grouped extends G1 {
  connect(): void {
    useButtonCore(this); // expected: ok
  }
}

// (g) Rust-like: a required member. expected: TS2515
const R1: Composed<typeof ControlledElement, [typeof Labelled]> =
  compose(ControlledElement);
export class NoLabel extends R1 {}
// It is implemented, and the provided member overridden. expected: ok
export class WithLabel extends R1 {
  override label(): string {
    return 'a';
  }
  override describe(): string {
    return 'b';
  }
}

// (h) A supertrait: a trait whose base is a composition over a bound.
// expected: ok, and TS2515 for an adopter that omits the required member
const LabelledButtonBase: Composed<
  typeof AnyElement,
  [typeof Disableable, typeof Labelled]
> = compose(AnyElement);
export abstract class LabelledButton extends LabelledButtonBase {
  static {
    trait(this);
  }
}
const R2: Composed<typeof ControlledElement, [typeof LabelledButton]> =
  compose(ControlledElement);
export class Button extends R2 {
  override label(): string {
    return this.disabled ? 'off' : 'on'; // expected: ok
  }
}
export class ButtonNoLabel extends R2 {}

// (i) Two traits with one member of different types. expected: `never`, no error
export class NamedString {
  name: string = '';
}
export class NamedNumber {
  name: number = 0;
}
const R3: Composed<
  typeof ControlledElement,
  [typeof NamedString, typeof NamedNumber]
> = compose(ControlledElement);
export class Conflict extends R3 {
  read(): never {
    return this.name; // expected: ok, `never`
  }
}

// (j) Two traits with one static of different types. expected: `never`, no error
export class ZeroString {
  static zero(): string {
    return '';
  }
}
const R4: Composed<
  typeof ControlledElement,
  [typeof Counted, typeof ZeroString]
> = compose(ControlledElement);
export class StaticConflict extends R4 {}
// expected: unknown. Observed: the statics intersect into an overload, with no
// error, and the call takes the first trait's signature
export const zero: number = StaticConflict.zero();
