import { attribute, AttributeManager, convert } from './attribute-manager.ts';
import type { ReactiveController } from './reactive-controller.ts';
import { ReactiveElement, use } from './reactive-element.ts';

export type NullablePrimitive<
  T extends StringConstructor | NumberConstructor | BooleanConstructor,
> = T extends BooleanConstructor ? ReturnType<T> : ReturnType<T> | null;

export type UpdateCallback<
  T extends StringConstructor | NumberConstructor | BooleanConstructor,
> = (oldValue: NullablePrimitive<T>, newValue: NullablePrimitive<T>) => void;

export class AttributeObserver<
    T extends StringConstructor | NumberConstructor | BooleanConstructor,
  >
  extends AttributeManager<T>
  implements ReactiveController
{
  readonly #callbacks: Array<UpdateCallback<T>> = [];

  attrChanged(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (name === attribute(this) && oldValue !== newValue) {
      for (const cb of this.#callbacks) {
        cb(convert(this, oldValue), convert(this, newValue));
      }
    }
  }

  on(callback: UpdateCallback<T>): void {
    this.#callbacks.push(callback);
  }
}

export function useAttribute<
  T extends StringConstructor | NumberConstructor | BooleanConstructor,
>(element: ReactiveElement, attribute: string, type: T): AttributeObserver<T> {
  const controller = new AttributeObserver(element, attribute, type);
  use(element, controller);
  return controller;
}
