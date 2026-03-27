export function join<A extends readonly unknown[]>(
  ...fns: ReadonlyArray<(...args: A) => void>
): (...args: A) => void {
  return (...args) => fns.forEach((fn) => fn(...args));
}

export function when<A extends readonly unknown[], R>(
  condition: (...args: A) => boolean,
  andThen: (...args: A) => R,
  orElse?: (...args: A) => R,
): (...args: A) => R | undefined {
  return (...args) =>
    condition(...args) ? andThen(...args) : orElse?.(...args);
}

export type Predicate<T extends readonly unknown[]> = (...args: T) => boolean;

export function not<T extends readonly unknown[]>(
  predicate: Predicate<T>,
): Predicate<T> {
  return (...args) => !predicate(...args);
}

export type ForEachMaybePromiseCallback<T> = (
  item: T,
  // oxlint-disable-next-line typescript/no-invalid-void-type
) => void | null | undefined | Promise<void | null | undefined>;

export type ForEachMaybePromiseErrorHandler = (error: unknown) => void;

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
