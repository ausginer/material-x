import attribute, { type ConverterOf } from 'ydin/attribute.js';
import {
  useContext as _useContext,
  type Context,
} from 'ydin/controllers/useContext.js';
import type { ControlledElement } from 'ydin/element.js';
import type { EventEmitter } from 'ydin/emitter.js';

export type ChangedAttribute = readonly [
  attr: string,
  oldValue: string | null,
  newValue: string | null,
];

export type ContextData<T extends ControlledElement> = Readonly<{
  emitter: EventEmitter<ChangedAttribute>;
  provider: T;
}>;

export type ContextEffect<
  T extends ControlledElement,
  A extends Exclude<keyof T & string, keyof ControlledElement>,
> = (attr: A, oldValue: T[A], newValue: T[A]) => void;

export function useContext<
  T extends ControlledElement,
  A extends Exclude<keyof T & string, keyof ControlledElement>,
>(
  host: ControlledElement,
  ctx: Context<ContextData<T>>,
  attributes: Readonly<Record<A, ConverterOf<any>>>,
  effect: ContextEffect<T, A>,
): void {
  _useContext(host, ctx, (data) => {
    if (data) {
      for (const [attr, { from }] of Object.entries(attributes)) {
        effect(attr, from(null), from(attribute.getRaw(data.provider, attr)));
      }

      return data.emitter.on((attr, oldValue, newValue) => {
        if (attr in attributes) {
          const { from } = attributes[attr as keyof typeof attributes];
          effect(
            attr as keyof typeof attributes,
            from(oldValue),
            from(newValue),
          );
        }
      });
    }

    return undefined;
  });
}
