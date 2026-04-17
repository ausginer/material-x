// oxlint-disable typescript/no-empty-object-type
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
 * @typeParam P - Instance properties added by the trait.
 * @typeParam S - Static properties added by the trait.
 * @typeParam B - External nominal brand symbol for the trait.
 * @typeParam PB - Lower-bound instance shape required from compatible base
 *   constructors.
 * @typeParam SB - Lower-bound static shape required from compatible base
 *   constructors.
 */
export interface Trait<
  P extends object,
  S extends object = {},
  B extends symbol = symbol,
  PB extends object = {},
  SB extends object = {},
> {
  <T extends PB, U extends SB>(
    ctr: Constructor<T> & U,
  ): Constructor<T & Branded<P, B>> & U & S;
  [Symbol.hasInstance](o: unknown): o is Branded<P, B>;
  brand: B;
}

/**
 * Constructor static members excluding built-in constructor keys.
 *
 * @typeParam T - Constructor whose trait-specific static members should be
 *   extracted.
 */
type ConstructorStatics<T extends Constructor<object>> = Omit<
  T,
  keyof Constructor<Record<never, never>>
>;

/**
 * Instance delta between a witness base constructor and a witness subclass
 * constructor returned from a trait transformer.
 *
 * @typeParam T - Witness base constructor accepted by the transformer.
 * @typeParam U - Witness subclass constructor returned from the transformer.
 */
type TraitProps<
  T extends Constructor<object>,
  U extends Constructor<object>,
> = Omit<InstanceType<U>, keyof InstanceType<T>>;

/**
 * Static delta between a witness base constructor and a witness subclass
 * constructor returned from a trait transformer.
 *
 * @typeParam T - Witness base constructor accepted by the transformer.
 * @typeParam U - Witness subclass constructor returned from the transformer.
 */
type TraitStaticProps<
  T extends Constructor<object>,
  U extends Constructor<object>,
> = Omit<ConstructorStatics<U>, keyof ConstructorStatics<T>>;

/**
 * Creates a strict nominal trait from a constructor transformer.
 *
 * The transformer is authored against a witness constructor and must return a
 * subclass of that constructor. The returned trait then normalizes the witness
 * result into the public `Trait<P, S, B, PB, SB>` contract, where `P` and `S`
 * represent additive instance and static deltas rather than the full returned
 * constructor shape.
 *
 * @typeParam T - Witness base constructor accepted by the transformer.
 * @typeParam U - Witness subclass constructor returned from the transformer.
 * @typeParam B - External nominal brand symbol for the trait.
 *
 * @param transformer - Maps a witness base constructor to a branded subclass
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
  T extends Constructor<object>,
  U extends Constructor<object>,
  B extends symbol = symbol,
>(
  transformer: (ctr: T) => U,
  brand: B,
): Trait<
  TraitProps<T, U>,
  TraitStaticProps<T, U>,
  B,
  InstanceType<T>,
  ConstructorStatics<T>
> {
  // oxlint-disable-next-line no-extend-native
  return Object.defineProperties(
    (base: T) => {
      const result = transformer(base);

      if (
        Object.is(result, base) ||
        !Object.prototype.isPrototypeOf.call(
          base.prototype as object,
          result.prototype,
        )
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
        value: (o: unknown): o is Branded<TraitProps<T, U>, B> =>
          o != null &&
          typeof o === 'object' &&
          !!(o as { [brand]: boolean })[brand],
      },
      brand: {
        configurable: true,
        value: brand,
      },
    },
  ) as Trait<
    TraitProps<T, U>,
    TraitStaticProps<T, U>,
    B,
    InstanceType<T>,
    ConstructorStatics<T>
  >;
}

/**
 * Accumulates branded instance deltas from a tuple-like list of traits.
 *
 * @typeParam TL - Tuple-like readonly list of traits.
 * @typeParam P - Accumulator for branded instance properties.
 */
type TraitListProps<
  TL extends ReadonlyArray<Trait<any, any, any, any, any>>,
  P = {},
> = TL extends readonly [infer T, ...infer Rest]
  ? T extends Trait<infer PP, any, infer B, any, any>
    ? TraitListProps<
        Extract<Rest, ReadonlyArray<Trait<any, any, any, any, any>>>,
        P & Branded<PP, B>
      >
    : P
  : P;

/**
 * Accumulates static deltas from a tuple-like list of traits.
 *
 * @typeParam TL - Tuple-like readonly list of traits.
 * @typeParam S - Accumulator for static properties.
 */
type TraitListStaticProps<
  TL extends ReadonlyArray<Trait<any, any, any, any, any>>,
  S = {},
> = TL extends readonly [infer T, ...infer Rest]
  ? T extends Trait<any, infer SS, any, any, any>
    ? TraitListStaticProps<
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
> = Constructor<T & TraitListProps<TL>> & U & TraitListStaticProps<TL>;

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
