// oxlint-disable typescript/no-unsafe-type-assertion
import type { Constructor } from 'type-fest';

/**
 * Nominal instance marker added by a trait through its external brand symbol.
 *
 * @typeParam P - Instance properties contributed by the trait.
 * @typeParam B - Unique symbol identifying the trait nominally.
 */
type Branded<P extends object, B extends symbol> = P &
  Readonly<Record<B, true>>;

/**
 * Callable trait contract for transforming one constructor into a branded
 * subclass constructor.
 *
 * Returned traits support both direct application (`Trait(Base)`) and runtime
 * narrowing through `instanceof`.
 *
 * @typeParam T - Instance side of the base constructor.
 * @typeParam U - Static side of the base constructor.
 * @typeParam P - Instance properties added by the trait.
 * @typeParam S - Static properties added by the trait.
 * @typeParam B - External nominal brand symbol for the trait.
 */
export interface Trait<
  T extends object,
  U extends object,
  P extends object,
  S extends object,
  B extends symbol = symbol,
> {
  (ctr: Constructor<T> & U): Constructor<T & Branded<P, B>> & U & S;
  [Symbol.hasInstance](
    o: unknown,
  ): o is InstanceType<ReturnType<Trait<T, U, P, S, B>>>;
  brand: B;
}

/**
 * Creates a strict nominal trait from a constructor transformer.
 *
 * The transformer must return a subclass of the provided constructor.
 *
 * @typeParam T - Instance side of the base constructor.
 * @typeParam U - Static side of the base constructor.
 * @typeParam P - Instance properties added by the trait.
 * @typeParam S - Static properties added by the trait.
 * @typeParam B - External nominal brand symbol for the trait.
 *
 * @param transformer - Maps a base constructor to a branded subclass
 *   constructor.
 * @param brand - External symbol used for nominal typing and `instanceof`
 *   checks.
 * @returns Callable trait object that can be applied directly or composed
 *   through `impl(...)`.
 *
 * @throws {TypeError} Thrown when the transformer returns the same constructor
 *   or a constructor that does not extend the input one.
 */
export function trait<
  T extends object,
  U extends object,
  P extends object,
  S extends object,
  B extends symbol,
>(
  transformer: (ctr: Constructor<T> & U) => Constructor<T & P> & U & S,
  brand: B,
): Trait<T, U, P, S, B> {
  return Object.defineProperties(
    (base: Constructor<T> & U) => {
      const result = transformer(base);

      if (
        result === base ||
        !(base.prototype as object).isPrototypeOf(result.prototype)
      ) {
        throw new TypeError(
          'Trait transformer must return a subclass of the input constructor.',
        );
      }
      Object.defineProperty(result.prototype, brand, { value: true });

      return result;
    },
    {
      [Symbol.hasInstance]: {
        configurable: true,
        value: (
          o: unknown,
        ): o is InstanceType<ReturnType<Trait<T, U, P, S, B>>> =>
          o != null &&
          typeof o === 'object' &&
          !!(o as { [brand]: boolean })[brand],
      },
      brand: {
        configurable: true,
        value: brand,
      },
    },
  ) as Trait<T, U, P, S, B>;
}

type TraitProps<
  TL extends ReadonlyArray<Trait<any, any, any, any, any>>,
  P = Record<never, never>,
> = TL extends [infer T, ...infer Rest]
  ? T extends Trait<any, any, infer PP, any, infer B>
    ? TraitProps<
        Extract<Rest, ReadonlyArray<Trait<any, any, any, any, any>>>,
        P & Branded<PP, B>
      >
    : P
  : P;

type TraitStaticProps<
  TL extends ReadonlyArray<Trait<any, any, any, any, any>>,
  S = Record<never, never>,
> = TL extends [infer T, ...infer Rest]
  ? T extends Trait<any, any, any, infer SS, any>
    ? TraitStaticProps<
        Extract<Rest, ReadonlyArray<Trait<any, any, any, any, any>>>,
        S & SS
      >
    : S
  : S;

/**
 * Accumulated constructor type produced by applying a tuple of traits.
 *
 * @typeParam T - Instance side of the original base constructor.
 * @typeParam U - Static side of the original base constructor.
 * @typeParam TL - Tuple-like readonly list of applied traits.
 */
export type TraitedConstructor<
  T extends object,
  U extends object,
  TL extends ReadonlyArray<Trait<any, any, any, any, any>>,
> = Constructor<T & TraitProps<TL>> & U & TraitStaticProps<TL>;

/**
 * Applies a tuple of traits to a base constructor in declaration order.
 *
 * @remarks `traits` is intended to be a tuple-like readonly list so TypeScript
 * can preserve the precise accumulated instance and static types. Plain arrays
 * are allowed, but they weaken inference and are not the primary ergonomic
 * target of this API.
 *
 * @param base - Base constructor that receives the traits.
 * @param traits - Tuple-like readonly list of traits to apply.
 * @returns Constructor with the accumulated trait instance and static types.
 *
 * @typeParam T - Instance side of the base constructor.
 * @typeParam U - Static side of the base constructor.
 * @typeParam TL - Tuple-like readonly list of traits to apply.
 */
export function impl<
  T extends object,
  U extends object,
  TL extends ReadonlyArray<Trait<any, any, any, any, any>>,
>(base: Constructor<T> & U, traits: TL): TraitedConstructor<T, U, TL> {
  return traits.reduce((acc, trait) => trait(acc), base) as any;
}
