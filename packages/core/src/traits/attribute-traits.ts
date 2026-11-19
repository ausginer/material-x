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
 * Declares a trait's attributes, from the trait class's static block:
 * `static { trait(this); attributes(this, { disabled: Bool }); }`, with each
 * attribute declared as `accessor disabled!: boolean`. The trait's build
 * turns each `accessor` line into a getter and a setter that read and write the
 * attribute through the table's converter, and adds the table's keys to a
 * static `observedAttributes`. The table is an object literal, or a module
 * `const` bound to one.
 *
 * @param _trait - The trait class.
 * @param _table - The converter of each attribute member.
 */
export function attributes<T extends object>(
  _trait: AbstractConstructor<T>,
  _table: NoInfer<AttributeTable<T>>,
): void {}

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
