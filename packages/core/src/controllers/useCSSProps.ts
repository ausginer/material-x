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
 * @typeParam T - Mapping from consumer-facing keys to CSS prop descriptions.
 * @param host - Element whose computed CSS variables should be read.
 * @param props - Mapping from output keys to CSS prop descriptions.
 * @param target - Element passed to each parse callback.
 * @returns Readonly object containing parsed values under the same keys.
 */
export function useCSSProps<
  const T extends Readonly<Record<PropertyKey, CSSPropDescription<any>>>,
>(
  host: ControlledElement,
  props: T,
  target: HTMLElement = host,
): () => CSSPropsResult<T> {
  let result: CSSPropsResult<T>;

  useConnected(host, () => {
    const styles = getComputedStyle(host);

    result = Object.fromEntries(
      Object.entries(props).map(([key, [name, parse]]) => {
        const value = styles.getPropertyValue(name).trim();
        return [key, parse(value, target, name)];
      }),
    ) as CSSPropsResult<T>;
  });

  return () => result;
}
