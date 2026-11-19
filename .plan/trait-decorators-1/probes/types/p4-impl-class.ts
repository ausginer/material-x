// P4. Form C: the heritage clause stays a value-level marker, impl(), over
// class traits. A type function computes the composed constructor.
import { ControlledElement } from './element.ts';
import { Disableable, FocusForwarding } from './traits.ts';

type Ctor = abstract new (...args: any[]) => object;
type All<T extends readonly Ctor[]> = T extends readonly [
  infer H extends Ctor,
  ...infer R extends readonly Ctor[],
]
  ? InstanceType<H> & All<R>
  : unknown;
export type Composed<B extends Ctor, T extends readonly Ctor[]> = B &
  (new (...args: any[]) => InstanceType<B> & All<T>);

export function impl<B extends Ctor, const T extends readonly Ctor[]>(
  _base: B,
  _traits: T,
): Composed<B, T> {
  throw new Error('removed by the flattener');
}

// (a) Inline in the heritage clause: expected TS9021 under isolatedDeclarations.
export class Inline extends impl(ControlledElement, [Disableable]) {}

// (b) A const with no annotation: expected TS9010 under isolatedDeclarations.
const Unannotated = impl(ControlledElement, [Disableable]);
export class FromUnannotated extends Unannotated {}

// (c) A const with an annotation: expected ok, as today's form.
const Annotated: Composed<
  typeof ControlledElement,
  [typeof Disableable, typeof FocusForwarding]
> = impl(ControlledElement, [Disableable, FocusForwarding]);
export class FromAnnotated extends Annotated {
  check(): boolean {
    return this.disabled; // expected: ok
  }
}

// (d) RF-57 under this form: a subclass overrides a trait's class field with
// an accessor.
import { Counted } from './traits.ts';
const CountedBase: Composed<typeof ControlledElement, [typeof Counted]> = impl(
  ControlledElement,
  [Counted],
);
export class Counter extends CountedBase {
  override get count(): number {
    return 1; // expected: unknown
  }
  override set count(_value: number) {}
}
