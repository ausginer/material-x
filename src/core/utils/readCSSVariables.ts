import type { TypedObjectConstructor } from '../../interfaces.ts';
import CSSVariableError from './CSSVariableError.ts';

export type TransformCallback<N extends PropertyKey, V> = (
  name: N,
  value: string,
  host: HTMLElement,
) => V;

export function transformNumericVariable(
  name: PropertyKey,
  value: string,
  host: HTMLElement,
): number {
  let result = parseFloat(value);

  if (value.endsWith('ms')) {
    result = result / 1000;
  }

  if (isNaN(result)) {
    throw new CSSVariableError(String(name), host);
  }

  return result;
}

const defaultTransformer: TransformCallback<any, string> = (_, value) => value;

export function readCSSVariables<
  V extends Readonly<Record<PropertyKey, string>>,
>(host: HTMLElement, vars: V): Readonly<{ [K in keyof V]: string }>;
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

  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  return (Object as TypedObjectConstructor).fromEntries(
    (Object as TypedObjectConstructor).entries(vars).map(([name, variable]) => {
      const value = styles.getPropertyValue(variable).trim();
      const result = (transform ?? defaultTransformer)(name, value, host);
      return [name, result];
    }),
  ) as Readonly<{ [K in keyof V]: T }>;
}
