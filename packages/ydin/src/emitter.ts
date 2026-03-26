import { forEachMaybePromise } from './utils/runtime.ts';

export type UpdateCallback<T extends readonly unknown[]> = (
  ...data: T
) => void | Promise<void>;
export type Unsubscribe = () => void;

export class EventEmitter<T extends readonly unknown[]> {
  readonly #dependencies = new Set<UpdateCallback<T>>();

  on(callback: UpdateCallback<T>): Unsubscribe {
    this.#dependencies.add(callback);
    return () => this.#dependencies.delete(callback);
  }

  emit(...data: T): void {
    // oxlint-disable-next-line typescript/promise-function-async
    forEachMaybePromise(this.#dependencies.values(), (subscriber) =>
      subscriber(...data),
    );
  }
}
