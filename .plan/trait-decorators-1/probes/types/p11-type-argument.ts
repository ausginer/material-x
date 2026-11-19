// P11. Form D: the trait list is the type argument of a generic base
// constructor. The type arguments erase; the flattener rewrites `extends
// Traits<…>` to `extends ControlledElement` and inserts the members.
import { ControlledElement } from './element.ts';
import { Counted, Disableable, FocusForwarding } from './traits.ts';

type Ctor = abstract new (...args: any[]) => object;
type All<T extends readonly Ctor[]> = T extends readonly [
  infer H extends Ctor,
  ...infer R extends readonly Ctor[],
]
  ? InstanceType<H> & All<R>
  : unknown;

/** The instance type a trait list gives a host, for use* helpers. */
export type Traited<T extends readonly Ctor[]> = ControlledElement & All<T>;

/**
 * The marker. At runtime it is ControlledElement, or a subclass whose
 * constructor throws when the flattener didn't run.
 */
export const Traits: typeof ControlledElement &
  (new <const T extends readonly Ctor[]>() => Traited<T>) =
  ControlledElement as any;

// (a) Members, `override` and `super`.
export class Button extends Traits<
  [typeof Disableable, typeof FocusForwarding]
> {
  check(): boolean {
    return this.disabled; // expected: ok
  }
  override focus(options?: FocusOptions): void {
    super.focus(options); // expected: ok in types; the flattener must reject `super.focus`, a trait key
  }
}

// (b) The component overrides a trait accessor, with `override`.
export class Linkish extends Traits<[typeof Disableable]> {
  override get disabled(): boolean {
    return true; // expected: ok
  }
  override set disabled(_value: boolean) {}
}

// (c) RF-57: a subclass overrides a trait class field with an accessor.
export class Counter extends Traits<[typeof Counted]> {}
export class SubCounter extends Counter {
  override get count(): number {
    return 1; // expected: TS2611
  }
  override set count(_value: number) {}
}

// (d) A shared group is a tuple type, and erases.
export type ButtonCoreTraits = readonly [typeof Disableable];
export type ButtonCore = Traited<ButtonCoreTraits>;
export function useButtonCore(host: ButtonCore): boolean {
  return host.disabled;
}
export class IconButton extends Traits<
  [...ButtonCoreTraits, typeof FocusForwarding]
> {
  connectedCallback(): void {
    useButtonCore(this); // expected: ok
  }
}

// (e) The static side is the base's.
export const observed: readonly string[] | undefined =
  IconButton.observedAttributes; // expected: ok

// (f) A list that omits the type argument.
export class Bare extends Traits {} // expected: unknown

// (g) The component's own field over a trait accessor.
export class OwnField extends Traits<[typeof Disableable]> {
  override disabled: boolean = false; // expected: unknown
}
