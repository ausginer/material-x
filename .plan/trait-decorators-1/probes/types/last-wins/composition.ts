// Layer (a)'s types with the owner's decisions: statics merge by kind, and a
// key two traits supply resolves to the last trait's member, for statics and
// for the instance type alike. The runtime functions are the accepted ones.
import type { AbstractConstructor } from 'type-fest';

declare const $bound: unique symbol;

export type Bound<
  I extends object,
  S extends object = {},
> = AbstractConstructor<I> &
  S & { readonly [$bound]: (instance: I, statics: S) => void };

export type Applicable<B extends AbstractConstructor<unknown>> =
  AbstractConstructor<unknown> & {
    readonly [$bound]?: (instance: InstanceType<B>, statics: B) => void;
  };

/** One static's merged value: arrays union their elements, objects spread, the rest take the last. */
type MergeValue<A, B> = A extends readonly (infer EA)[]
  ? B extends readonly (infer EB)[]
    ? readonly (EA | EB)[]
    : B
  : A extends (...args: never[]) => unknown
    ? B
    : A extends object
      ? B extends object
        ? Omit<A, keyof B> & B
        : B
      : B;

/** Two traits' statics, merged by kind. */
export type MergeStatics<A, B> = {
  [K in keyof A | keyof B]: K extends keyof B
    ? K extends keyof A
      ? MergeValue<A[K], B[K]>
      : B[K]
    : K extends keyof A
      ? A[K]
      : never;
};

type OwnStatics<C> = Omit<C, 'prototype' | typeof $bound>;

type Statics<T extends ReadonlyArray<AbstractConstructor<unknown>>> =
  T extends readonly [
    ...infer R extends ReadonlyArray<AbstractConstructor<unknown>>,
    infer L extends AbstractConstructor<unknown>,
  ]
    ? MergeStatics<Statics<R>, OwnStatics<L>>
    : {};

/**
 * Two traits' instance members, the last winning a key both declare. Keys of
 * the base's instance (X) don't count: every trait has its bound's members,
 * and an override of one must stay assignable to the bound's. With no other
 * shared key, the intersection keeps each member's declaration kind, so
 * TS2610 and TS2611 still reach the component. Only a pair that shares a key
 * goes through Omit, a mapped type, and the flattener warns about that pair.
 */
export type MergeInstances<A, B, X> = [Exclude<keyof A & keyof B, X>] extends [
  never,
]
  ? A & B
  : Omit<A, Exclude<keyof A & keyof B, X>> & B;

type Instances<
  T extends ReadonlyArray<AbstractConstructor<unknown>>,
  X,
> = T extends readonly [
  ...infer R extends ReadonlyArray<AbstractConstructor<unknown>>,
  infer L extends AbstractConstructor<unknown>,
]
  ? MergeInstances<Instances<R, X>, InstanceType<L>, X>
  : unknown;

export type Composed<
  B extends AbstractConstructor<unknown>,
  T extends ReadonlyArray<Applicable<B>>,
> = B &
  AbstractConstructor<InstanceType<B> & Instances<T, keyof InstanceType<B>>> &
  Statics<T>;

export function bound<I extends object, S extends object = {}>(): Bound<I, S> {
  return null as any;
}
export function compose<
  const B extends AbstractConstructor<unknown>,
  const T extends ReadonlyArray<Applicable<B>>,
>(base: B): Composed<B, T> {
  if (base !== null) {
    throw new Error('compose() of a component is replaced by the flattener');
  }
  return base as any;
}
export function trait(
  _ctr: AbstractConstructor<unknown>,
  _brand?: symbol,
): void {}
