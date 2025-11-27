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

export function readCSSVariables<K extends PropertyKey>(
  host: HTMLElement,
  vars: Readonly<Record<K, string>>,
): Readonly<Record<K extends PropertyKey ? K : never, string>>;
export function readCSSVariables<K extends PropertyKey, V>(
  host: HTMLElement,
  vars: Readonly<Record<K, string>>,
  transform: TransformCallback<K, V>,
): Readonly<Record<K extends PropertyKey ? K : never, V>>;
export function readCSSVariables<K extends PropertyKey, V = string>(
  host: HTMLElement,
  vars: Readonly<Record<K, string>>,
  transform?: TransformCallback<K, V>,
): Readonly<Record<K extends PropertyKey ? K : never, V | string>> {
  const styles = getComputedStyle(host);

  return (Object as TypedObjectConstructor).fromEntries(
    (Object as TypedObjectConstructor).entries(vars).map(([name, variable]) => {
      const value = styles.getPropertyValue(`--${variable}`).trim();
      const result = (transform ?? defaultTransformer)(name, value, host);
      return [name, result];
    }),
  );
}
