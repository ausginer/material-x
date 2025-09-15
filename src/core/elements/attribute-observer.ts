import type { ReactiveController } from './reactive-controller.ts';

export type UpdateCallback<T extends string> = (
  oldValue: T | null,
  newValue: T | null,
) => void;

export default class AttributeObserver<T extends string>
  implements ReactiveController
{
  readonly #callbacks: Readonly<Record<string, UpdateCallback<string>>>;

  constructor(callbacks: Readonly<Record<string, UpdateCallback<string>>>) {
    this.#callbacks = callbacks;
  }

  attrChanged(name: string, oldValue: T | null, newValue: T | null): void {
    if (name in this.#callbacks && oldValue !== newValue) {
      this.#callbacks[name]?.(oldValue, newValue);
    }
  }
}
