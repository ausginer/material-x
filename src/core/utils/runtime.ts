export function join<A extends readonly unknown[]>(
  ...fns: ReadonlyArray<(...args: A) => void>
): (...args: A) => void {
  return (...args) => fns.forEach((fn) => fn(...args));
}
