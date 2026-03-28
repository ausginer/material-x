import CSSVariableError from './CSSVariableError.ts';

/**
 * Transforms a raw computed CSS variable value into a consumer-facing value.
 *
 * @typeParam N - Variable-map key associated with the current CSS variable.
 * @typeParam V - Result type returned by the transform callback.
 * @param name - Key from the requested variable map.
 * @param value - Trimmed computed CSS variable value.
 * @param host - Element whose computed styles are being read.
 */
export type TransformCallback<N extends PropertyKey, V> = (
  name: N,
  value: string,
  host: HTMLElement,
) => V;

const NUMBER_RE = /^[+-]?(?:\d+|\d*\.\d+)(?:px|s)?$/u;
const MILLISECONDS_RE = /^[+-]?(?:\d+|\d*\.\d+)ms$/u;

/**
 * Parses a numeric CSS variable value.
 *
 * Supported values include plain numbers, `px`, `s`, and `ms`. Second values
 * are returned as-is, while millisecond values are converted to seconds so
 * they can be passed directly to Web Animations timing APIs. Minified decimal
 * forms such as `.5` are supported.
 *
 * @param name - Variable name used for error reporting.
 * @param value - Trimmed CSS variable value to parse.
 * @param host - Element whose CSS variable produced the value.
 * @returns Parsed numeric value.
 * @throws {CSSVariableError} When the value is not a supported numeric CSS
 *   form.
 */
export function transformNumericVariable(
  name: PropertyKey,
  value: string,
  host: HTMLElement,
): number {
  const normalized = value.trim();

  if (MILLISECONDS_RE.test(normalized)) {
    return parseFloat(normalized) / 1000;
  }

  if (NUMBER_RE.test(normalized)) {
    return parseFloat(normalized);
  }

  throw new CSSVariableError(String(name), host);
}

const defaultTransformer: TransformCallback<any, string> = (_, value) => value;

/**
 * Reads computed CSS variable values from a host element.
 *
 * The requested CSS variables are resolved through `getComputedStyle(...)`,
 * trimmed, and optionally transformed into another shape before being returned
 * under the same object keys.
 *
 * @typeParam V - Mapping from consumer-facing keys to CSS variable names.
 * @param host - Element whose computed CSS variables should be read.
 * @param vars - Mapping from output keys to CSS variable names.
 * @returns Readonly object containing the resolved string values.
 */
export function readCSSVariables<
  V extends Readonly<Record<PropertyKey, string>>,
>(host: HTMLElement, vars: V): Readonly<{ [K in keyof V]: string }>;
/**
 * Reads computed CSS variable values from a host element and transforms them.
 *
 * @typeParam V - Mapping from consumer-facing keys to CSS variable names.
 * @typeParam T - Result type returned by the transform callback.
 * @param host - Element whose computed CSS variables should be read.
 * @param vars - Mapping from output keys to CSS variable names.
 * @param transform - Callback that transforms each trimmed CSS variable value.
 * @returns Readonly object containing transformed values under the same keys.
 */
export function readCSSVariables<
  V extends Readonly<Record<PropertyKey, string>>,
  T,
>(
  host: HTMLElement,
  vars: V,
  transform: TransformCallback<keyof V, T>,
): Readonly<{ [K in keyof V]: T }>;
export function readCSSVariables<
  V extends Readonly<Record<PropertyKey, string>>,
  T = string,
>(
  host: HTMLElement,
  vars: V,
  transform?: TransformCallback<keyof V, T>,
): Readonly<{ [K in keyof V]: T }> {
  const styles = getComputedStyle(host);

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return Object.fromEntries(
    Object.entries(vars).map(([name, variable]) => {
      const value = styles.getPropertyValue(variable).trim();
      const result = (transform ?? defaultTransformer)(name, value, host);
      return [name, result];
    }),
  ) as Readonly<{ [K in keyof V]: T }>;
}
