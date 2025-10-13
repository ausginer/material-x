/* eslint-disable @typescript-eslint/no-unsafe-type-assertion */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const $param: unique symbol;

export type Param = string & { brand: typeof $param };

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

export function pseudoElement(name: string): Param {
  return `::${name}` as Param;
}

export function selector(name: string, ...params: readonly Param[]): string {
  if (params.length === 0) {
    return name;
  }

  if (name === ':host') {
    return `${name}(${params.join('')})`;
  }

  return `${name}${params.join('')}`;
}
