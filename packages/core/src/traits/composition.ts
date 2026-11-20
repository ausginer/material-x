// oxlint-disable typescript/no-empty-object-type, typescript/no-unsafe-type-assertion
import type { AbstractConstructor } from 'type-fest';

/**
 * The key under which a {@link Bound} records what a trait requires of its
 * base. It exists only in the types.
 */
declare const $bound: unique symbol;

/**
 * What a trait requires of the base it is applied to: instances of `I`, and a
 * constructor with the statics `S`. A trait class extends a bound, which
 * {@link bound} creates.
 *
 * @typeParam I - The instance type the base must have.
 * @typeParam S - The statics the base's constructor must have.
 */
export type Bound<
  I extends object,
  S extends object = {},
> = AbstractConstructor<I> &
  S & { readonly [$bound]: (instance: I, statics: S) => void };

/**
 * A trait class that applies to base `B`: one whose bound accepts `B`'s
 * instances and `B` itself.
 *
 * @typeParam B - The base constructor.
 */
export type Applicable<B extends AbstractConstructor<unknown>> =
  AbstractConstructor<unknown> & {
    readonly [$bound]?: (instance: InstanceType<B>, statics: B) => void;
  };

/** One static's merged type, by the kind of the earlier value. */
type MergeValue<A, B> =
  A extends ReadonlyArray<infer EA>
    ? B extends ReadonlyArray<infer EB>
      ? ReadonlyArray<EA | EB>
      : B
    : A extends (...args: never[]) => unknown
      ? B
      : A extends object
        ? B extends object
          ? Omit<A, keyof B> & B
          : B
        : B;

/**
 * Two traits' statics, merged as the flattener merges their values: arrays
 * concatenate, so their element types join; objects spread, so the later
 * object's keys win; any other kind takes the later value.
 *
 * @typeParam A - The earlier trait's statics.
 * @typeParam B - The later trait's statics.
 */
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
 * `I` without the keys `K`, or `I` itself when `K` is empty. A trimmed trait
 * also loses the base's keys `X`: they come from the base, with their
 * declaration kinds, and a mapped type would turn its methods and accessors
 * into properties.
 */
type Without<I, K extends PropertyKey, X> = [K] extends [never]
  ? I
  : Omit<I, K | (X & PropertyKey)>;

/**
 * The traits' instance members, read from the last trait back. `Later` holds
 * the keys the later traits declare, and `X` the base's instance keys, which
 * don't count: every trait has its bound's members.
 *
 * Each trait is trimmed alone. A trait loses only the keys a later trait
 * declares, through `Omit`, so the later trait wins them. A trait that loses
 * no key enters the intersection whole, with each member's declaration kind
 * and its private brand, so an own field over a trait's accessor and an
 * accessor over a trait's field are still errors in the component. A trait
 * that does lose a key loses those checks and its private brand.
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
      Without<InstanceType<L>, Exclude<keyof InstanceType<L> & Later, X>, X>
  : unknown;

/**
 * Base `B` with the traits `T` applied in order: `B`'s statics and instances,
 * each trait's instance members and its statics. A key that two traits
 * declare takes the later trait's member, and a key the component declares
 * takes the component's.
 *
 * @typeParam B - The base constructor.
 * @typeParam T - The trait classes, in order.
 */
export type Composed<
  B extends AbstractConstructor<unknown>,
  T extends ReadonlyArray<Applicable<B>>,
> = B &
  AbstractConstructor<InstanceType<B> & Instances<T, keyof InstanceType<B>>> &
  Statics<T>;

/** What `@trait` decorates: a class whose heritage is a bound. */
type TraitClass = AbstractConstructor<object> & {
  readonly [$bound]: (instance: never, statics: never) => void;
};

/**
 * Makes the decorated class a trait, written `@trait` above a module-scope
 * class declaration that extends a {@link bound} or a composition of one. The
 * build replaces the decorator with the trait's brand install: an object is
 * an instance of the trait when the trait's brand on it is `true`, which
 * {@link impl} sets on each component that composes the trait.
 *
 * @throws {Error} Always: a trait module runs only once the build has
 *   replaced the decorator.
 */
export function trait<C extends TraitClass>(
  _value: C,
  _context: ClassDecoratorContext<C>,
): void {
  throw new Error(
    '@trait is compiled by @ydinjs/vite-traits-plugin; build the trait module',
  );
}

/**
 * Brands `target`'s prototype with each trait brand. Only the build writes this
 * call, in the static block of each component that composes a trait.
 *
 * @param target - The component class.
 * @param brands - The brands of the component's traits.
 */
export function impl(
  target: AbstractConstructor<unknown>,
  ...brands: readonly symbol[]
): void {
  for (const brand of brands) {
    Object.defineProperty(target.prototype, brand, { value: true });
  }
}

/**
 * The bound a trait class extends. It is `null` at runtime: a trait class is
 * never constructed, and its members run only once the build has copied them
 * into a component.
 *
 * @typeParam I - The instance type the base must have.
 * @typeParam S - The statics the base's constructor must have.
 */
export function bound<I extends object, S extends object = {}>(): Bound<I, S> {
  return null as unknown as Bound<I, S>;
}

/**
 * Names a component's base and its traits:
 * `const XBase: Composed<typeof Base, [typeof A, typeof B]> = compose(Base)`,
 * extended by one class. The build replaces the constant with the base and
 * copies the traits' members into the class. A trait that composes other
 * traits passes its bound, and gets the bound back.
 *
 * @param base - The base, or a trait's bound.
 * @throws {Error} When `base` isn't a bound: the module wasn't built.
 */
export function compose<
  const B extends AbstractConstructor<unknown>,
  const T extends ReadonlyArray<Applicable<B>>,
>(base: B): Composed<B, T> {
  // A bound is null at runtime, whatever its type says.
  if ((base as unknown) !== null) {
    throw new Error('compose() runs only in a trait; build the component');
  }

  return base as Composed<B, T>;
}
