// oxlint-disable typescript/no-unsafe-type-assertion
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

const PARAMS_APPENDING_TO_HOST = [':has'] as const;

export function selector(
  name: string,
  ...params: ReadonlyArray<Param | null | undefined>
): string {
  let _params = params.filter((p) => p != null);

  if (_params.length === 0) {
    return name;
  }

  if (name === ':host') {
    const appendingParams = _params.filter((p) =>
      PARAMS_APPENDING_TO_HOST.some((a) => p.startsWith(a)),
    );

    if (appendingParams.length > 0) {
      _params = _params.filter((p) => !appendingParams.includes(p));

      let hostArgs = '';

      if (_params.length > 0) {
        hostArgs = `(${_params.join('')})`;
      }

      return `${name}${hostArgs}${appendingParams.join('')}`;
    }

    return `${name}(${_params.join('')})`;
  }

  return `${name}${_params.join('')}`;
}
