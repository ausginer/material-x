import {
  forEachMaybePromise,
  type ForEachMaybePromiseErrorHandler,
} from './utils/runtime.ts';

/**
 * Subscriber callback invoked for each emitted update.
 *
 * The callback receives exactly the same argument list that was passed to
 * `emit(...)`.
 *
 * @typeParam T - The emitted argument list.
 */
export type UpdateCallback<T extends readonly unknown[]> = (
  ...data: T
) => void | Promise<void>;

/**
 * Cleanup function returned when subscribing to an `EventEmitter`.
 */
export type Unsubscribe = () => void;

/**
 * Error handler used for subscriber sync throws and async rejections.
 */
export type ErrorHandler = ForEachMaybePromiseErrorHandler;

/**
 * Minimal typed pub/sub primitive for variadic updates.
 *
 * Subscribers are deduplicated by reference through an internal `Set`.
 *
 * @remarks Dispatch iterates the live subscriber `Set`. A subscriber added
 * during `emit(...)` may receive that same in-flight update. By default,
 * subscriber errors follow `forEachMaybePromise` behavior and are rethrown.
 * After registering `err(...)`, both sync throws and async rejections are
 * routed through the installed error handler instead. If the error handler
 * throws, dispatch is interrupted by that error.
 *
 * @typeParam T - The argument list delivered to subscribers.
 */
export class EventEmitter<T extends readonly unknown[]> {
  readonly #dependencies = new Set<UpdateCallback<T>>();
  #handler?: ErrorHandler;

  /**
   * Registers a subscriber for future updates.
   *
   * @param callback - The subscriber to invoke on each `emit(...)`.
   * @returns Cleanup - that unsubscribes the callback by reference.
   */
  on(callback: UpdateCallback<T>): Unsubscribe {
    this.#dependencies.add(callback);
    return () => this.#dependencies.delete(callback);
  }

  /**
   * Installs an error handler for subscriber failures during dispatch.
   *
   * @param handler - Error handler for subscriber sync throws and async
   *   rejections.
   */
  err(handler: ErrorHandler): void {
    this.#handler = handler;
  }

  /**
   * Dispatches an update to all currently registered subscribers.
   *
   * Each subscriber receives the same argument list that was passed to this
   * method.
   *
   * @param data - The argument list delivered to each subscriber.
   */
  emit(...data: T): void {
    forEachMaybePromise(
      this.#dependencies.values(),
      // oxlint-disable-next-line typescript/promise-function-async
      (subscriber) => subscriber(...data),
      this.#handler,
    );
  }
}
