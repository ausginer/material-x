// P46: the proposed `@attributes(TABLE)` decorator's type. The converter types
// are copied from packages/core/src/attribute.ts, `AttributeKeys`,
// `ConverterFor` and `AttributeTable` from
// packages/core/src/traits/attribute-traits.ts, unchanged. `attributes` and
// `AttributesDecorator` are the proposal.
import type { AbstractConstructor } from 'type-fest';

export type AttributePrimitive = boolean | number | string;
type NullablePrimitive<T extends AttributePrimitive> = T extends boolean
  ? T
  : T | null;
type WritablePrimitive<T extends AttributePrimitive> = T extends boolean
  ? T
  : T | null | undefined;
export interface ConverterOf<T extends AttributePrimitive> {
  readonly from: (value: string | null) => NullablePrimitive<T>;
  readonly to: (value: WritablePrimitive<T>) => string | null;
}
export declare const Bool: ConverterOf<boolean>;
export declare const Num: ConverterOf<number>;
export declare const Str: ConverterOf<string>;

type AttributeKeys<T> = {
  [K in keyof T]-?: K extends keyof HTMLElement
    ? never
    : T[K] extends (...args: never[]) => unknown
      ? never
      : K;
}[keyof T];

export type ConverterFor<M> = ConverterOf<
  NonNullable<M> & AttributePrimitive
> & {
  readonly from: (value: string | null) => M;
};

export type AttributeTable<T> = [AttributeKeys<T>] extends [never]
  ? Readonly<Record<string, never>>
  : { readonly [K in AttributeKeys<T>]?: ConverterFor<T[K]> };

/**
 * Whether `Table` is an attribute table of instances `I`: every key names an
 * attribute member, and every converter reads exactly that member's type.
 */
type Fits<Table, I> = [Exclude<keyof Table, AttributeKeys<I>>] extends [never]
  ? [Table] extends [AttributeTable<I>]
    ? true
    : false
  : false;

/** What a table that doesn't fit the class turns the decorated class into. */
declare const tableDoesNotFit: unique symbol;
type TableDoesNotFit<Table> = { readonly [tableDoesNotFit]: Table };

/**
 * The decorator that `attributes(TABLE)` returns. It infers the class from the
 * decorator context, and accepts the class only when the table fits it.
 */
export type AttributesDecorator<Table> = <
  C extends AbstractConstructor<object>,
>(
  value: Fits<Table, InstanceType<C>> extends true ? C : TableDoesNotFit<Table>,
  context: ClassDecoratorContext<C>,
) => void;

/** Declares a trait's attributes. The build compiles it; unbuilt, it throws. */
export function attributes<const Table extends object>(
  _table: Table,
): AttributesDecorator<Table> {
  throw new Error(
    '@attributes runs only in a build with @ydinjs/vite-traits-plugin',
  );
}
