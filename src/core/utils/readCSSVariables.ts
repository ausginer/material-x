import { type TypedObjectConstructor } from '../../interfaces.ts';
import CSSVariableError from './CSSVariableError.ts';

export type TransformCallback<V> = (
  name: PropertyKey,
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

export function readCSSVariables<K extends PropertyKey, V>(
  host: HTMLElement,
  vars: Readonly<Record<K, string>>,
  transform: TransformCallback<V>,
): Readonly<Record<K extends PropertyKey ? K : never, V>> {
  const styles = getComputedStyle(host);

  return (Object as TypedObjectConstructor).fromEntries(
    (Object as TypedObjectConstructor).entries(vars).map(([name, variable]) => {
      const value = styles.getPropertyValue(`--_${variable}`).trim();
      const result = transform(name, value, host);
      return [name, result];
    }),
  );
}
