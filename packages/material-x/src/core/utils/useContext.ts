import type { ConverterOf } from '@ydinjs/core/attribute.js';
import {
  useContext as _useContext,
  type Context,
} from '@ydinjs/core/controllers/useContext.js';
import type { ControlledElement } from '@ydinjs/core/element.js';
import { effect, type Signal } from '@ydinjs/signals';

/** The names of a provider's own attributes, apart from the base element's. */
export type AttributeName<T extends ControlledElement> = Exclude<
  keyof T & string,
  keyof ControlledElement
>;

/**
 * The provider's forwarded attributes: one signal per attribute, holding its
 * serialized value.
 */
export type ContextData<T extends ControlledElement> = Readonly<{
  attributes: Readonly<Record<AttributeName<T>, Signal<string | null>>>;
}>;

export type ContextEffect<
  T extends ControlledElement,
  A extends AttributeName<T>,
> = (attr: A, oldValue: T[A], newValue: T[A]) => void;

/**
 * Follows the provider's forwarded attributes while the host is connected to
 * a provider. On join, `effect` runs for each attribute with `oldValue`
 * converted from `null`. Then it runs for each attribute that changed, with the
 * value the previous run saw as `oldValue`.
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

  _useContext(host, ctx, parents, (data) => {
    if (data) {
      const previous: Array<string | null> = [];

      // One effect per connection. Each run reads every forwarded attribute,
      // so it is subscribed to all of them.
      const sources: ReadonlyArray<Signal<string | null>> = names.map(
        (name) => data.attributes[name],
      );

      return effect(sources, (...values) => {
        const joining = previous.length === 0;

        names.forEach((name, index) => {
          const value = values[index]!();
          const oldValue = joining ? null : previous[index]!;

          if (joining || value !== oldValue) {
            const { from } = attributes[name];
            callback(name, from(oldValue), from(value));
          }

          previous[index] = value;
        });
      });
    }

    return undefined;
  });
}
