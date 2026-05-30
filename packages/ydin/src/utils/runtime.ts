export function identity<T>(value: T): T {
  return value;
}

/**
 * Callback that may complete synchronously or return a real `Promise`.
 *
 * @typeParam T - Item type produced by the iterated source.
 */
export type ForEachMaybePromiseCallback<T> = (
  item: T,
  // oxlint-disable-next-line typescript/no-invalid-void-type
) => void | null | undefined | Promise<void | null | undefined>;

/**
 * Error handler for synchronous throws and rejected asynchronous callbacks.
 */
export type ForEachMaybePromiseErrorHandler = (error: unknown) => void;

/**
 * Iterates an iterable and tolerates callbacks that may return real promises.
 *
 * Synchronous throws are routed through `onError`. When a callback returns a
 * real `Promise`, its rejection is forwarded through `.catch(onError)`.
 *
 * @remarks Thenable objects are outside the supported contract; only actual
 * `Promise` instances are handled asynchronously here.
 *
 * @typeParam T - Item type produced by the iterable.
 * @param iterable - Source iterable to consume.
 * @param callback - Callback invoked for each iterated item.
 * @param onError - Error handler for sync throws and promise rejections.
 */
export function forEachMaybePromise<T>(
  iterable: Iterable<T>,
  callback: ForEachMaybePromiseCallback<T>,
  onError: ForEachMaybePromiseErrorHandler = (error: unknown) => {
    throw error;
  },
): void {
  for (const item of iterable) {
    try {
      const result = callback(item);

      if (result instanceof Promise) {
        void result.catch(onError);
      }
    } catch (error: unknown) {
      onError(error);
    }
  }
}
