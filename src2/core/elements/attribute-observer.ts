import type { ReactiveController } from './reactive-controller.ts';

export type UpdateCallback<T extends string> = (
  oldValue: T | null,
  newValue: T | null,
) => void;

export default class AttributeObserver<T extends string>
  implements ReactiveController
{
  readonly #attribute: string;
  readonly #callback: UpdateCallback<T>;

  constructor(attribute: string, callback: UpdateCallback<T>) {
    this.#attribute = attribute;
    this.#callback = callback;
  }

  attrChanged(name: string, oldValue: T | null, newValue: T | null): void {
    if (name === this.#attribute && oldValue !== newValue) {
      this.#callback(oldValue, newValue);
    }
  }
}
