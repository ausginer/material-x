/* eslint-disable @typescript-eslint/no-unsafe-type-assertion */
import type { Constructor, Simplify } from 'type-fest';
import {
  ATTRIBUTE,
  type AttributePrimitive,
  type ToConverter,
} from './attribute.ts';
import type { CustomElementStatics } from './reactive-element.ts';
import {
  type ConstructorWithTraits as AbstractConstructorWithTraits,
  impl as abstractImpl,
  trait as abstractTrait,
  type Trait as AbstractTrait,
} from './traits-abstract.ts';

type ConvertersFromAttributePrimitives<
  T extends Readonly<Record<string, AttributePrimitive>>,
> = {
  [K in keyof T]: ToConverter<T[K]>;
};

export type PropsFromAttributePrimitives<
  T extends Readonly<Record<string, AttributePrimitive>>,
> = {
  [K in keyof T]?: T[K];
};

export type FieldsFromAttributePrimitives<
  T extends Readonly<Record<string, AttributePrimitive>>,
> = {
  [K in keyof T]: T[K] | null;
};

export type Trait<
  P extends Readonly<Record<string, AttributePrimitive>>,
  B extends symbol,
> = AbstractTrait<FieldsFromAttributePrimitives<P>, B>;

export type Props<T extends Trait<any, any>> =
  T extends Trait<infer P, any> ? PropsFromAttributePrimitives<P> : never;

export type Interface<T extends Trait<any, any>> =
  T extends Trait<infer P, infer B>
    ? Simplify<FieldsFromAttributePrimitives<P> & Readonly<Record<B, true>>>
    : never;

export function trait<
  P extends Readonly<Record<string, AttributePrimitive>>,
  B extends symbol,
>(props: ConvertersFromAttributePrimitives<P>, brand: B): Trait<P, B> {
  return abstractTrait(
    Object.entries(props).reduce(
      (acc, [attribute, converter]) =>
        Object.defineProperties(
          acc,
          Object.getOwnPropertyDescriptors({
            // @ts-expect-error: https://github.com/microsoft/TypeScript/issues/52923
            get [attribute](this: HTMLElement) {
              return ATTRIBUTE.get(this, attribute as string, converter);
            },
            // @ts-expect-error: https://github.com/microsoft/TypeScript/issues/52923
            set [attribute](this: HTMLElement, value: string | null) {
              ATTRIBUTE.set(this, attribute as string, value, converter);
            },
          }),
        ),
      {},
    ),
    brand,
  );
}

export type ConstructorWithTraits<
  T extends HTMLElement,
  TL extends ReadonlyArray<Trait<any, any>>,
> = AbstractConstructorWithTraits<T, CustomElementStatics, TL>;

export type Traits<T extends ConstructorWithTraits<any, any>> =
  T extends ConstructorWithTraits<any, infer TL> ? TL : never;

export const impl: <
  T extends HTMLElement,
  TL extends ReadonlyArray<Trait<any, any>>,
>(
  target: Constructor<T> & CustomElementStatics,
  traits: TL,
) => ConstructorWithTraits<T, TL> = abstractImpl;
