// P12. Form D with instance types as the arguments, which drops `typeof`.
import { ControlledElement } from './element.ts';
import {
  Disableable,
  FocusForwarding,
  NamedNumber,
  NamedString,
} from './traits.ts';

type Intersect<T extends readonly object[]> = T extends readonly [
  infer H,
  ...infer R extends readonly object[],
]
  ? H & Intersect<R>
  : unknown;
export type Traited<T extends readonly ControlledElement[]> =
  ControlledElement & Intersect<T>;

export const Traits: typeof ControlledElement &
  (new <const T extends readonly ControlledElement[]>() => Traited<T>) =
  ControlledElement as any;

export type ButtonCoreTraits = readonly [Disableable];

// (a) Instance types, a group spread, `override`.
export class IconButton extends Traits<[...ButtonCoreTraits, FocusForwarding]> {
  override focus(options?: FocusOptions): void {
    if (!this.disabled) super.focus(options); // expected: ok
  }
}

// (b) A non-trait argument.
export class NotATrait extends Traits<[HTMLElement]> {} // expected: an error

// (c) Two traits whose members conflict.
export class Clash extends Traits<[NamedString, NamedNumber]> {
  read(): number {
    return this.name; // expected: unknown; `name` is string & number
  }
}
