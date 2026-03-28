/**
 * Joins multiple callbacks into a single function that calls them in order.
 *
 * @typeParam A - Argument list forwarded to each callback.
 * @param fns - Callbacks that should be invoked sequentially.
 * @returns Combined callback that forwards the same arguments to all inputs.
 */
export function join<A extends readonly unknown[]>(
  ...fns: ReadonlyArray<(...args: A) => void>
): (...args: A) => void {
  return (...args) => fns.forEach((fn) => fn(...args));
}

/**
 * Branches a callback by predicate.
 *
 * @typeParam A - Argument list passed to the predicate and branch callbacks.
 * @typeParam R - Return type of the branch callbacks.
 * @param condition - Predicate deciding which branch should run.
 * @param andThen - Callback used when the predicate returns `true`.
 * @param orElse - Optional callback used when the predicate returns `false`.
 * @returns Branching callback that forwards the original arguments.
 */
export function when<A extends readonly unknown[], R>(
  condition: (...args: A) => boolean,
  andThen: (...args: A) => R,
  orElse?: (...args: A) => R,
): (...args: A) => R | undefined {
  return (...args) =>
    condition(...args) ? andThen(...args) : orElse?.(...args);
}

/**
 * Boolean predicate over a variadic argument list.
 *
 * @typeParam T - Argument list accepted by the predicate.
 */
export type Predicate<T extends readonly unknown[]> = (...args: T) => boolean;

/**
 * Inverts a predicate result.
 *
 * @typeParam T - Argument list accepted by the predicate.
 * @param predicate - Predicate whose result should be negated.
 * @returns Predicate that returns the opposite boolean result.
 */
export function not<T extends readonly unknown[]>(
  predicate: Predicate<T>,
): Predicate<T> {
  return (...args) => !predicate(...args);
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
