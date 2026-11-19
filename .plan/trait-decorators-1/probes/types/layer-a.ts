// Layer (a): a generic trait mechanism at the level of core's primitives.ts.
// It knows no element class and no attribute. A trait is a plain class, and a
// component chooses its own base. Declarations only: the probes read types.

type Ctor = abstract new (...args: any[]) => object;

/** The static key under which a bound records what a trait requires. */
export declare const $bound: unique symbol;

/**
 * What a trait requires of the base it is applied to: instances that are `I`,
 * and a constructor whose statics are `S`. A trait's superclass is a bound,
 * never the base a component gets. At runtime a bound is an empty class.
 */
export type Bound<I extends object, S extends object = {}> = S & {
  readonly [$bound]: (instance: I, statics: S) => void;
} & (abstract new (...args: any[]) => I);

export declare function bound<I extends object, S extends object = {}>(): Bound<
  I,
  S
>;

/** Marks a class as a trait and installs its runtime brand. */
export declare function trait(target: Ctor): void;

/**
 * A trait class that can be applied to base `B`: it has no bound, or its
 * bound accepts B's instances and B's statics.
 */
export type Applicable<B extends Ctor> = Ctor & {
  readonly [$bound]?: (instance: InstanceType<B>, statics: B) => void;
};

type Instances<T extends readonly Ctor[]> = T extends readonly [
  infer H extends Ctor,
  ...infer R extends readonly Ctor[],
]
  ? InstanceType<H> & Instances<R>
  : unknown;

type Statics<T extends readonly Ctor[]> = T extends readonly [
  infer H extends Ctor,
  ...infer R extends readonly Ctor[],
]
  ? Omit<H, 'prototype' | typeof $bound> & Statics<R>
  : unknown;

/** Instances of base B with the traits T: for host parameters of helpers. */
export type Traited<
  B extends Ctor,
  T extends readonly Applicable<B>[],
> = InstanceType<B> & Instances<T>;

// ─── (i) The base as a type argument of one generic marker ──────────────────
export declare const Traits: new <
  B extends Ctor,
  const T extends readonly Applicable<B>[],
>() => InstanceType<B> & Instances<T>;

// ─── (ii) One annotated marker per base ─────────────────────────────────────
export type TraitsFor<B extends Ctor> = B &
  (new <const T extends readonly Applicable<B>[]>() => InstanceType<B> &
    Instances<T>);
export declare function traitsFor<B extends Ctor>(base: B): TraitsFor<B>;

// ─── (iii) One annotated composition per component ──────────────────────────
/** Base B with traits T: B's statics, the traits' statics, both instances. */
export type Composed<B extends Ctor, T extends readonly Applicable<B>[]> = B &
  Statics<T> &
  (new (...args: any[]) => InstanceType<B> & Instances<T>);

/**
 * Names the runtime base. The composed type comes from the constant's
 * annotation, so the trait list is written once, in a type.
 */
export declare function compose<B extends Ctor, R extends B>(base: B): R;
