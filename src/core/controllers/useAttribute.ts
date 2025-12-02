import type { Attribute, NullablePrimitive } from '../elements/attribute.ts';
import { use, type ReactiveElement } from '../elements/reactive-element.ts';

export type UpdateCallback<T extends string | number | boolean> = (
  oldValue: NullablePrimitive<T>,
  newValue: NullablePrimitive<T>,
) => void;

export function useAttribute<T extends string | boolean | number>(
  attribute: Attribute<T, ReactiveElement>,
  update: UpdateCallback<T>,
): void {
  use(attribute.host, {
    attrChanged(name, oldValue, newValue) {
      if (name === attribute.name && oldValue !== newValue) {
        update(attribute.from(oldValue), attribute.from(newValue));
      }
    },
  });
}
