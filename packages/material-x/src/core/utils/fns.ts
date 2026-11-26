import {
  type CSSPropParser,
  CSSVariableError,
} from '@ydinjs/core/controllers/useCSSProps.js';

export const identity = <T>(v: T): T => v;

/**
 * Reads a `<time>` in milliseconds. A value in seconds is scaled. lightningcss
 * prints a time of 100 ms or more in seconds and a shorter one in
 * milliseconds, so a private property can hold either.
 */
export const parseMs: CSSPropParser<number> = (v, target, prop) => {
  const result = parseFloat(v) * (v.endsWith('ms') ? 1 : 1000);

  if (isNaN(result)) {
    throw new CSSVariableError(prop, target);
  }

  return result;
};
