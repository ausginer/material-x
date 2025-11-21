import type { Attribute, NullablePrimitive } from '../elements/attribute.ts';
import type { ReactiveController } from '../elements/reactive-controller.ts';
import { use, type ReactiveElement } from '../elements/reactive-element.ts';

export type UpdateCallback<T extends string | number | boolean> = (
  oldValue: NullablePrimitive<T>,
  newValue: NullablePrimitive<T>,
) => void;

class AttributeController<T extends string | number | boolean>
  implements ReactiveController
{
  readonly #attribute: Attribute<T>;
  readonly #update: UpdateCallback<T>;

  constructor(attribute: Attribute<T>, update: UpdateCallback<T>) {
    this.#attribute = attribute;
    this.#update = update;
  }

  attrChanged(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (name === this.#attribute.name && oldValue !== newValue) {
      this.#update(
        this.#attribute.from(oldValue),
        this.#attribute.from(newValue),
      );
    }
  }
}

export function useAttribute<T extends string | boolean | number>(
  attribute: Attribute<T, ReactiveElement>,
  update: UpdateCallback<T>,
): void {
  use(attribute.host, new AttributeController(attribute, update));
}
