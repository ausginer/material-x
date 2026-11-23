import type { ControlledElement } from '../element.ts';
import { useConnected } from './useConnected.ts';

/**
 * Error thrown when a CSS variable cannot be parsed as the expected shape.
 */
export class CSSVariableError extends Error {
  override readonly name: string = this.constructor.name;

  /**
   * Creates a parse error for a CSS variable on a specific element.
   *
   * @param cssVar - Variable name or key used for reporting.
   * @param element - Element whose computed variable value was invalid.
   */
  constructor(cssVar: string, element: HTMLElement) {
    super(`Invalid value for ${cssVar} on element '${element.localName}'`);
  }
}

export type CSSPropParser<T> = (
  value: string,
  target: HTMLElement,
  name: `--${string}`,
) => T;

export type CSSPropDescription<T> = readonly [
  name: `--${string}`,
  parse: CSSPropParser<T>,
];

export type CSSPropsResult<
  T extends Readonly<Record<PropertyKey, CSSPropDescription<any>>>,
> = Readonly<{
  [K in keyof T]: ReturnType<T[K][1]>;
}>;

/**
 * Reads computed CSS variable values from a host element.
 *
 * The requested CSS variables are resolved through `getComputedStyle(...)` and
 * parsed according to their per-property descriptions.
 *
 * @remarks The variables are read at the first call of the returned function in
 * a connection, and later calls return the same values until the host connects
 * again. An error that a parser throws is thrown by that call, and the next
 * call reads again.
 *
 * @typeParam T - Mapping from consumer-facing keys to CSS prop descriptions.
 * @param host - Element whose computed CSS variables should be read.
 * @param props - Mapping from output keys to CSS prop descriptions.
 * @param target - Element passed to each parse callback.
 * @returns Function that returns a readonly object containing parsed values
 *   under the same keys.
 */
export function useCSSProps<
  const T extends Readonly<Record<PropertyKey, CSSPropDescription<any>>>,
>(
  host: ControlledElement,
  props: T,
  target: HTMLElement = host,
): () => CSSPropsResult<T> {
  let result: Partial<Record<keyof T, unknown>> | null = null;

  useConnected(host, () => {
    result = null;
  });

  return () => {
    if (!result) {
      const styles = getComputedStyle(host);
      const values: Partial<Record<keyof T, unknown>> = {};

      for (const [key, [name, parse]] of Object.entries(props)) {
        values[key] = parse(styles.getPropertyValue(name).trim(), target, name);
      }

      // Assigned last, so that a read that throws isn't kept.
      result = values;
    }

    return result as CSSPropsResult<T>;
  };
}
