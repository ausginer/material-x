// Layer (b): the ydin application of layer (a). It knows elements and
// attributes; layer (a), piirre.ts, knows neither.
import type { AbstractConstructor } from 'type-fest';
import type {
  AttributePrimitive,
  ConverterOf,
} from '../../../../../packages/core/src/attribute.ts';
import type { ControlledElement } from '../../../../../packages/core/src/element.ts';
import { bound, type Bound } from './piirre.ts';

/** Any element: what an attribute trait requires of its base. */
export const AnyElement: Bound<HTMLElement> = bound();

/** A ControlledElement: for a trait whose members need ydin's element. */
export const Controlled: Bound<ControlledElement> = bound();

/** A trait's attribute members: not a method, and not an HTMLElement member. */
type AttributeKeys<T> = {
  [K in keyof T]-?: K extends keyof HTMLElement
    ? never
    : T[K] extends (...args: never[]) => unknown
      ? never
      : K;
}[keyof T];

/** The converter for a member of type M: it reads exactly M. */
export type ConverterFor<M> = ConverterOf<
  NonNullable<M> & AttributePrimitive
> & {
  readonly from: (value: string | null) => M;
};

/**
 * One converter per attribute member, checked against the member. A class with
 * no attribute member accepts no entry: an empty mapped type would accept any.
 */
export type AttributeTable<T> = [AttributeKeys<T>] extends [never]
  ? Readonly<Record<string, never>>
  : { readonly [K in AttributeKeys<T>]?: ConverterFor<T[K]> };

/**
 * Declares a trait's attributes, from its static block. It does nothing at
 * runtime: the flattener reads the table literal, in source or in built
 * JavaScript, and emits the accessors and `observedAttributes`.
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
 * Framework props: a trait's attribute members, optional. For a tuple of
 * traits, the props of each.
 */
export type Props<T> = T extends readonly unknown[]
  ? PropsOfList<T>
  : T extends AbstractConstructor<infer I>
    ? { [K in AttributeKeys<I>]?: I[K] }
    : never;
