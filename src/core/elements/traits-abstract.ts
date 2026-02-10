/* eslint-disable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unsafe-type-assertion */
import type { Constructor } from 'type-fest';

export interface Trait<P extends object, B extends symbol> {
  <T, S extends object>(ctr: Constructor<T> & S): Constructor<T & P> & S;
  [Symbol.hasInstance](o: unknown): o is P & Readonly<Record<B, true>>;
  brand: B;
}

export function trait<P extends object, B extends symbol>(
  properties: P,
  brand: B,
): Trait<P, B> {
  return Object.defineProperties(
    <T, S extends object>(ctr: Constructor<T> & S): Constructor<T & P> & S => {
      Object.defineProperties(ctr.prototype, {
        ...Object.getOwnPropertyDescriptors(properties),
        [brand]: { value: true },
      });

      return ctr as Constructor<T & P> & S;
    },
    {
      [Symbol.hasInstance]: {
        configurable: true,
        value: (o: unknown): o is Trait<P, B> =>
          o != null &&
          typeof o === 'object' &&
          !!(o as { [brand]: boolean })[brand],
      },
      brand: {
        configurable: true,
        value: brand,
      },
    },
  ) as Trait<P, B>;
}

type TraitProps<
  TL extends ReadonlyArray<Trait<any, any>>,
  P = {},
> = TL extends [infer T, ...infer Rest]
  ? T extends Trait<infer PP, infer B>
    ? TraitProps<
        Extract<Rest, ReadonlyArray<Trait<any, any>>>,
        P & PP & Readonly<Record<B, true>>
      >
    : P
  : P;

export type ConstructorWithTraits<
  T,
  S extends object,
  TL extends ReadonlyArray<Trait<any, any>>,
> = Constructor<T & TraitProps<TL>> & S;

export type Traits<T extends ConstructorWithTraits<any, any, any>> =
  T extends ConstructorWithTraits<any, any, infer TL> ? TL : never;

export function impl<
  T extends object,
  S extends object,
  TL extends ReadonlyArray<Trait<any, any>>,
>(target: Constructor<T> & S, traits: TL): ConstructorWithTraits<T, S, TL> {
  return traits.reduce(
    (acc, t) => t(acc),
    class extends target {},
  ) as ConstructorWithTraits<T, S, TL>;
}
