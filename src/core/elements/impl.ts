/* eslint-disable @typescript-eslint/no-empty-object-type */
import type { Constructor, Writable } from 'type-fest';
import { type Converter, type ConverterTypes, ATTRIBUTE } from './attribute.ts';

export type CustomElementStaticProps = {
  observedAttributes?: string[];
};

export type Mixin<
  T extends HTMLElement,
  P extends object = {},
  I extends object = CustomElementStaticProps,
  O extends object = CustomElementStaticProps,
> = (constructor: Constructor<T> & I) => Constructor<T & P> & O;

export type MixinProps<
  MS extends ReadonlyArray<Mixin<any, any, any, any>>,
  T = {},
> = MS extends readonly [infer M, ...infer Rest]
  ? M extends Mixin<any, infer P, any, any>
    ? MixinProps<Extract<Rest, ReadonlyArray<Mixin<any, any, any, any>>>, T & P>
    : T
  : T;

export type MixinStatics<MS extends ReadonlyArray<Mixin<any, any, any, any>>> =
  MS extends readonly [infer M, ...infer Rest]
    ? M extends Mixin<any, any, any, infer S>
      ? S &
          MixinStatics<Extract<Rest, ReadonlyArray<Mixin<any, any, any, any>>>>
      : MixinStatics<Extract<Rest, ReadonlyArray<Mixin<any, any, any, any>>>>
    : {};

export type Accessors<A extends Record<string, Converter>> = {
  [K in keyof A]: ConverterTypes<A[K]> | null;
};

export type Trait<
  T extends HTMLElement,
  P extends object = {},
  I extends object = CustomElementStaticProps,
  O extends object = CustomElementStaticProps,
> = Mixin<T, P, I, O> &
  Readonly<{
    [Symbol.hasInstance](
      o: unknown,
    ): o is InstanceType<ReturnType<Trait<T, P, I, O>>>;
  }>;

export type TraitProps<T extends Trait<any, any, any, any>> =
  T extends Trait<any, infer P, any, any> ? Writable<P> : never;

export function trait<
  T extends HTMLElement,
  P extends Readonly<Record<string, Converter>>,
>(props: P): Trait<T, Accessors<P>> {
  const set = new WeakSet();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  return Object.defineProperty(
    (ctr: Constructor<T> & CustomElementStaticProps) => {
      set.add(ctr);

      const attributeEntries = Object.entries(
        props as Record<string, Converter>,
      );

      if (attributeEntries.length === 0) {
        return ctr;
      }

      const newObservedAttributes = attributeEntries.map(([name]) => name);

      ctr.observedAttributes = ctr.observedAttributes
        ? [...ctr.observedAttributes, ...newObservedAttributes]
        : newObservedAttributes;

      Object.defineProperties(
        ctr.prototype,
        Object.fromEntries(
          attributeEntries.map(([attribute, converter]) => [
            attribute,
            {
              configurable: true,
              get(this: HTMLElement) {
                return ATTRIBUTE.get(this, attribute, converter);
              },
              set(this: HTMLElement, value: string | boolean | number) {
                ATTRIBUTE.set(this, attribute, value, converter);
              },
            },
          ]),
        ),
      );

      return ctr;
    },
    Symbol.hasInstance,
    {
      configurable: true,
      value(o: unknown): boolean {
        return o instanceof HTMLElement && set.has(o.constructor);
      },
    },
  ) as Trait<T, Accessors<P>>;
}

export type ConstructorWithTraits<
  T extends HTMLElement,
  TL extends ReadonlyArray<Trait<any, any, any, any>>,
> = Constructor<T & MixinProps<TL>> &
  CustomElementStaticProps &
  MixinStatics<TL>;

export function impl<
  T extends HTMLElement,
  TL extends ReadonlyArray<Trait<any, any, any, any>>,
>(
  target: Constructor<T> & CustomElementStaticProps,
  ...traits: TL
): ConstructorWithTraits<T, TL> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  return traits.reduce(
    (ctr, m) => m(ctr),
    class extends target {},
  ) as Constructor<T & MixinProps<TL>> &
    CustomElementStaticProps &
    MixinStatics<TL>;
}
