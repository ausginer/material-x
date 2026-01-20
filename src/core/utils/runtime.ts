export function join<A extends readonly unknown[]>(
  ...fns: ReadonlyArray<(...args: A) => void>
): (...args: A) => void {
  return (...args) => fns.forEach((fn) => fn(...args));
}

export function when<A extends readonly unknown[], R>(
  condition: (...args: A) => boolean,
  andThen: (...args: A) => R,
  orElse?: (...args: A) => R,
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
): (...args: A) => R | void {
  return (...args) =>
    condition(...args) ? andThen(...args) : orElse?.(...args);
}

export type Predicate<T extends readonly unknown[]> = (...args: T) => boolean;

export function not<T extends readonly unknown[]>(
  predicate: Predicate<T>,
): Predicate<T> {
  return (...args) => !predicate(...args);
}
