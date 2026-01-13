/* eslint-disable @typescript-eslint/no-unsafe-type-assertion */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const $param: unique symbol;

export type Param = string & { brand: typeof $param };

export const asterisk = '*' as Param;

export function attribute(name: string, value?: string | number): Param {
  return value == null
    ? (`[${name}]` as Param)
    : (`[${name}="${value}"]` as Param);
}

export function pseudoClass(name: string, value?: string): Param {
  return value == null
    ? (`:${name}` as Param)
    : (`:${name}(${value})` as Param);
}

export function pseudoElement(name: string, value?: string): Param {
  return value == null
    ? (`::${name}` as Param)
    : (`::${name}(${value})` as Param);
}

export function selector(
  name: string,
  ...params: ReadonlyArray<Param | null | undefined>
): string {
  const _params = params.filter((p) => p != null);

  if (_params.length === 0) {
    return name;
  }

  if (name === ':host') {
    return `${name}(${_params.join('')})`;
  }

  return `${name}${_params.join('')}`;
}
