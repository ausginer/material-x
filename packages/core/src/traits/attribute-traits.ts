// oxlint-disable typescript/no-empty-object-type
import type { AbstractConstructor } from 'type-fest';
import type { AttributePrimitive, ConverterOf } from '../attribute.ts';
import type { ControlledElement } from '../element.ts';
import { bound, type Bound } from './composition.ts';

/** The bound of a trait whose members need only an element's attributes. */
export const AnyElement: Bound<HTMLElement> = bound();

/** The bound of a trait whose members need a {@link ControlledElement}. */
export const Controlled: Bound<ControlledElement> = bound();

/** A trait's attribute members: neither a method nor an `HTMLElement` member. */
type AttributeKeys<T> = {
  [K in keyof T]-?: K extends keyof HTMLElement
    ? never
    : T[K] extends (...args: never[]) => unknown
      ? never
      : K;
}[keyof T];

/**
 * The converter of an attribute member of type `M`: it reads exactly `M`.
 *
 * @typeParam M - The member's type.
 */
export type ConverterFor<M> = ConverterOf<
  NonNullable<M> & AttributePrimitive
> & {
  readonly from: (value: string | null) => M;
};

/**
 * A trait's attribute table: one optional converter per attribute member,
 * checked against the member's type. A class with no attribute member accepts
 * no entry.
 *
 * @typeParam T - The trait's instance type.
 */
export type AttributeTable<T> = [AttributeKeys<T>] extends [never]
  ? Readonly<Record<string, never>>
  : { readonly [K in AttributeKeys<T>]?: ConverterFor<T[K]> };

/**
 * Whether `Table` fits instances `I`: every key names an attribute member, and
 * every converter reads exactly that member's type.
 */
type Fits<Table, I> = [Exclude<keyof Table, AttributeKeys<I>>] extends [never]
  ? [Table] extends [AttributeTable<I>]
    ? true
    : false
  : false;

declare const tableDoesNotFit: unique symbol;

/** The parameter type that a table that doesn't fit the class gives. */
type TableDoesNotFit<Table> = { readonly [tableDoesNotFit]: Table };

/**
 * The class decorator that `attributes(TABLE)` returns. It accepts the class
 * only when the table fits the class's instances.
 *
 * @typeParam Table - The attribute table.
 */
export type AttributesDecorator<Table> = <
  C extends AbstractConstructor<object>,
>(
  value: Fits<Table, InstanceType<C>> extends true ? C : TableDoesNotFit<Table>,
  context: ClassDecoratorContext<C>,
) => void;

/**
 * Declares a trait's attributes, written `@attributes(TABLE)` below `@trait`:
 * `@trait @attributes({ disabled: Bool }) class Disableable`, with each
 * attribute declared as `accessor disabled!: boolean`. The trait's build
 * turns each `accessor` line into a getter and a setter that read and write
 * the attribute through the table's converter, and adds the table's keys to a
 * static `observedAttributes`. The table is an object literal, or a module
 * `const` bound to one, and every converter reads exactly its member's type.
 *
 * @param _table - The converter of each attribute member.
 * @throws {Error} Always: a trait module runs only once the build has
 *   replaced the decorator.
 */
export function attributes<const Table extends object>(
  _table: Table,
): AttributesDecorator<Table> {
  throw new Error(
    '@attributes is compiled by @ydinjs/vite-traits-plugin; build the trait module',
  );
}

type PropsOfList<T extends readonly unknown[]> = T extends readonly [
  infer H,
  ...infer R,
]
  ? Props<H> & PropsOfList<R>
  : {};

/**
 * Framework props of a trait class, or of a tuple of trait classes: each
 * attribute member, optional.
 *
 * @typeParam T - A trait class's type, or a tuple of them.
 */
export type Props<T> = T extends readonly unknown[]
  ? PropsOfList<T>
  : T extends AbstractConstructor<infer I>
    ? { [K in AttributeKeys<I>]?: I[K] }
    : never;
