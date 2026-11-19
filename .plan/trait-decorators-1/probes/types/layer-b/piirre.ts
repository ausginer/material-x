// Layer (a) as the owner accepted it at cc98563a3: the mechanism of
// example4/traits/fixed.ts, without its sample traits and component. It knows
// no element and no attribute.
import type { AbstractConstructor } from 'type-fest';

const BRANDS = new WeakMap<AbstractConstructor<unknown>, symbol>();

// fix 1: called from the trait's static block, not as a decorator, so no
// tsconfig needs experimentalDecorators and Node runs the module unbuilt.
export function trait(ctr: AbstractConstructor<unknown>): void {
  const $brand = Symbol();
  BRANDS.set(ctr, $brand);

  Object.defineProperty(ctr, Symbol.hasInstance, {
    configurable: true,
    value(o: unknown): boolean {
      return (
        o != null &&
        typeof o === 'object' &&
        (o as { [$brand]: boolean })[$brand]
      );
    },
  });
}

export function impl(
  { prototype }: AbstractConstructor<unknown>,
  ...traits: ReadonlyArray<AbstractConstructor<unknown>>
): void {
  for (const trait of traits) {
    if (BRANDS.has(trait)) {
      Object.defineProperty(prototype, BRANDS.get(trait)!, { value: true });
    }
  }
}

// fix 2: the key under which a bound records what it requires. Type-only.
declare const $bound: unique symbol;

type Statics<T extends ReadonlyArray<AbstractConstructor<unknown>>> =
  T extends readonly [
    infer F extends AbstractConstructor<unknown>,
    ...infer R extends ReadonlyArray<AbstractConstructor<unknown>>,
  ]
    ? Omit<F, 'prototype' | typeof $bound> & Statics<R> // fix 2
    : unknown;

type Instances<T extends ReadonlyArray<AbstractConstructor<unknown>>> =
  T extends readonly [
    infer F extends AbstractConstructor<unknown>,
    ...infer R extends ReadonlyArray<AbstractConstructor<unknown>>,
  ]
    ? InstanceType<F> & Instances<R>
    : unknown;

// fix 2: exported, and it records I and S under $bound.
export type Bound<
  I extends object,
  S extends object = {},
> = AbstractConstructor<I> &
  S & { readonly [$bound]: (instance: I, statics: S) => void };

// fix 3: `null`, which a class can extend when its module is evaluated. A
// trait class is never constructed and its members never run in place: the
// flattener copies them into the component.
export function bound<I extends object, S extends object = {}>(): Bound<I, S> {
  return null as any;
}

// fix 2: Applicable restored.
export type Applicable<B extends AbstractConstructor<unknown>> =
  AbstractConstructor<unknown> & {
    readonly [$bound]?: (instance: InstanceType<B>, statics: B) => void;
  };

// fix 4: `B &` keeps the base's own statics.
export type Composed<
  B extends AbstractConstructor<unknown>,
  T extends ReadonlyArray<Applicable<B>>, // fix 2
> = B & AbstractConstructor<InstanceType<B> & Instances<T>> & Statics<T>;

export function compose<
  const B extends AbstractConstructor<unknown>,
  const T extends ReadonlyArray<Applicable<B>>, // fix 2
>(base: B): Composed<B, T> {
  // fix 5: a supertrait composes a bound, which is null, and that runs
  // unbuilt; a component's composition is replaced by the flattener, so one
  // that runs is a build error.
  if (base !== null) {
    throw new Error('compose() of a component is replaced by the flattener');
  }
  return base as any;
}
