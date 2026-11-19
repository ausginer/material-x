// P43. Layer (a)'s instance type with each trait trimmed alone: a trait loses
// only the keys a later trait declares, through Omit, and a trait that loses no
// key enters the intersection whole. Everything else is P40's composition.ts.
import type { AbstractConstructor } from 'type-fest';
import type { Applicable, Statics } from './composition.ts';

/** `I` without the keys `K`; `I` itself when `K` is empty. */
type Without<I, K extends PropertyKey> = [K] extends [never] ? I : Omit<I, K>;

/**
 * The traits' instance members, read from the last trait back. `Later` holds
 * the keys the later traits declare, and `X` the base's instance keys.
 */
type Instances<
  T extends ReadonlyArray<AbstractConstructor<unknown>>,
  X,
  Later = never,
> = T extends readonly [
  ...infer R extends ReadonlyArray<AbstractConstructor<unknown>>,
  infer L extends AbstractConstructor<unknown>,
]
  ? Instances<R, X, Later | keyof InstanceType<L>> &
      Without<InstanceType<L>, Exclude<keyof InstanceType<L> & Later, X>>
  : unknown;

export type Composed<
  B extends AbstractConstructor<unknown>,
  T extends ReadonlyArray<Applicable<B>>,
> = B &
  AbstractConstructor<InstanceType<B> & Instances<T, keyof InstanceType<B>>> &
  Statics<T>;

export function compose<
  const B extends AbstractConstructor<unknown>,
  const T extends ReadonlyArray<Applicable<B>>,
>(base: B): Composed<B, T> {
  if (base !== null) {
    throw new Error('compose() of a component is replaced by the flattener');
  }
  return base as any;
}
