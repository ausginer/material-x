// P45: the types of core's layer (a) that `@trait` needs, as in
// packages/core/src/traits/composition.ts, with the proposed decorator.
import type { AbstractConstructor } from 'type-fest';

declare const $bound: unique symbol;

export type Bound<
  I extends object,
  S extends object = {},
> = AbstractConstructor<I> &
  S & { readonly [$bound]: (instance: I, statics: S) => void };

export function bound<I extends object, S extends object = {}>(): Bound<I, S> {
  return null as unknown as Bound<I, S>;
}

/** What `@trait` decorates: a class whose heritage is a bound. */
export type TraitClass = AbstractConstructor<object> & {
  readonly [$bound]: (instance: never, statics: never) => void;
};

/**
 * Makes the decorated class a trait. The build replaces the decorator with the
 * brand install; evaluated unbuilt, it throws.
 */
export function trait<C extends TraitClass>(
  _value: C,
  _context: ClassDecoratorContext<C>,
): void {
  throw new Error(
    '@trait runs only in a build with @ydinjs/vite-traits-plugin',
  );
}

export const AnyElement: Bound<HTMLElement> = bound();
