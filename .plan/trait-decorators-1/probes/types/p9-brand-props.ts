// P9. A trait whose members the base already has, such as FocusForwarding,
// is structurally the base. A type-only brand keeps it nominal. A generic
// helper derives framework props from a trait class.
import { ControlledElement } from './element.ts';
import { Disableable, FocusForwarding } from './traits.ts';

// (a) Without a brand, any ControlledElement passes for FocusForwarding.
export function useFocusForwarding(_host: FocusForwarding): void {}
export function unbranded(element: ControlledElement): void {
  useFocusForwarding(element); // expected: ok, which is the loss
}

// (b) A type-only brand on the trait class.
const $forwarding: unique symbol = Symbol('Forwarding');
export class Forwarding extends ControlledElement {
  declare readonly [$forwarding]: true;
  override focus(): void {}
}
export function useForwarding(_host: Forwarding): void {}
export function branded(element: ControlledElement): void {
  useForwarding(element); // expected: error, the brand is missing
}
export interface Adopter extends Forwarding {}
export class Adopter extends ControlledElement {
  connectedCallback(): void {
    useForwarding(this); // expected: ok
  }
}

// (c) Framework props from a trait class: its non-method members that the
// base doesn't have, optional.
export type TraitProps<T extends ControlledElement> = {
  [
    K in keyof T as K extends keyof ControlledElement | symbol
      ? never
      : T[K] extends (...args: never[]) => unknown
        ? never
        : K
  ]?: T[K];
};
export type DisableableProps = TraitProps<Disableable>;
export const props: DisableableProps = { disabled: true }; // expected: ok
export const none: TraitProps<Forwarding> = {}; // expected: ok
export const wrong: DisableableProps = { focus: 1 }; // expected: an error
