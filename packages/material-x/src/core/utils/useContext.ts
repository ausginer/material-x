import type { ConverterOf } from '@ydinjs/core/attribute.js';
import {
  useContext as _useContext,
  type Context,
  type Unsubscribe,
} from '@ydinjs/core/controllers/useContext.js';
import type { ControlledElement } from '@ydinjs/core/element.js';

/** The names of a provider's own attributes, apart from the base element's. */
export type AttributeName<T extends ControlledElement> = Exclude<
  keyof T & string,
  keyof ControlledElement
>;

/** Receives a forwarded attribute's serialized values. */
export type AttributeCallback<A extends string> = (
  attr: A,
  oldValue: string | null,
  newValue: string | null,
) => void;

/**
 * Calls `callback` for each of the named attributes once, with `oldValue`
 * `null`, and then for each one that changes, until the returned function is
 * called.
 */
export type AttributeWatcher<T extends ControlledElement> = <
  A extends AttributeName<T>,
>(
  names: readonly A[],
  callback: AttributeCallback<A>,
) => Unsubscribe;

/**
 * The provider's forwarded attributes. The provider keeps their state, so a
 * consumer only names the attributes it follows.
 */
export type ContextData<T extends ControlledElement> = Readonly<{
  watch: AttributeWatcher<T>;
}>;

export type ContextEffect<
  T extends ControlledElement,
  A extends AttributeName<T>,
> = (attr: A, oldValue: T[A], newValue: T[A]) => void;

/**
 * Follows the provider's forwarded attributes while the host is connected to
 * a provider. On join, `callback` runs for each attribute with `oldValue`
 * converted from `null`. Then it runs for each attribute that changed.
 */
export function useContext<
  T extends ControlledElement,
  A extends AttributeName<T>,
>(
  host: ControlledElement,
  ctx: Context<ContextData<T>>,
  parents: readonly string[],
  attributes: Readonly<Record<A, ConverterOf<any>>>,
  callback: ContextEffect<T, A>,
): void {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const names = Object.keys(attributes) as A[];

  _useContext(host, ctx, parents, (data) =>
    data?.watch(names, (attr, oldValue, newValue) => {
      const { from } = attributes[attr];
      callback(attr, from(oldValue), from(newValue));
    }),
  );
}
